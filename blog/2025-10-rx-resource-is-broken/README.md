---
title: "Angular's Resource APIs Are Broken - Let's Fix Them!"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2025-10-31
lastModified: 2025-10-31
keywords:
  - Angular
  - Angular
  - rxResource
  - resource
  - httpResource
  - Resource API
  - Angular signals
  - RxJS
  - HttpErrorResponse
  - rxResourceFixed
language: en
header: signal.jpg
---

Angular ships with three Resource APIs for declarative async data loading: `resource()`, `rxResource()`, and `httpResource()`.
They're powerful additions to Angular's reactive toolkit, but they share a common foundation with some sharp edges.
This article examines three bugs in the shared core, supports them with source code, and shows how to fix each one.

> **Version note:** This article targets **Angular v20 docs** and references unreleased **Angular 21.0.x source** for code examples.
> The Resource APIs are **experimental** in v20.
> Source internals can change at any time.
> Always prefer the documented contract ([`ResourceRef`](https://angular.dev/api/core/ResourceRef), [`ResourceStatus`](https://angular.dev/api/core/ResourceStatus)) over internal classes.

## Why This Article Uses rxResource Examples

Before we dive into the bugs, a quick note: This article is relevant for all three Resource APIs, because they share the same foundation and most of the same bugs.
We'll use `rxResource` for our examples because it's particularly useful for existing codebases:

### You Have Existing Observable-Based Services

If you're like me, your Angular app is built on Angular's `HttpClient`, which returns Observables, uses RxJS operators for data transformation, and has an existing service layer that returns `Observable<T>`.
In my case, I generate these services from OpenAPI specifications using the [OpenAPI Generator](https://angular.schule/blog/2025-06-openapi-generator), which provides full type safety and uses Angular's HttpClient.

```typescript
// Your existing services might look like this:
@Injectable({ provideIn: 'root' })
export class BookService {

  http = inject(HttpClient);

  getBooks(search: string): Observable<Book[]> {
    return this.http.get<Book[]>(`https://api6.angular-buch.com/api/books?search=${search}`);
  }
}
```

This is exactly why `rxResource` exists.
It bridges existing Observable services to Angular's new signal-based reactivity.
The alternative would be to rewrite all generated services to return Promises or manually wrapping everything in `toSignal()`.

`rxResource` is perfect for this!
It lets you use these existing Observables directly:

```typescript
readonly booksResource = rxResource({
  params: () => ({ search: this.searchTerm() }),
  stream: ({ params }) => this.bookService.getBooks(params.search) // ← Your existing service!
});
```

### Understanding the Three Resource APIs

Angular provides three Resource APIs that accept different data sources but share the same foundation:

**`resource()`: For Promise-based data loading**
Works with `fetch()` or any function that returns Promises.
If you're already using Promises in your services, this API provides a clean interface.

**`rxResource()`: For Observable-based services**
The only Resource API that works with Observables.
It's aimed at existing codebases built on Angular's `HttpClient`.
This aligns with many existing Angular applications that use Observable-based service layers.
`rxResource()` was added in **v19** to bridge Observables into the Resource model.
For HTTP, consider `httpResource()` first.

**`httpResource()`: For direct HTTP requests**
Experimental since Angular **19.2**.
If you pass a **URL function**, it performs a GET.
If you pass a **request function**, you can specify any HTTP method and other request options.
Returns an `HttpResourceRef` which, in addition to `value/status/error/isLoading`, exposes **`headers`**, **`statusCode`**, and **`progress`** signals for HTTP-specific reactivity.

Since all three APIs share the same core foundation, they exhibit (nearly) the same bugs in state management, error handling, and reload behavior.
This article uses `rxResource()` examples because it's the most relevant for existing projects with Observable-based services.

**TL;DR: If you have existing Observable services (which is very likely), you need `rxResource()`, but you also need the fixes we're about to discuss!**

## What is rxResource?

`rxResource` is Angular's experimental API for declarative async data loading with Observables:

```typescript
const booksResource = rxResource({
  params: () => ({ search: this.searchTerm() }),
  stream: ({ params }) => this.bookService.getBooks(params.search)
});
```

```html
<!-- In template (simplified, no error handling here) -->
@if (booksResource.hasValue()) {
  @for (book of booksResource.value(); track book.isbn) {
    <article>{{ book.title }}</article>
  }
}
```

It's supposed to handle automatic loading when params change, loading state management, error handling, and manual reload capability.
Sounds great, right?
**And it IS great when it works!**

## All Three Resource APIs Share the Same Foundation

Before we dive into the bugs, it's important to understand that **all three Resource APIs conform to the same Resource contract and state model** (`value`, `status`, `error`, `isLoading`, `hasValue`).

These are factory functions that instantiate and return internal implementation classes:
- `resource()` in `@angular/core` returns `ResourceImpl` instances
- `rxResource()` in `@angular/core/rxjs-interop` delegates to `resource()` and returns the same `ResourceImpl` instances
- `httpResource()` in `@angular/common/http` returns `HttpResourceImpl` instances which extend `ResourceImpl`

The public contract is defined by the `ResourceRef<T>` and `HttpResourceRef<T>` interfaces.
The implementation classes (`ResourceImpl`, `HttpResourceImpl`) are internal details that could theoretically change at any time.
Since all these APIs are experimental, there's no guarantee that internal implementations, or even public behaviors, will remain stable between versions.
It's safer to code against the documented contract than to rely on implementation specifics.
(Which is precisely what we'll be examining in this article, so be prepared for changes in future versions.)
As a result, most state-handling behaviors are shared, but a few gotchas (especially around HTTP errors) differ for `httpResource()`.

Let me show you the source code evidence:

**`resource()` factory function instantiates `ResourceImpl`:**
```typescript
// packages/core/src/resource/resource.ts, line 65
export function resource<T, R>(options: ResourceOptions<T, R>): ResourceRef<T | undefined> {
  // ...
  return new ResourceImpl<T | undefined, R>(
    params,
    getLoader(options),
    options.defaultValue,
    // ...
  );
}
```
[View source](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L65-L81)

**`rxResource()` factory function delegates to `resource()`:**
```typescript
// packages/core/rxjs-interop/src/rx_resource.ts, line 54
export function rxResource<T, R>(opts: RxResourceOptions<T, R>): ResourceRef<T | undefined> {
  // ...
  return resource<T, R>({  // ← Calls resource(), returns ResourceImpl instance
    ...opts,
    stream: (params) => {
      // Observable → Promise wrapper
    },
  });
}
```
[View source](https://github.com/angular/angular/blob/21.0.x/packages/core/rxjs-interop/src/rx_resource.ts#L54-L106)

**`httpResource()` factory function instantiates `HttpResourceImpl`:**

The `httpResource` factory is implemented using `makeHttpResourceFn`, which instantiates `HttpResourceImpl`.
This is an internal class that extends `ResourceImpl`:

```typescript
// packages/common/http/src/resource.ts, line 237
return new HttpResourceImpl(
  injector,
  () => normalizeRequest(request, responseType),
  options?.defaultValue,
  // ...
) as HttpResourceRef<TResult>;

// packages/common/http/src/resource.ts, line 298 (internal implementation class)
class HttpResourceImpl<T>
  extends ResourceImpl<T, HttpRequest<unknown> | undefined>
  implements HttpResourceRef<T>
{
  // Adds HTTP-specific signals: headers, progress, statusCode
  // Inherits core state management from ResourceImpl
}
```
[View source (factory)](https://github.com/angular/angular/blob/21.0.x/packages/common/http/src/resource.ts#L228-L244) | [View source (class)](https://github.com/angular/angular/blob/21.0.x/packages/common/http/src/resource.ts#L297-L298)

**What This Means:**

All three APIs conform to the documented [`ResourceRef`](https://angular.dev/api/core/ResourceRef) contract and [`ResourceStatus`](https://angular.dev/api/core/ResourceStatus) semantics:
- State management (loading, resolved, error, idle, reloading)
- Parameter reactivity
- The `reload()` method
- Value/error signals

The differences between the APIs are in their input types and additional features:
- [`resource()`](https://angular.dev/api/core/resource) works with Promises. It's also the most basic and direct way to get a resource via a public API.
- [`rxResource()`](https://angular.dev/api/core/rxjs-interop/rxResource) works with Observables.
- [`httpResource()`](https://angular.dev/api/common/http/httpResource) is built for HTTP requests and adds HTTP-specific signals (headers, progress, statusCode) and HTTP-specific error handling.

This is why most of the bugs we'll discuss affect all three APIs.
They originate from the shared foundation.
However, `httpResource()` has HTTP-specific behavior that avoids one of these issues.

## The 3 Bugs We Need to Fix

These aren't showstoppers if you know about them, but they can cause serious UX problems in production.
Because the Resource APIs share a common foundation, **most of the bugs** affect `resource()`, `rxResource()`, and `httpResource()`, though `httpResource()` handles one case differently (error handling).
Let's understand what's happening and how to fix each one:

### Bug #1: Value Resets When Parameters Change (Causes Flickering & Scroll Jumping)

**Affects**: `resource()`, `rxResource()`, and `httpResource()` (all share the same foundation)

**GitHub Issue**: [#58602](https://github.com/angular/angular/issues/58602)

**What Should Happen (in my opinion):**

When you change parameters, the previous data should remain visible while new data is being fetched.
This prevents the UI from collapsing and keeps users oriented on the page.
The loading state should indicate that fresh data is being loaded, but the existing content should stay visible until the new data arrives.

**What Actually Happens**:

Imagine the previous example (`booksResource`) with a long list of books displayed on the page.
When a user changes the search parameter (e.g., from "Angular" to "TypeScript"), the following sequence occurs:
First, `value()` becomes `undefined` (making `hasValue()` return `false`).
Then your `@for` loop has no books to iterate over, so all book cards disappear.
The DOM collapses, causing the page height to shrink and the scroll position to jump.
After a short time, new books arrive from the API.
Finally, the book cards reappear, but the user is disoriented by the flickering and unexpected scroll position.

**This behavior is by design**: `loading` (params changed) clears the value, while `reloading` (manual reload) preserves it.
This is documented in the official [`ResourceStatus` semantics](https://angular.dev/api/core/ResourceStatus):

> * `loading` - The resource is currently loading a new value as a result of a change in its reactive dependencies. `value()` will be `undefined`.
> * `reloading` - The resource is currently reloading a fresh value for the same reactive dependencies. `value()` will continue to return the previously fetched value during the reloading operation.

However, whether this is the right default behavior remains debatable.
Matthieu Riegler from the Angular team [commented on the issue](https://github.com/angular/angular/issues/58602#issuecomment-2500212775) saying:

> "We discussed that topic yesterday and we see a value (pun intended) in keeping the value while reloading. [...] One of the question that arose from the discussion was, what usecase could take an advantage of setting the value to `undefined` while reloading?"

It seems that a final decision hasn't been made.
Bug or feature?
I don't know, but it's **super annoying**.

**What Would Be Ideal**:
Even if the current default behavior is kept (resetting to `undefined`), this should at least be configurable.
An optional setting like `keepValueOnReload: true` would let developers choose the behavior that fits their use case.
Some scenarios might benefit from clearing the value, but stable, non-flickering UIs are generally preferred, in my opinion.
Making this configurable would satisfy both camps without breaking existing code.

**Built-in Mitigations**:

But right now the situation is not ideal.
If you want to keep showing the previous value during a parameter change, you have several options:

**1. Provide a `defaultValue` (static fallback):**

The simplest approach is to provide a default value that shows an empty array or placeholder items during loading:

```typescript
const booksResource = rxResource({
  params: () => ({ search: this.searchTerm() }),
  stream: ({ params }) => this.bookService.getBooks(params.search),
  defaultValue: []
});
```
This can be an effective mitigation when your design uses a fixed page size.
By populating the default value with placeholder items (perhaps skeleton loaders), the page maintains consistent height and doesn't jump during transitions.
Of course, this only works if your design supports this pattern.

**2. Simple linkedSignal pattern (always keep previous value):**

You can use `linkedSignal` to automatically preserve the previous value whenever the source becomes undefined:

```typescript
const stableBooks = linkedSignal<Book[] | undefined>({
  source: () => booksResource.value(),
  computation: (source, previous) => source ?? previous?.value
});
```
This is simpler but means stale data remains visible during error states.
I recommend using `hasValue()` or `error()` guards in the template to handle those cases explicitly.

**3. Status-gated pattern (clear on error immediately):**

For better error handling, you can also keep old data only during loading while clearing it immediately on error:

```typescript
const stableBooks = linkedSignal({
  source: () => ({ v: booksResource.value(), s: booksResource.status() }),
  computation: (src, prev) => src.s === 'loading' ? prev?.v : src.v
});
```
This prevents stale data from masking error states.
`stableBooks` becomes `undefined` immediately on error, which makes error detection straightforward.

**4. Status-driven pattern with hybrid clearing (used in the final version):**

The most robust approach uses status-based tracking to provide a hybrid behavior.
This pattern clears the value on error while preserving data during loading:

```typescript
const stableBooks = linkedSignal({
  source: () => booksResource.status(),
  computation: (status, previous) => {
    if (status === 'error') return undefined;
    if (status === 'loading') return previous?.value ?? booksResource.value();
    return booksResource.value();
  }
});
```

You might have noticed that this pattern uses the advanced API of `linkedSignal`.
It uses separate `source` and `computation` properties.
This is necessary for correct dependency tracking.
We track `status()` changes in `source`, which triggers recomputation.
Signals read inside `computation` are not tracked and won't trigger updates.

The advanced API also provides `previous.value` in the computation function.
This lets us preserve stale data during loading.
Finally, we can implement hybrid clearing logic that clears on error while preserving data during loading.
It also respects `defaultValue` during initial loads.
This is the pattern used in `rxResourceFixed` (see below).



> **✅ Edit (January 2025):** Great news! The Angular team listened to community feedback and **fixed this issue** in [PR #62111](https://github.com/angular/angular/pull/62111), merged into Angular 21.0.x.
> The fix introduces an `isErrorLike()` check that recognizes objects implementing the `Error` interface (like `HttpErrorResponse`), not just classes that inherit from `Error`.
> `HttpErrorResponse` now passes through unwrapped, making error handling consistent across all Resource APIs.
> Thank you, Matthieu Riegler and the Angular team! 🎉
>
> The section below is kept for historical context and for developers on older Angular versions.

### ~~Bug #2: HttpErrorResponse Gets Wrapped in ResourceWrappedError (resource/rxResource)~~

**Affects**: `resource()` and `rxResource()`. `httpResource()` is typically not affected.

**GitHub Issue**: [#61861](https://github.com/angular/angular/issues/61861)

**Regression**: Introduced in [PR #61441](https://github.com/angular/angular/pull/61441) ([Commit 9045e22](https://github.com/angular/angular/commit/9045e229c2899ee910ff6ce41fa822f2af5f88bf))

**Fix**: [PR #62111](https://github.com/angular/angular/pull/62111) (merged December 2025, available in Angular 21.0.x)

**What Should Happen**:

When an HTTP error occurs, you want to check the error and display appropriate messages to your users.
The error details should be directly accessible so you can show helpful information like status codes or error messages.

**What Actually Happens**:

Let's look at a simpler example that focuses on the error handling issue.
Unlike Bug #1 (which focuses on lists disappearing), this bug affects any HTTP request when an error occurs.
Here we're fetching a single book to keep the example focused:

```typescript
readonly bookResource = rxResource({
  params: () => ({ isbn: this.selectedIsbn() }),
  stream: ({ params }) => this.bookService.getBook(params.isbn)
});
```

When the HTTP request fails with an error, the following happens:
First, the resource (in this example created via `rxResource`, but `resource()` behaves identically) receives the [`HttpErrorResponse`](https://angular.dev/api/common/http/HttpErrorResponse) from Angular's [`HttpClient`](https://angular.dev/api/common/http/HttpClient).
Then it checks if the error is an instance of the native `Error` class using `error instanceof Error`.
This seems simple, but it isn't!
This check is too narrow because it only recognizes classes that inherit from `Error`, not objects that implement the `Error` interface.
Unfortunately, `HttpErrorResponse` does not inherit from `Error`.
It only implements the `Error` interface!
As a result, the resource wraps it in a `ResourceWrappedError`.
The message is unhelpful:
> "Resource returned an error that's not an Error instance: [object Object]. Check this error's .cause for the actual error."

To access the actual HTTP status code, statusText, or URL, you must dig into the `cause` property: `bookResource.error().cause.status`.
This makes error handling cumbersome when working with HTTP errors.
What's particularly annoying is that other errors that inherit from `Error` are not wrapped at all, creating inconsistent error handling patterns across your application.

This wrapping behavior was introduced in [PR #61441](https://github.com/angular/angular/pull/61441) ([commit 9045e22](https://github.com/angular/angular/commit/9045e229c2899ee910ff6ce41fa822f2af5f88bf)) via the shared `encapsulateResourceError()` function, which affects both `resource` and `rxResource`:

```ts
export function encapsulateResourceError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new ResourceWrappedError(error);
}
```

**Note about `httpResource()`**: `httpResource()` passes errors through unwrapped ([source code line 372](https://github.com/angular/angular/blob/21.0.x/packages/common/http/src/resource.ts#L366-L374)), thus avoiding this issue entirely.
Instances of `HttpErrorResponse` are even handled to set headers and the status code.
Only errors thrown by the optional `parse` function get wrapped ([source code line 358](https://github.com/angular/angular/blob/21.0.x/packages/common/http/src/resource.ts#L355-L359)), but here the wrapping makes sense.

> **💡 Workaround**: If you're making HTTP requests, consider using `httpResource()` instead of wrapping `HttpClient` with `rxResource()`.
> In practice, `httpResource()` typically surfaces `HttpErrorResponse` directly, making error handling simpler.

**Important Note**: Accessing `value()` while the resource is in an error state causes an exception.
This is by design.
**Always use `hasValue()` to guard `value()` reads** ([Angular docs recommendation](https://angular.dev/guide/http/http-resource)).
The `hasValue()` method safely checks both error state and value existence.
So for your reference, here is a recommended pattern to follow:

```html
<!-- In template -->
@if (bookResource.hasValue()) {
  @let book = bookResource.value()!;
  <article>{{ book.title }}</article>
} @else if (bookResource.error()) {
  <p role="alert">Error loading books</p>
} @else if (bookResource.isLoading()) {
  <p>Loading books...</p>
}
```

> **TL;DR**: The `error()` signal is typed as [`Signal<Error | undefined>`](https://angular.dev/api/core/ResourceRef).
> If your underlying data source uses Angular's `HttpClient`, errors will be `HttpErrorResponse` instances.
> But with `rxResource` and `resource()`, `HttpErrorResponse` gets wrapped in `ResourceWrappedError`, accessible via `cause`.
> With `httpResource()` (which is built on top of `HttpClient`), you get `HttpErrorResponse` directly unwrapped.
> Note that other HTTP sources like `fetch()` produce different error types.
> For `HttpClient`-based errors, we can safely narrow with `instanceof HttpErrorResponse` to access HTTP-specific properties:

```typescript
import { HttpErrorResponse } from '@angular/common/http';

// With rxResource - error is wrapped
const bookResource1 = rxResource(/* [...] */);
const err1 = bookResource1.error();

if (err1?.cause instanceof HttpErrorResponse) {
  // Access via .cause for wrapped errors
  console.log(err1.cause.status);      // e.g., 404
  console.log(err1.cause.statusText);  // e.g., "Not Found"
  console.log(err1.cause.url);         // e.g., "/books/123"
}

// With httpResource - error is unwrapped
const bookResource2 = httpResource(/* [...] */);
const err2 = bookResource2.error();

if (err2 instanceof HttpErrorResponse) {
  // Access directly for unwrapped errors
  console.log(err2.status);      // e.g., 404
  console.log(err2.statusText);  // e.g., "Not Found"
  console.log(err2.url);         // e.g., "/books/123"
}
```
It's easy to see how this becomes confusing.

> **✅ Edit (January 2025):** With Angular 21.0.x and later, this confusion is resolved! All Resource APIs now return `HttpErrorResponse` directly unwrapped. The code example above showing `.cause` access is only needed for Angular versions before 21.0.x. Note: The `rethrowHttpResourceError()` operator in `rxResourceFixed` is still useful if you want to customize the error message (e.g., "HTTP Error 404: Not Found" instead of the raw `HttpErrorResponse`).

### Bug #3: reload() Doesn't Clear Error State Immediately

**Affects**: `resource()`, `rxResource()`, and `httpResource()` (all share the same `reload()` behavior)

<!-- **GitHub Issue**: No dedicated issue found for this specific behavior (as of January 2025) -->

**What Should Happen (in my opinion):**


When a resource is in error state and you call `reload()`, the error should clear immediately.
This gives users visual feedback that their reload action was received and the system is now attempting to recover.

However, no official Angular documentation explicitly covers how a resource's error state is handled during a reload.
The Angular docs describe how `value()` behaves, but say nothing about the `error()` signal or clearing errors when reloading.

**What Actually Happens**:

When you call `reload()` on a failed request, the error message stays visible throughout the entire attempt, which creates a confusing user experience.

Here's what happens with the following resource when you reload after an error. This is the same example as before:

```typescript
readonly bookResource = rxResource({
  params: () => ({ isbn: this.isbn() }),
  stream: ({ params }) => this.bookService.getBook(params.isbn)
});
```

**Starting Point - Resource in Error State:**
The resource is in error state.
The `error()` signal returns an error object ([source code line 262-263](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L261-L264) computes error from the stream).
Attempting to read `value()` throws a `ResourceValueError` exception ([source code line 199-200](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L198-L204)).
Note: There's an internal flag to control this throwing behavior ([line 38](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L33-L38)), but it's not exposed as a public option and defaults to throwing in v21.

**User Clicks "Reload":**
The application calls `bookResource.reload()` on the failed request.
The `reload()` method increments the reload counter ([source code line 308](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L300-L310)), which triggers the loading effect.

**DURING Reload - The Inconvenient Behavior (or Bug?):**
While the new request is in flight, `isLoading()` correctly returns `true`.
However, the `error()` signal **still returns the previous error** throughout the entire reload operation.
This happens because the error is only cleared when the stream provides new data (see next phase).
The old error remains visible in the UI, creating a confusing experience where users see alarming red error messages even though they've already clicked "Reload" and the system is attempting recovery.

**After Successful Response:**
Only after the new request completes successfully does the error clear.
The state transitions to `resolved` ([source code line 383-385](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L381-L386)), which causes `error()` to return `undefined`, and `value()` becomes accessible again.

**Why This Behavior Is Inconsistent**:

The confusing part is that resources handle error clearing differently.
It depends on how you trigger a new request.
When you **change parameters** to request different data, the error state clears immediately ([source code lines 238-243](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L238-L243)).
The moment your parameters change, the old error disappears and the UI shows a clean loading state.
This makes sense since you're requesting something new, so the old error no longer applies.
But when you call **`reload()`** on the same request, the old error remains visible during the entire fetch operation and only disappears after the new response successfully arrives.
This inconsistency creates a confusing UX where users click "Reload" but still see alarming red error messages during the reload attempt.
They've already taken action, yet the UI suggests the problem still exists.

By the way, the `reload()` method has another intentional behavior that can cause problems.
When the status is `loading` (a params-driven load is in progress), calling `reload()` is actively prohibited and simply returns `false` without doing anything ([source code lines 303-306](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L303-L306)).
The resource is basically saying "No!" to your reload command and simply returns false.
I think this is pretty harsh!
The comment in the source code states: "We don't want to restart in-progress loads."
Interestingly, this prohibition only applies to `loading` status (and `idle`), but not to `reloading` status.
This means you CAN call `reload()` again while a manual reload is already in progress, but you CANNOT interrupt a params-driven load with `reload()`.
While this distinction might seem reasonable at first, it creates confusing UX: if parameters change and trigger a slow load, users cannot click "Reload" to cancel and restart.
Nothing happens, so the button appears broken.
This is inconsistent because parameter changes themselves abort any in-progress request and start fresh.
The final solution (`rxResourceFixed`) bypasses this limitation by forcing a parameter change, which consistently aborts any in-progress request and starts a new one.
This was also the reason to take the brute force approach in the final solution.
The `reload()` method is simply not doing what I need it to do.
Other possible solutions would still interfere with this intentional behavior.
I'm sorry, Angular team! 😅

## The Solution: rxResourceFixed (It Actually Works!)

The good news? **All three bugs are fixable with simple patterns!**
I have built `rxResourceFixed` that wraps `rxResource` with the fixes we need.
It's a 100% drop-in replacement for `rxResource()` and returns the standard `ResourceRef<T>` interface.
You don't have to wait for Angular to fix these.
You can use this today:

```typescript
import { rxResourceFixed } from './rx-resource-fixed';

const booksResource = rxResourceFixed({
  params: () => ({ search: this.searchTerm() }),
  stream: ({ params }) => this.bookService.getBooks(params.search)
});
```

### What rxResourceFixed Does Differently

1. It preserves previous data when parameters change using `linkedSignal`.
  The old value stays in memory until new data arrives from the API.
  This prevents DOM collapse and eliminates the flickering problem.
  Users see a smooth transition from old data to new data without any jarring jumps or empty states.
  Note: When an error occurs, the value is cleared immediately (becomes undefined).
  This ensures error states are clearly visible and not masked by stale data.
  Combine with `hasValue()` and `error()` guards in your template to handle both loading and error states appropriately.

2. It auto-applies proper error handling with a simple operator that I called `rethrowHttpResourceError`.
  The `HttpErrorResponse` from Angular's HTTP client is properly converted to a standard `Error` object with a clean, readable message (e.g., "HTTP 500: Internal Server Error").
  The error is accessible via `resource.error()` with HTTP status codes and details directly in the message.
  You no longer need to dig into `.cause`.
  The original `HttpErrorResponse` is still preserved in `error.cause` if you need the raw response object.

3. It provides a reliable reload that clears the error state immediately.
  The implementation internally uses a `refreshKey` signal to force parameter re-evaluation.
  This triggers the same state management path as parameter changes, which clears the error state immediately before fetching.
  This gives users clear visual feedback when they reload after an error, without alarming red messages persisting during the reload.
  **Trade-off**: Bumping an internal `refreshKey` forces a **parameter change**, so the `status()` will be `loading` (not `reloading`).
  While the status differs, `isLoading()` behaves the same because it returns `true` for both `loading` and `reloading` states ([source code line 129](https://github.com/angular/angular/blob/21.0.x/packages/core/src/resource/resource.ts#L129)).

## Live Demo

I've created a demo project that proves each bug and shows that `rxResourceFixed` works as expected.
Check out the [demo](https://angular-schule.github.io/2025-10-rx-resource-is-broken/) to see:

[🐛 **Bug #1: Value Resets When Parameters Change**](https://angular-schule.github.io/2025-10-rx-resource-is-broken/bug-1-value-reset): Side-by-side comparison showing rxResource flickering/scroll jumping  
[🐛 **Bug #2: HttpErrorResponse Gets Wrapped**](https://angular-schule.github.io/2025-10-rx-resource-is-broken/bug-2-error-handling): Error handling comparison  
[🐛 **Bug #3: reload() Doesn't Clear Error State**](https://angular-schule.github.io/2025-10-rx-resource-is-broken/bug-3-reload): Reload behavior comparison  

➔ Of course, you can also [**download the full source on GitHub**](https://github.com/angular-schule/2025-10-rx-resource-is-broken).

## How to Use `rxResourceFixed` in Your Project

### Step 1: Copy the utility

[Copy `rx-resource-fixed.ts`](https://raw.githubusercontent.com/angular-schule/2025-10-rx-resource-is-broken/refs/heads/main/src/app/shared/rx-resource-fixed.ts) from the demo into your project, or copy and paste it directly from this snippet:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { linkedSignal, ResourceRef, Signal, signal, WritableSignal } from '@angular/core';
import { rxResource, RxResourceOptions } from '@angular/core/rxjs-interop';
import { catchError, MonoTypeOperatorFunction, throwError } from 'rxjs';

/**
 * A wrapper for rxResource that fixes three bugs:
 *
 * Bug #1: Value Resets When Parameters Change
 * Bug #2: HttpErrorResponse Gets Wrapped
 * Bug #3: reload() Doesn't Clear Error State Immediately
 */
// Overload: with defaultValue → ResourceRef<T> (value never undefined)
export function rxResourceFixed<T, P = void>(
  options: RxResourceOptions<T, P> & { defaultValue: T }
): ResourceRef<T>;

// Overload: without defaultValue → ResourceRef<T | undefined>
export function rxResourceFixed<T, P = void>(
  options: RxResourceOptions<T, P>
): ResourceRef<T | undefined>;

// Implementation
export function rxResourceFixed<T, P = void>(
  options: RxResourceOptions<T, P>
): ResourceRef<T | undefined> {
  // Internal refresh key to fix Bug #3
  // When incremented, the params change triggers a new loading phase which also aborts any pending request
  const refreshKey = signal(0);

  // Create underlying rxResource with auto-applied error handling (Bug #2 fix)
  // The refreshKey is included in params so that we can increment it (Bug #3 fix)
  // Spread options to preserve defaultValue, equal, and injector
  const resource = rxResource<T, { userParams: P; _refresh: number }>({
    ...options, // Preserve all options (defaultValue, equal, injector)
    params: () => ({
      userParams: options.params?.() ?? (undefined as P),
      _refresh: refreshKey()
    }),
    stream: (context) => {
      // Pass user params, abortSignal, and previous status to the stream function
      return options.stream({
        params: context.params.userParams as Exclude<P, undefined>,
        abortSignal: context.abortSignal,
        previous: context.previous
      }).pipe(
        rethrowHttpResourceError() // Bug #2 fix: Convert HttpErrorResponse to Error
      );
    }
  });

  // Create stable value signal using linkedSignal (Bug #1 fix)
  // Keeps previous value during params-driven loading and reloading from success.
  // Clears value on error (and therefore shows a clean slate on reload after error).
  const stableValue = linkedSignal({
    source: () => resource.status(),
    computation: (status: ReturnType<typeof resource.status>, previous) => {
      if (status === 'error') {
        return undefined; // clear on error
      }
      if (status === 'loading') {
        return previous?.value ?? resource.value(); // keep stale or use defaultValue
      }
      // For resolved, reloading, local, idle: return current value
      return resource.value();
    }
  });

  // Wrap stableValue to look like a WritableSignal for ResourceRef compatibility
  // While we expose set/update/asReadonly to match the interface, we delegate to the underlying resource
  const stableValueAsWritable = stableValue as unknown as WritableSignal<T | undefined>;
  stableValueAsWritable.set = resource.value.set.bind(resource.value);
  stableValueAsWritable.update = resource.value.update.bind(resource.value);
  stableValueAsWritable.asReadonly = stableValue.asReadonly.bind(stableValue) as () => Signal<T | undefined>;

  return {
    value: stableValueAsWritable,
    isLoading: resource.isLoading,
    error: resource.error,
    status: resource.status,
    hasValue: () => stableValue() !== undefined && resource.error() == null,
    /**
     * Reloads the resource by incrementing an internal refresh key.
     * Note: This triggers a params change, so status() will be `loading` (not `reloading`).
     * This is intentional to ensure error state clears immediately on reload.
     */
    reload: () => {
      // Bug #3 fix: Increment refreshKey to trigger param change
      refreshKey.update(k => k + 1);
      return true;
    },
    set: resource.set.bind(resource),
    update: resource.update.bind(resource),
    asReadonly: resource.asReadonly.bind(resource),
    destroy: resource.destroy.bind(resource)
  } as ResourceRef<T | undefined>;
}

/**
 * RxJS operator to re-throw HttpErrorResponse as a native Error for Angular resources.
 * Preserves original details in .cause; formats a descriptive message.
 *
 * @returns MonoTypeOperatorFunction<T> - Transforms the stream, catching/re-throwing only HTTP errors.
 */
export function rethrowHttpResourceError<T>(): MonoTypeOperatorFunction<T> {
  return catchError((err: unknown) => {
    if (err instanceof HttpErrorResponse) {
      // Create native Error with descriptive message and original as cause
      // Status 0 indicates network error (no connection, CORS, etc.)
      const prefix = err.status === 0 ? 'Network Error' : `HTTP Error ${err.status}`;
      const nativeError = new Error(
        `${prefix}${err.message ? `: ${err.message}` : ''}`,
        { cause: err }
      );
      return throwError(() => nativeError);
    }
    // Re-throw non-HTTP errors unchanged (e.g., for other loader types)
    return throwError(() => err);
  });
}
```

### Step 2: Replace rxResource with rxResourceFixed

```typescript
// Before
import { rxResource } from '@angular/core/rxjs-interop';

const resource = rxResource({
  params: () => ({ isbn: this.selectedIsbn() }),
  stream: ({ params }) => this.bookService.getBook(params.isbn)
});

// After
import { rxResourceFixed } from './rx-resource-fixed';

const resource = rxResourceFixed({
  params: () => ({ isbn: this.selectedIsbn() }),
  stream: ({ params }) => this.bookService.getBook(params.isbn)
});
```

### Step 3: Use the stable value in templates

```html
<!-- Your data never flickers! -->
@if (booksResource.hasValue()) {
  @for (book of booksResource.value(); track book.isbn) {
    <article>{{ book.title }}</article>
  }
} @else if (booksResource.error()) {
  <p role="alert">Error loading books: {{ booksResource.error()?.message }}</p>
} @else if (booksResource.isLoading()) {
  <div class="loading-indicator">Loading...</div>
}
```

**Trade-offs to be aware of:**

The `reload()` method has changed its semantics.
This wrapper intentionally trades the official `reloading` status for a fresh `loading` cycle.
If your UI relies on distinguishing `loading` from `reloading`, you will need to adapt your solution.
Additionally, it preserves stale data during loading but clears it on error to ensure error states are clearly visible.
This is by design.
I think this makes the most sense, but I don't have strong feelings if you disagree.

If you're making HTTP requests and don't need Observables and/or RxJS, consider using `httpResource()` with the built-in `defaultValue` option!


## Conclusion: I Fixed It (And So Can You!)

Angular's Resource APIs have amazing potential.
But the shared foundation has three bugs that break real-world apps.

**The good news?** These bugs are fixable!
`rxResourceFixed` (or a similar approach) solves all three issues.
It's a true drop-in replacement that returns the standard `ResourceRef<T>` interface, so it works seamlessly with existing code.

The bugs are documented on GitHub ([#58602](https://github.com/angular/angular/issues/58602) and [#61861](https://github.com/angular/angular/issues/61861)) with significant community reactions.
The Angular team is aware, but remember: **experimental APIs can change in any release**.
Don't let these bugs block your migration to signals!
Use `rxResourceFixed` today, and when Angular fixes these issues, you can drop the wrapper and use the native `rxResource` again.



**Found this helpful?**
Share it with your Angular developer friends who might be struggling with the same issues! 🙂


---

## A Final Note on the Title

I'll admit, I struggled with the title "Angular's Resource APIs Are Broken."
It feels harsh.
But after documenting these issues in detail, I believe it's justified.
Each individual bug might seem like a minor inconvenience, but together they add up to something significant.
For me, the Resource APIs are simply not usable in production without workarounds.
I want the defaults to serve my imaginary 80% use case.
I want APIs that work out of the box for the most common scenarios.
Let's hope the Angular team will fix these experimental APIs to be truly usable without wrappers or workarounds.
