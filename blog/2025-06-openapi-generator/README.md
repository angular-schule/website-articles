---
title: "Generating Angular API clients with OpenAPI Generator"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
bio: '<a href="https://angular-buch.com"><img src="https://angular-buch.com/assets/img/book-cover-v1m.png" alt="Angular-Buch Cover" style="float: right; margin-top: -60px; margin-right: 30px; max-width: 250px;"></a>This article complements the HTTP chapter of our new <b>Angular book</b> (in German language) by Ferdinand Malcher, Danny Koppenhagen and Johannes Hoppe, where we cover everything you need to know about HTTP communication with Angular. After four successful editions, we have rewritten the book from scratch – with modern syntax, compact and covering many new topics. The new book will be released in May 2026. More info at <a href="https://angular-buch.com" style="text-decoration: underline;"><b>angular-buch.com</b></a>'
bioHeading: About the Angular book
author2: Angular.Schule Team
mail2: team@angular.schule
bio2: '<a href="https://angular.schule"><img src="/img/logo-angular-schule-gradient-550.png" alt="Angular.Schule Logo" style="float: right; margin-left: 30px; margin-top: -10px; margin-right: 30px; max-width: 250px;"></a>Want to integrate OpenAPI into your Angular workflow? Join Ferdinand Malcher and Johannes Hoppe in our workshops, where you learn Angular the practical way – including API integration with OpenAPI Generator. More at <a href="https://angular.schule" style="text-decoration: underline;"><b>angular.schule</b></a>'
bio2Heading: About our Angular workshops
published: 2025-06-18
lastModified: 2026-02-15
keywords:
  - OpenAPI
  - OpenAPI Generator
  - Swagger
  - swagger-codegen
  - openapi-generator
  - Codegen
  - TypeScript
  - Angular
language: en
header: logo_header.png
---

**In this article, we'll show how to use OpenAPI Generator to automatically generate Angular HTTP services from your OpenAPI spec.**

<hr>

## Why you need a code generator for your Angular API clients

Every Angular project that talks to a backend faces the same repetitive pain: writing boilerplate code to interact with REST endpoints. 
HTTP clients, models, DTOs, error handling, and keeping everything in sync when the API changes - it adds up fast and slows teams down.

Wouldn't it be great if all of that could be automated?

That's exactly what **API code generators** do. 
They take your OpenAPI specification and generate fully-typed, ready-to-use client code: consistently, reliably, and within seconds. 
No more hand-written HTTP services. 
No more copy-pasting types. 
No more drift between frontend and backend.

A few years ago, I wrote a popular article on [using Swagger Codegen to generate Angular clients](/blog/2018-04-swagger-codegen). 
Since then, the ecosystem has moved forward: **OpenAPI Generator** emerged as the actively maintained, community-driven successor to Swagger Codegen. 
It's more powerful, better supported, and trusted by companies and open-source projects around the world.

> 👉 In this revamped article, I'll show you how easy it is to generate a complete API client using OpenAPI Generator - and how to integrate it seamlessly into your Angular project.

## What you need

- A valid OpenAPI 2.0 or 3.x spec file (JSON/YAML) that describes your REST backend.
- Java 11+ or Docker installed (if you prefer not to install Java directly)


## Installation: Use the CLI wrapper for consistent builds

Theoretically, you could download the latest version of the code generator manually: 
just grab the `openapi-generator-cli.jar` from [Maven Central](https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/).

But in practice, I **highly recommend** using the official Node.js-based CLI wrapper instead.


```bash
npm install @openapitools/openapi-generator-cli --save-dev
```

This small package gives you a simple command-line tool: `openapi-generator-cli`.
Once installed, you can execute it via `npx openapi-generator-cli`.
It gives you the look and feel of all the other Node.js-based tooling you're already familiar with.

But more importantly, it installs a **specific version** of the generator and writes that information into the file `openapitools.json` inside your project.

Now, when you check your project into Git (including the file `openapitools.json`), your teammates (or the CI pipeline) will automatically use **the exact same version** when they run the CLI.


- This ensures **100% reproducible code generation** across your entire team.
- No "works on my machine" issues due to different generator versions.
- No unexpected diffs caused by subtle changes in templates or behavior.

That's exactly what we want for a clean and reliable workflow.

### Switching Code Generator Versions

To ensure consistent output across your team and avoid accidental diffs, it's a good idea to lock your project to a specific version of the OpenAPI Generator.
Suppose you want to lock your project to version `7.19.0`.
You can do this by running:

```bash
npx openapi-generator-cli version-manager set 7.19.0
```

This will:

1. Download the `openapi-generator-cli-7.19.0.jar` file into your `node_modules` folder – so it shouldn't be under version control, since typically the local NPM files are never checked in.
2. Record the version into the `openapitools.json` file.

To verify which version is currently active, run:

```bash
npx openapi-generator-cli version
```

This ensures that every team member uses exactly the same code generator version, even if newer versions are released later.
You can also use this mechanism to test new versions or roll back safely.


## Generating Your First Angular API Client

Before we take a look at the code, take a moment to explore [api1.angular-buch.com](https://api1.angular-buch.com/).

This public REST API is part of the **BookManager 1** demo application, the companion project for our new **Angular book** (in German language).
After four successful editions, we have rewritten the book from scratch – with modern syntax, compact and covering many new topics.
The new book will be released in **May 2026**. More info at [angular-buch.com](https://angular-buch.com).

To explore the API definition, simply open:

→ [OpenAPI Spec Viewer (Swagger UI)](https://api1.angular-buch.com/swagger-ui/)

This graphical interface is fully generated from the OpenAPI specification, located at:

→ `https://api1.angular-buch.com/openapi.json`

If this metadata is rich enough to render a complete admin UI, then it's clearly powerful enough to generate a fully functional Angular API client.


### Generate an Angular Client in One Line

To generate the client code, we'll now run the code generator against our OpenAPI specification.
This will produce fully-typed Angular services and interfaces based on the API definition.

We start with the most minimal setup:

```bash
npx openapi-generator-cli generate \
  -i https://api1.angular-buch.com/openapi.json \
  -g typescript-angular \
  -o ./src/app/shared/book-manager-api
```

**Hint:** 💡 On Windows (Command Prompt), remove the backslashes and write the command in a single line.


The following table explains each argument in detail:

| Parameter                   | Meaning                                                   |
| --------------------------- | --------------------------------------------------------- |
| `npx openapi-generator-cli` | Runs the OpenAPI Generator CLI (no global install needed) |
| `generate`                  | The command to run: generate code                         |
| `-i`                        | The URL or file path to the OpenAPI specification         |
| `-g`                        | The generator to use (here: `typescript-angular`)         |
| `-o`                        | The output directory for the generated code               |

These are the bare minimum arguments required.
With this, you'll get:

- Typed Angular services for each REST resource
- Models for all schemas (for example `book`, `author`, etc...)
- `HttpClient`-based methods for every endpoint

> 🛠️ Pro Tip: Place the output directory somewhere inside your app's structure, but outside of actual components or routing. We suggest a path like `src/app/shared/book-manager-api/`.


The CLI supports many more options.
To see all available configuration options for the `typescript-angular` generator, use the following command.

```bash
npx openapi-generator-cli config-help -g typescript-angular
```

This gives you a full list of tweakable settings – from service naming patterns to enum handling and many more.


## Set Up the Generated Code

To integrate the generated API client into your Angular application, register it using `provideApi()` inside your `app.config.ts`.

This setup is fully compatible with Angular's standalone application structure:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideApi } from './shared/book-manager-api';

export const appConfig: ApplicationConfig = {
  providers: [
    // [...]
    provideApi()
  ]
};
```


### Custom Base Path

If your API lives under a different domain or base path, you can pass a custom string.
This is very helpful if you have different domains or paths for different development stages.

```ts
provideApi('https://api1.angular-buch.com')
```

### Full Configuration

You can also pass a full configuration object to set credentials or headers:

```ts
provideApi({
  withCredentials: true,
  username: 'admin',
  password: 'secret'
})
```

### Dynamic Configuration (via Factory)

For dynamic configuration (e.g. based on an injected service), use Angular's `useFactory` syntax:

```ts
import { Configuration } from './shared/book-manager-api';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: Configuration,
      useFactory: () => {
        const authService = inject(AuthService);
        return new Configuration({
          basePath: 'https://api1.angular-buch.com',
          username: authService.getUsername(),
          password: authService.getPassword()
        });
      }
    }
  ]
};
```

In this example, `AuthService` is a custom service that you need to implement yourself. 
It provides dynamic values like username and password (or tokens) at runtime.
You can tailor it to your authentication needs: for example, it could return credentials from local storage or a login flow.


Alternatively, you can skip the configuration options entirely and use Angular HTTP interceptors to inject headers or handle authentication globally.
However, that approach is outside the scope of this article.

### Legacy Fallback: Still Using NgModules?

If your project hasn't migrated to standalone yet, you can still use the traditional approach by importing the generated `ApiModule`:

```ts
import { ApiModule } from './shared/book-manager-api';

@NgModule({
  imports: [ApiModule.forRoot(() => new Configuration())]
})
export class AppModule {}
```

That said, we highly recommend switching to `provideApi()` for all modern Angular projects.



## Integrating the generated service in your component

Once the API client is generated and configured, you can directly inject and use the provided services.
Here's a minimal example:

```ts
import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { BooksService } from './shared/book-manager-api';

@Component({
  selector: 'app-root',
  imports: [JsonPipe],
  template: `<pre>{{ books() | json }}</pre>`
})
export class App {

  #booksService = inject(BooksService);
  readonly books = toSignal(this.#booksService.booksGet())
}
```

This works out of the box because our prepared OpenAPI spec defines a `tag` named `books`.
The code generator automatically creates a `BooksService` for that group of endpoints.
A well-crafted and thoughtfully named OpenAPI spec is worth the effort: 
The more care you put into naming resources, operations, and tags, the better the generated service and method names will be. 
This investment pays off with clean, predictable, and developer-friendly TypeScript code that feels natural to use throughout your application.

In addition to services, the generator also provides all related models with full TypeScript typing.
In this example, the method `booksGet()` returns an `Observable<Book[]>`, using the interface `Book` that was also generated.

To fit modern Angular best practices, we use `toSignal()` to turn the Observable into a signal.
This modern pattern keeps your components fully reactive and simplifies state handling without a manual `subscribe()` call or the `async` pipe.


## Modern Data Loading with `rxResource()`

Angular 19 introduced a new reactive primitive: `rxResource()` (still marked as *experimental* as of Angular 21).
It's designed to simplify the way we work with asynchronous data streams, especially when fetching data from an API.

Instead of manual subscription handling or conversion to signals (via `toSignal()` for example), `rxResource()` wraps our observable-based data source into a signal-friendly API.
It automatically manages loading states, errors, and the latest value.
All this state is exposed as dedicated reactive signals.

This makes it a perfect companion for services generated with OpenAPI Generator.
Here's how we can use the generated `BooksService` together with the new `rxResource()`:

```ts
import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { BooksService } from './shared/book-manager-api';

@Component({
  selector: 'app-root',
  imports: [JsonPipe],
  template: `<pre>{{ booksResource.value() | json }}</pre>`
})
export class App {

  #booksService = inject(BooksService);

  readonly booksResource = rxResource({
    stream: () => this.#booksService.booksGet()
  });
}
```

The `rxResource()` primitive comes with several useful properties, all of which are Signals:

* **`value()`**: Returns the current data (or `undefined` if not yet available).
* **`isLoading()`**: Returns `true` while the request is in-flight.
* **`error()`**: Contains an `Error` object if the call failed, otherwise `null`.

This makes it very easy to build reactive apps:

```html
@if (booksResource.error()) {
  <p>❌ Failed to load books.</p>
}
@else if (booksResource.isLoading()) {
  <p>⏳ Loading books...</p>
}
@else {
  <pre>{{ booksResource.value() | json }}</pre>
}
```

This pattern results in highly declarative and clean code, perfectly aligned with Angular's new Signal-based approach.
**Learn more about the resource API in our dedicated article:
[Reactive Angular: Loading Data with the Resource API](/blog/2025-05-resource-api).**


## Conclusion

Congratulations! 🎉

You can now generate fully-typed Angular API clients with ease.
Ready to drop into any modern application.
No more manual wiring of HTTP calls. 
No more syncing models by hand. 
No more guesswork.

You've seen how to:

* install and lock the OpenAPI Generator for consistent output
* generate TypeScript code directly from your OpenAPI spec,
* set up the application using the `provideApi()` syntax,
* and consume your API with powerful Angular features like `toSignal()` and `rxResource()`.

With this setup, your API becomes a living contract, which automatically produces the client-side code you need.

Now go build something awesome. 🚀

<hr>

<small>Many thanks to Ferdinand Malcher for review and feedback.</small>

<small>**Cover image:** Official logo of the OpenAPI generator, with custom square patterns by Johannes</small>




## Related Articles

* 2018-04-12 - [Generating Angular API clients with Swagger](/blog/2018-04-swagger-codegen)
* 2018-06-08 - [Swagger Codegen is now OpenAPI Generator](/blog/2018-06-swagger-codegen-is-now-openapi-generator)
* 2018-06-10 - [Generating Angular API clients with Apollo and GraphQL code generator](/blog/2018-06-apollo-graphql-code-generator)


