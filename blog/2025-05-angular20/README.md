---
title: 'Angular 20 is here!'
author: Angular Book Team
mail: team@angular-buch.com
published: 2025-06-01
lastModified: 2025-06-01
keywords:
  - Angular
  - Angular 20
  - Structural Directives
  - vitest
  - Component Suffix
language: en
header: angular20.jpg
sticky: true
---

Everything new comes in May - or at least a new major version of Angular:
On **May 28, 2025**, **Angular 20** was released! You can find the release information directly from the Angular team in the official [Angular Blog](https://blog.angular.dev/announcing-angular-v20-b5c9c06cf301).

For migrating to Angular 20, we recommend using the `ng update` command.
Detailed information on the required steps can be found in the [Angular Update Guide](https://angular.dev/update-guide).




## Versions of TypeScript and Node.js

For Angular 20, *at least* the following versions of TypeScript and Node.js are required:

- TypeScript: 5.8
- Node.js: 20.19.x or higher, 22.12.x or higher, or 24.0.x or higher

Support for Node.js version 18 has been removed. You can find detailed information about supported versions in the [Angular documentation](https://angular.dev/reference/versions).


## The new Coding Style Guide

Angular has evolved significantly in recent years, and many new concepts have been integrated into the framework.
The Angular documentation was partially out of date: the Coding Style Guide, in particular, had no recommendations for the current status quo.
This changed with Angular 20:
The new [Style Guide](https://angular.dev/style-guide) has been heavily revised and streamlined.
It includes current recommendations and best practices and serves as a guideline for development with current Angular versions.

### No more suffixes: more deliberate naming and new patterns

An important change worth mentioning concerns the suffixes in file and class names:
The new Style Guide *no longer* recommends using suffixes for components, services, and directives.
Starting with Angular 20, the CLI no longer generates suffixes like `.component.ts` or `.service.ts` by default.
This new setting only applies to newly created projects.

The command `ng generate component book-card` thus produces the following output:

**up to Angular 19:**

```
src/app
  book-card
    book-card.component.ts
    book-card.component.html
    book-card.component.scss
    book-card.component.spec.ts
```

```ts
// book-card.component.ts
// ...
@Component(/* ... */)
export class BookCardComponent {}
```

**starting with Angular 20:**

```
src/app
  book-card
    book-card.ts
    book-card.html
    book-card.scss
    book-card.spec.ts
```

```ts
// book-card.ts
// ...
@Component(/* ... */)
export class BookCard {}
```

The goal: Angular applications should contain less boilerplate, and we should think more deliberately about naming abstractions.
Instead of automatically generated constructs like `product-detail.component.ts`, we’re now expected to think: What is this class called? What does it do? How much does the name say on its own?
We welcome this development, as it leads to shorter, more purposeful file and class names.

A practical example: For routed components, we prefer the suffix `page`, such as `checkout-page.ts` (class name `CheckoutPage`), because it clearly indicates its purpose - without referring to technical details like `Component`.
A component that only displays content and contains no logic could be named `CheckoutView`, for example.

If you want to keep the previous behavior, you can still specify a `type` when generating, which will result in a suffix.
This setting can also be made permanent in the `angular.json` file.

```bash
ng generate component book-card --type=component
```


## Zoneless Developer Preview

The Angular team has been working for several years to optimize *synchronization* (also known as *change detection*) in the framework.
One milestone was the introduction of signals, which allow precise change detection.
In the future, Angular will no longer need the *zone.js* library to patch browser interfaces and trigger change detection.

<!-- We already covered change detection and the setting for a “zoneless application” in detail in our [blog post for Angular 18 (German language)](/blog/2024-06-angular18). -->

With Angular 20, *zoneless* is released in *Developer Preview* status.
The interface is largely stable. However, short-term changes may still occur, so usage in production should be carefully considered.

To activate zoneless change detection, use the `provideZonelessChangeDetection()` function.
The word `experimental` has been removed from the function name.
It’s also recommended to enable a global error handler that catches unhandled exceptions.

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners()
  ]
};
```

The Angular CLI offers to generate a *zoneless* application when creating a new project:

```bash
➜  ~ ng new my-app
✔ Do you want to create a 'zoneless' application without zone.js (Developer Preview)? Yes
```

The setting can also be controlled with the new `zoneless` parameter, which can be negated using `no`:

```bash
ng new my-app --zoneless
ng new my-app --nozoneless
```


## Structural directives `ngIf`, `ngFor`, `ngSwitch`

With Angular 20, the old directives `ngIf`, `ngFor`, and `ngSwitch` are marked as *deprecated*.
They will likely be completely removed from the framework with Angular 22 (in one year).

The background is the new built-in control flow introduced with Angular 17.
These directives can be replaced by Angular’s built-in expressions: `@if`, `@for`, `@switch`, and `@let`.

```html
<!-- with directive (deprecated) -->
<div *ngIf="condition">Hello world</div>

<!-- with control flow -->
@if (condition) {<div>Hello world</div>}
```

<!-- We covered the control flow syntax in detail in our [blog post on Angular 17](/blog/2023-11-angular17#neuer-control-flow-if-for-switch). -->
The Angular CLI also provides a migration script, so switching to the new syntax shouldn’t be difficult:

```bash
ng generate @angular/core:control-flow
```


## Experimental test builder for Vitest

The test runner Karma, still the default for unit and integration tests in Angular, is no longer being developed.
Since this decision, the Angular team has been working on integrating alternative test runners into the Angular CLI.
Two years ago, experimental builders for [Jest and Web Test Runner](https://blog.angular.dev/moving-angular-cli-to-jest-and-web-test-runner-ef85ef69ceca) were released.
With Angular 20, another experimental integration is added for [Vitest](https://vitest.dev):
Vitest has already become a staple in other web frameworks based on the [Vite](https://vite.dev) bundler.
Angular’s build process has already [used ESBuild with Vite since version 16](/blog/2023-05-angular16#esbuild).
With this gradual switch, we can now also use Vitest for unit and integration tests.

Which of the experimental test runners will become Angular’s new standard is not yet decided!
All approaches are experimental and will be evaluated further in the coming months.

To use Vitest with the Angular CLI, first add the required dependencies:

```sh
npm i vitest jsdom --save-dev
```

Then, adjust the testing configuration in the `angular.json` file:

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
      "tsConfig": "tsconfig.spec.json",
      "buildTarget": "::development",
      "runner": "vitest"
  }
}
```

In your tests, use Vitest’s functions by importing the following:

```ts
import { describe, beforeEach, it, expect } from 'vitest';
// ...
```

Run the tests as usual using `ng test`.

Vitest is largely compatible with the APIs of [Jest](https://jestjs.io/) and Karma - switching is definitely worth trying.
Ideally, you’ll need only minimal changes in your tests.

One of the three experimental builders (Jest, Web Test Runner, Vitest) will likely become the new standard.
We welcome the move to rely on established standards outside the Angular ecosystem and to deprecate the custom Karma test runner.
We’ll continue to keep you updated.


## Stable Signal APIs: `effect`, `linkedSignal`, and `toSignal`

Since Angular 16, signals have paved the way for a new, reactive Angular.
In Angular 20, more APIs from the signals ecosystem have now been officially released as stable: `effect`, `linkedSignal`, and `toSignal`.

These functions were previously experimental and are now part of the stable API set:

* `effect()` automatically reacts to signal changes and performs defined side effects - without lifecycle hooks.
* `linkedSignal()` enables bidirectional binding between a signal and an external source - e.g. a component or a FormControl.
* `toSignal()` converts observable data into a readable signal - ideal for integrating existing streams.

You’ll find more details and examples in our Signals series:

* [New in Angular 19: LinkedSignal for reactive state management (German language)](https://angular-buch.com/blog/2024-11-linked-signal)
* [Angular 19: Mastering effect and afterRenderEffect](https://angular.schule/blog/2024-11-effect-afterrendereffect)


## httpResource: Load data with signals

In October 2024, the new experimental Resource API was introduced. We covered it in detail in a [blog post](https://angular-buch.com/blog/2024-10-resource-api).
It connects the synchronous world of signals with asynchronously fetched data, e.g. via HTTP.
The data is loaded asynchronously using a loader and provided via signals.

A few weeks ago, another variant of the Resource was introduced: `httpResource`.
It uses Angular’s `HttpClient` under the hood to perform an HTTP request directly.
You no longer need to write the request yourself - the resource handles it for you.

```ts
booksResource = httpResource<Book[]>(
  () => 'https://api.example.org/books',
  { defaultValue: [] }
);
// ...
console.log(booksResource.value())
```

The request must be generated using a function.
This is because it runs in a *reactive context*: If you use signals inside the function, the request is re-executed automatically when any of those signals change.
Additional request details can be passed in an options object:

```ts
booksResource = httpResource<Book[]>(
  () => ({
    url: 'https://api.example.org/books',
    params: {
      search: 'Angular'
    }
  })
);
```

Please note that a resource is solely meant for *retrieving* data from an API and exposing it with signals.
Write operations such as create, update, or delete cannot be handled with a resource.
You must continue to use `HttpClient` directly for those.


## Miscellaneous

You can always find all details about the updates in the changelogs for [Angular](https://github.com/angular/angular/blob/main/CHANGELOG.md) and the [Angular CLI](https://github.com/angular/angular-cli/blob/main/CHANGELOG.md).
We’ve compiled a few interesting highlights here:

- **`provideServerRouting()` deprecated:** The function `provideServerRouting()` is deprecated. Instead, use `provideServerRendering()` with the `withRoutes()` feature. (see [commit](https://github.com/angular/angular-cli/commit/33b9de3eb1fa596a4d5a975d05275739f2f7b8ae))
- **Chrome DevTools:** Integration of Angular into Chrome DevTools has significantly improved. The *Performance* tab now lets you analyze Angular’s change detection and other performance parameters.
- **Official mascot:** The Angular team wants to introduce an official mascot for the framework - and the community is invited to participate! Vote for your favorite or share your thoughts in the [RFC on GitHub](https://github.com/angular/angular/discussions/61733).

<hr>


We wish you lots of fun developing with Angular 20!
Do you have questions about the new version or about our book? Reach out to us!

**Best wishes from
Ferdinand, Danny, and Johannes**

<hr>

<small>**Cover photo:** Morning mood in the Anklam wetland. Photo by Ferdinand Malcher</small>
