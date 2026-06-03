---
title: 'Angular 22 is here!'
author: Angular Book Team
mail: team@angular-buch.com
published: 2026-06-03
lastModified: 2026-06-03
keywords:
  - Angular
  - Angular 22
  - Signal Forms
  - Resource API
  - httpResource
  - rxResource
  - Fetch API
  - OnPush
  - Debounced Signals
  - Service Decorator
  - injectAsync
  - WebMCP
  - Angular ARIA
  - Vitest
  - Webpack
language: en
header: angular22.jpg
sticky: true
---

There is news from the Angular world again: **Angular 22** is here!
This release pushes several concepts across the finish line:
**Signal Forms**, the **Resource API**, and **`@angular/aria`** are now stable.
The `HttpClient` now uses the modern Fetch API by default, and a new `@Service()` decorator has been introduced.
We present these and several other updates in this blog post.

You can find the official information about the new release in the [Angular Blog](https://blog.angular.dev/announcing-angular-v22-c52bb83a4664).
To migrate an existing project to Angular 22, you can use the `ng update` command, see the [Angular Update Guide](https://angular.dev/update-guide).

> 🇩🇪 This article is available in German language here: [Angular 22 ist da!](https://angular-buch.com/blog/2026-06-angular22)

## Contents

[[toc]]

## Versions of TypeScript and Node.js

The following versions of TypeScript and Node.js are required for Angular 22:

- TypeScript: >=6.0.0 <6.1.0
- Node.js: ^22.22.0 || ^24.13.1 || >=26.0.0

You can find detailed information about supported versions in the [Angular documentation](https://angular.dev/reference/versions).


## Our new Angular book (in German)

At the end of May 2026, our new Angular book hit the shelves! Please note that this book is **available in German language only**.
In the new 1st edition, we provide a solid, hands-on introduction to Angular.
The book is based on the new major version Angular 22 and is also suitable for the following versions.
Among other things, we cover the new Signal Forms and the Resource API in detail.

The ["BookManager" example project](https://bm1.angular-buch.com) from the book also currently runs on Angular 22.


## Signal Forms are stable

Signal Forms were introduced as an experimental feature with Angular 21 – now, half a year later, they are officially *stable*.
This gives Angular a brand-new approach to form handling in its toolbox, one that consistently builds on signals.

The basic idea: the form data is stored in a signal that we manage ourselves.
From this data structure, Angular automatically derives the structure of the form.
Validation rules are declared via a schema-based API with functions such as `required()`, `minLength()`, or `validate()`.
For data binding, only a single directive is used in the template: `[formField]`.

```ts
import { schema, form, FormField, required, minLength } from '@angular/forms/signals';

const bookFormSchema = schema<Book>(fieldPath => {
  required(fieldPath.title);
  minLength(fieldPath.isbn, 10);
});

@Component({
  imports: [FormField],
  template: `
    <input [formField]="bookForm.title" />
    <input [formField]="bookForm.isbn" />
  `,
})
export class BookForm {
  protected readonly bookData = signal<Book>({ title: '', isbn: '' });
  protected readonly bookForm = form(this.bookData, bookFormSchema);
}
```

The interfaces and concepts are stable, and using them in production is officially recommended.
We expect that *Reactive Forms* and *Template-Driven Forms* will eventually be superseded by Signal Forms.
However, existing Reactive Forms do not have to be thrown overboard:
The compat layer `@angular/forms/signals/compat` lets you interlink both worlds.
A detailed guide with top-down and bottom-up strategies is available in the [Migration Guide](https://angular.dev/guide/forms/signals/migration).

Over the past months, we have worked intensively with Signal Forms and published a four-part blog post series:

- [**Part 1: Getting Started with the Basics**](https://angular-buch.com/blog/2025-10-signal-forms-part1)
- [**Part 2: Advanced Validation and Schema Patterns**](https://angular-buch.com/blog/2025-10-signal-forms-part2)
- [**Part 3: Child Forms and Custom UI Controls**](https://angular-buch.com/blog/2025-10-signal-forms-part3)
- [**Part 4: Metadata and Accessibility Handling**](https://angular-buch.com/blog/2025-12-signal-forms-part4)

You will also find three detailed chapters on Signal Forms in our new Angular book.


## The Resource API is stable

The Resource API is also marked as *stable* with Angular 22!
A resource represents an asynchronously loaded dataset.
It provides not only the loaded value but also reactive status information such as `isLoading`, `error`, and `value`, each as a signal.
This makes it possible to elegantly model the entire data-loading process without having to deal with subscriptions or manual state management.

The three variants differ in their loader:

- `resource()` works with a Promise-based loader.
- `rxResource()` is the bridge to the RxJS world: the resource processes an Observable.
- `httpResource()` is the HTTP-specific variant. Under the hood, it uses the `HttpClient` and therefore also supports all HTTP interceptors.

```ts
import { httpResource } from '@angular/common/http';

@Service()
export class BookStore {
  readonly selectedIsbn = signal<string | null>(null);

  readonly book = httpResource<Book>(() => {
    const isbn = this.selectedIsbn();
    return isbn ? `/api/books/${isbn}` : undefined;
  });
}
```

We have already introduced the Resource API in a detailed blog post:
[**Reactive Angular: Loading Data with the Resource API**](/blog/2025-05-resource-api).
With its stabilization in Angular 22, the approach described there is now officially the recommended way to load data in a signal-based fashion within components.

For write operations, however, the `HttpClient` is still used. A resource is only suitable for loading data that is then provided as signals.


## Angular ARIA is stable

The package [`@angular/aria`](https://angular.dev/guide/aria/overview) offers a collection of directives that implement common [WAI-ARIA patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) – from Accordion and Combobox to Tabs and Tree.
Keyboard interactions, ARIA attributes, focus management, and screen reader support are already built in.
We only provide the HTML structure, the styling, and the domain logic.

As of Angular 22, the new package is also considered **stable**.
This means we can now use the directives in production applications without hesitation.
Installation is done as usual via the Angular CLI:

```bash
ng add @angular/aria
```


## The new `@Service()` decorator

Angular 22 introduces the new `@Service()` decorator.
It is the modern and ergonomic alternative to the established `@Injectable()` decorator with the `providedIn: 'root'` setting.

Since the `Service` class name suffix [was dropped with Angular 20](/blog/2025-05-angular20), the new decorator is, in our view, a sensible addition.
This way, you can tell at a glance that a class is a service.

In most cases, the decorator can be replaced directly:

```ts
// BEFORE
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BookStore {}
```

```ts
// AFTER
import { Service } from '@angular/core';

@Service()
export class BookStore {}
```

The Angular CLI now also generates services with `ng generate service` using the new decorator by default.
To get the older `@Injectable()` decorator when generating, we can use the `--injectable` flag.

```bash
# with the `@Service()` decorator
ng g service book-store

# with the `@Injectable()` decorator
ng g service book-store --injectable
```

Compared to `@Injectable()`, `@Service()` offers no configuration options and is therefore deliberately kept lean.
There is one important characteristic to be aware of: **constructor injection is not allowed with `@Service()`**.
Dependencies must be resolved via the `inject()` function – otherwise Angular throws an error.
This restriction gently but firmly nudges us toward the modern, functional DI style.

For special cases such as `providedIn: 'platform'`, we still need the `@Injectable()` decorator.
So there is no need to worry that `@Injectable()` will be "deprecated" in the near future.
Nevertheless, we recommend equipping new services with the new decorator – the syntax is shorter and it also looks a bit sleeker.

> By the way: The concept of a `@Service()` decorator for Angular was played through by Johannes as a thought experiment in [his own blog post](/blog/2025-09-service-decorator) – and now it actually exists!


## Change Detection: OnPush is now the default

With Angular 22, another big step toward performance has been taken:
**`ChangeDetectionStrategy.OnPush` is now the default strategy** for all components.
This is based on the [RFC on the topic](https://github.com/angular/angular/discussions/66779), which the community discussed at length.

Components in which the `changeDetection` property is not explicitly set now automatically use the `OnPush` strategy.
With this, the Angular team consistently continues along the path it has taken:
With Angular 21, zoneless change detection became the default, signals have been the central reactivity primitive for some time, and now granular change detection is active by default as well.
The result is better performance "out of the box", because unnecessary change detection runs are avoided.

If your application is already consistently based on signals, the switch should not be a problem.
Using `OnPush` has been recommended for several years, so many projects are already well aligned with it.

For older applications, however, the migration has pitfalls:
Components that update their view state via direct property assignments from within a subscription, without additionally calling `markForCheck()`, can silently "freeze".
The data arrives, but the display in the template does not update, because Angular no longer automatically detects that an update is necessary.

The clean solution is to switch subscriptions to signals, for example using `toSignal()`.
Alternatively, you can explicitly call `markForCheck()` or bind the value into the template via the AsyncPipe.
Anyone who already relies consistently on signals usually does not need to change anything in their own components.

Particular caution is required with your own libraries:
Library authors should review their components and – if the components rely on the old behavior – explicitly set the `changeDetection` property to `ChangeDetectionStrategy.Eager`, so that nothing breaks unexpectedly.
`Eager` is the new name for the old `Default` strategy.


## HttpClient: the Fetch API is now the default

The `HttpClient` now uses the browser's modern Fetch API by default under the hood.
Previously, Fetch had to be enabled explicitly via `withFetch()`; otherwise, the `HttpClient` used the older `XMLHttpRequest`.

Since the providers for the `HttpClient` have been included automatically as of Angular 21, we don't need to do anything else for setup: we can use the `HttpClient` directly via `inject()` in the application.
As of Angular 22, Fetch works all by itself, and an explicit call to `provideHttpClient()` in `app.config.ts` is no longer necessary.

```ts
@Service()
export class BookStore {
  // HttpClient is available out of the box – with Fetch as the default
  #http = inject(HttpClient);
}
```

The benefits: better compatibility with server-side rendering, a modern browser API, and a slightly leaner bundle, because the XHR path is no longer needed by default.

However, this change is a breaking change that comes with an important limitation:
The `FetchBackend` does **not support upload progress events**.
Anyone who wants to track the progress of file uploads in their application using `reportProgress: true` must explicitly switch back to the XHR backend for the affected requests.
To do this, we continue to call `provideHttpClient()` manually and configure the XHR backend:

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withXhr())
  ]
};
```


## Incremental Hydration is now the default

Anyone who ships an Angular application with server-side rendering or prerendering has benefited from *Incremental Hydration* since Angular 19: instead of making the entire application interactive all at once, only the areas that the user actually sees or clicks on are activated. This noticeably shortens the time until the page is responsive for the user.

Until now, the feature had to be enabled explicitly via `provideClientHydration(withIncrementalHydration())`. With Angular 22, Incremental Hydration is the default and takes effect automatically when `provideClientHydration()` is included in `app.config.ts`.

Anyone who still needs the old behavior can disable it with the new `withNoIncrementalHydration()` function. For existing applications, the Angular CLI ships a migration schematic that removes superfluous calls to `withIncrementalHydration()`.

## HTML comments in Angular templates

A small but, in everyday use, very helpful improvement concerns templates:
Angular 22 now allows **comments inside template elements**, in addition to the classic HTML comments `<!-- ... -->`.

Previously, you couldn't easily comment out attributes, inputs, or event bindings in a multi-line element tag, or annotate them with a short note.
Now the template parser also accepts JavaScript-style comments such as `// ...` for single lines and `/* ... */` for multi-line comments directly between the attributes.

```html
<app-book-card
  // Pass a book as input
  [book]="b"
  /* Process received 'like' event */
  (like)="addLikedBook($event)"
/>
```

## Debounced Signals

The new release introduces the experimental function **`debounced()`**.
With it, we can *debounce* a signal so that it only emits its value after a short waiting period.
This is a classic with search input fields: while typing, a request should not be sent after every keystroke, but only once the input has settled.

Until now, this pattern was firmly anchored in the world of RxJS: you had to convert the signal into an Observable with `toObservable()`, use `debounceTime()`, and convert the result back with `toSignal()`.
With `debounced()`, this now works directly in the signal world, without any detours.

```ts
import { debounced, resource, signal } from '@angular/core';

@Component({/* ... */})
export class Search {
  protected readonly query = signal('');
  protected readonly debouncedQuery = debounced(this.query, 300);

  protected readonly results = resource({
    params: () => this.debouncedQuery.value(),
    loader: ({ params }) => fetchResults(params),
  });
}
```

The `debounced()` function returns a `Resource` whose value is only updated after the specified waiting period (in milliseconds) has elapsed.
While waiting, the resource has the status `loading`, and afterwards `resolved`.
Instead of a fixed number of milliseconds, you can also pass your own wait function that returns a `Promise<void>`.
This allows you to implement, for example, different waiting times depending on the input length.

Important: `debounced()` must be called within an injection context so that Angular can automatically clean up the associated timers when the injector is destroyed.

In Signal Forms, there is additionally the related schema function `debounce()`, with which asynchronous validators can be debounced.
We can use this tool, for example, to avoid triggering a server-side uniqueness check on every keystroke.


## `injectAsync()`: load services lazily

Another new tool in the area of dependency injection is the **`injectAsync()`** function.
With it, services and their dependencies can be **loaded lazily**, without ending up in the application's initial bundle.

Until now, the pattern for lazily loaded services was cumbersome:
You had to obtain the `Injector` via `inject()`, import the service dynamically, and resolve and cache the result yourself via `Injector.get()`.
With `injectAsync()`, Angular handles all these steps automatically.
The function is passed a loader that returns the service class via a dynamic `import()`.
To use the service, we have to process the promise returned by the function ourselves, e.g. with `async`/`await`.
When called, the class is resolved through dependency injection and cached for subsequent calls.

```ts
import { Component, injectAsync, onIdle, signal } from '@angular/core';

@Component({ /* ... */ })
export class PostEditor {
  #markdownParser = injectAsync(
    () => import('../markdown-parser').then(m => m.MarkdownParser),
    { prefetch: onIdle }
  );

  async preview() {
    const svc = await this.#markdownParser();
    // ...
  }
}
```

Heavyweight dependencies such as Markdown parsers, charting libraries, or PDF renderers thus no longer appear in the initial bundle.
They are only loaded once the respective function is called.

Optionally, a **prefetch strategy** can be specified.
With `prefetch: onIdle`, Angular loads the dependency in the background as soon as the browser is idle.
This keeps the initial bundle lean, and yet users don't have to wait when they call the feature later – the file is then already in the cache.


## WebMCP: integrating AI agents into web apps

Angular 22 brings experimental support for **[WebMCP](https://github.com/webmachinelearning/webmcp)** (Web Model Context Protocol).
This emerging web standard makes it possible to provide structured tools for AI agents in the browser from within a web app.
Instead of DOM scraping and simulated clicks, agents such as Claude or Gemini can call the declared tools directly, for example to fill out a form or trigger a search.

Angular hooks WebMCP cleanly into the existing architecture: tools can be registered globally, per route, or in services and components.
The bridge to Signal Forms is particularly elegant: with the `experimentalWebMcpTool` option in the `form()` function, a form is automatically exposed as a WebMCP tool, including JSON schema and validation.

<!-- We have dedicated a detailed article to this topic:
[**WebMCP: Integrating AI Agents into Angular Apps**](/blog/2026-05-webmcp). -->


## AI debugging tools

Angular 22 extends the bridge to AI-assisted tooling: in development mode, the framework registers a number of new debug interfaces that agents can address directly in the browser – matching the WebMCP support we already encountered above.

The most prominent tool is `angular:di-graph`. With it, an agent (e.g. Claude or Gemini) can query an application's complete dependency injection graph: all element and environment injectors, their hierarchy, and the services they contain.
For debugging sessions with an AI assistant or when setting up automated diagnostic workflows, this is a practical tool.

## Webpack-based builders are deprecated

On the tooling side, the Angular team draws another line:
The old **Webpack-based builders** (`@angular-devkit/build-angular:browser` and `@angular-devkit/build-angular:dev-server`) are officially marked as **deprecated** with Angular 22.

For several versions now, the esbuild-based `application` builder has been the default for new projects.
It is significantly faster, supports SSR directly, and integrates seamlessly with the Vitest test runner.
Anyone still working with a Webpack configuration should plan the migration to the new builder now at the latest.
The Angular CLI provides a suitable migration script for this, which automatically converts the `angular.json`:

```bash
ng update @angular/cli --name use-application-builder
```

A removal of the Webpack builders is planned for one of the upcoming major releases.


## Testing: migrating `fakeAsync` to Vitest fake timers

With Angular 21, Vitest became the new standard test runner.
Anyone migrating existing tests will sooner or later run into a pitfall:
The well-known helpers `fakeAsync()` and `tick()` from `@angular/core/testing` are based on Zone.js and no longer fit easily into the new, zoneless setup.
Vitest brings its own modern concept for controlling time in tests with its **fake timers**.

With Angular 22, the Angular CLI provides a schematic that automatically converts tests from `fakeAsync`/`tick` to Vitest's fake timers:

```bash
ng generate @schematics/angular:fake-async-to-vitest-fake-timers
```

The schematic replaces the `fakeAsync` wrappers with `vi.useFakeTimers()`, translates `tick(...)` into `vi.advanceTimersByTime(...)`, and takes care of the associated imports.
In our [Vitest migration guide](/blog/2025-11-migrate-to-vitest#asynchrony-without-zonejs-using-vitest-timers), we explained the various Vitest timer APIs in detail and also show in which cases the schematic reaches its limits.


## Other updates

In the changelogs of [Angular](https://github.com/angular/angular/releases) and the [Angular CLI](https://github.com/angular/angular-cli/releases), you will always find all the detailed information about the current development of the framework.
We have collected some interesting highlights here:

- **Strict templates as the default:** The Angular compiler now enables strict template type checking by default. With `ng new`, `"strictTemplates": true` is therefore no longer written into the `tsconfig.json` — the setting is implicitly active (see [commit](https://github.com/angular/angular-cli/commit/f98cc82eb0f46986e61b4f94b57dcd36e4eaf215)).
- **Subresource Integrity for dynamic modules:** The `@angular/build` builder automatically generates an import map with SRI hashes for lazy loading and `injectAsync()`. This makes it possible to verify that dynamically loaded JavaScript modules have not been tampered with (see [commit](https://github.com/angular/angular-cli/commit/58c7c7a9d80fc6af5cf8b82a6d87f1d3cf3808c6)).
- **Bootstrap under shadow roots:** An Angular application can now be bootstrapped within a shadow DOM tree. Useful, for example, for micro frontends that are embedded as a web component into another application (see [commit](https://github.com/angular/angular/commit/cdda51a3b2f48d5623acef0c6f54afb7af921b58)).
- **SSR cache for resources:** With the new `transferCacheKey` option, values from `resource()`/`rxResource()` can be transferred from the server to the client via `TransferState`. This avoids duplicate loading operations (see [commit](https://github.com/angular/angular/commit/5a7c1e62dc2a4fa199b85150eca66914c107a6f4)).

## Outlook on later versions

Unfortunately, two exciting features did not make it into this release and are therefore on the roadmap for the next releases.

### `linkedSignal` with write-back

`linkedSignal()` gets an optional `set` function, with which we can individually define the write behavior. Instead of directly overwriting the value of the linked signal, the update can be redirected to another data source. The [corresponding commit](https://github.com/angular/angular/commit/124ba10ead58c9f93b0b74c4102022c4674db1f5) demonstrates this with a temperature in Celsius as the source of truth and a derived linked signal in Fahrenheit:

```typescript
const tempC = signal(0);
const tempF = linkedSignal(() => (tempC() * 9) / 5 + 32, {
  set: (valF) => tempC.set(((valF - 32) * 5) / 9),
});

tempF.set(212);
console.log(tempC()); // 100
console.log(tempF()); // 212
```

`tempC` remains the leading source, while `tempF` can be both read and written.

### `@boundary` and `@error`: error boundaries for templates

At Google I/O 2026, Mark Thompson from the Angular team announced a new template syntax: `@boundary` and `@error`. If an exception occurs while rendering a component inside the boundary, Angular isolates the error and renders the fallback from the `@error` block instead. This way, the error can no longer affect the rest of the application.

```html
<section>
  @boundary {
    <app-payment-summary />
  }
  @error (let err) {
    <app-payment-fallback />
  }

  <app-order-details />
  <app-checkout-button />
</section>
```

The feature is planned as a Developer Preview for the third quarter of 2026.
So we can already look forward to the next version of Angular.

<hr>

We wish you lots of fun developing with Angular 22!
Do you have questions about the new version of Angular or about our book? Write to us!

**Have fun!
Ferdinand, Danny and Johannes**

<hr>

<small>**Cover image:** Joshua Tree National Park, California, USA, 2019. Photo by Ferdinand Malcher</small>
