---
title: "Generating Angular API clients with OpenAPI Generator"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2025-06-17
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
header: openapi-generator-banner-TODO.png
---

**In this article, we'll show how to use OpenAPI Generator to automatically generate Angular HTTP services from your OpenAPI spec.**

<hr>

## Why you need a code generator for your Angular API clients

Every Angular project that talks to a backend faces the same repetitive pain: writing boilerplate code to interact with REST endpoints. 
HTTP clients, models, DTOs, error handling, and keeping everything in sync when the API changes - it adds up fast and slows teams down.

Wouldn’t it be great if all of that could be automated?

That’s exactly what **API code generators** do. 
They take your OpenAPI specification and generate fully-typed, ready-to-use client code: consistently, reliably, and within seconds. 
No more hand-written HTTP services. 
No more copy-pasting types. 
No more drift between frontend and backend.

A few years ago, I wrote a popular article on [using Swagger Codegen to generate Angular clients](/blog/2018-04-swagger-codegen). 
Since then, the ecosystem has moved forward: **OpenAPI Generator** emerged as the actively maintained, community-driven successor to Swagger Codegen. 
It's more powerful, better supported, and trusted by companies and open-source projects around the world.

> 👉 In this updated article, I’ll show you how easy it is to generate a complete API client for Angular using OpenAPI Generator - and how to integrate it seamlessly into your Angular project.

**Let’s get started! 🚀**


## What you need

- A valid OpenAPI 2.0 or 3.x spec file (JSON/YAML) that describes your REST backend.
- Java 11+ installed, or Docker installed (if installing Java directly is not an option)


## Installation: Use the CLI wrapper for consistent builds

Theoretically, you could download the latest version of the code generator manually: 
just grab the `openapi-generator-cli.jar` from [Maven Central](https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/).

But in practice, I **highly recommend** using the official node.js-based CLI wrapper instead.

```bash
npm install @openapitools/openapi-generator-cli --save-dev
```

This small package gives you a simple command-line tool: `openapi-generator-cli`.
Once installed, you can execute it via `npx openapi-generator-cli`.
It gives you the look and feel of all the other node.js based tooling that you are already used to.
But more importantly, it installs a **specific version** of the generator and writes that information into the file `openapitools.json` inside your project.

Now, when you check your project into Git (including the file `openapitools.json`), your teammates - or the CI pipeline - will automatically use **the exact same version** when they run the CLI.

- This ensures **100% reproducible code generation** across your entire team.
- No "works on my machine" issues due to different generator versions.
- No unexpected diffs caused by subtle changes in templates or behavior.

That’s exactly what we want for a clean and reliable workflow.

### Switching Code Generator Versions

Let’s say you want to lock your project to version `7.13.0`. 
You can do this by running:

```bash
npx openapi-generator-cli version-manager set 7.13.0
```

This will:

1. Download the `openapi-generator-cli-7.13.0.jar` file into your `node_modules` folder – so it shouldn't be under version control, since typically the local NPM files are never checked in.
2. Record the version into the `openapitools.json` file.

To verify which version is currently active, run:

```bash
npx openapi-generator-cli version
```

This ensures that every team member uses exactly the same code generator version, even if newer versions are released later.
You can also use this mechanism to test new versions or roll back safely.

Here's the next chapter, as requested — with a clear explanation, strong motivation, and helpful technical details:



## Let’s Generate Our First Angular API Client

Before we dive into code, take a moment to explore [https://api6.angular-buch.com/](api6.angular-buch.com).
This public REST API is part of the **BookMonkey 6** demo application - the updated companion project for the upcoming **5th edition** of our German-language Angular book.

> 📘 Save the date!
> The new edition is scheduled for **early 2026**.
> Follow us on [angular.schule](https://www.angular.schule/) and our social media channels for updates!

To explore the API definition, simply open:

→ [OpenAPI Spec Viewer (Swagger UI)](https://api6.angular-buch.com/swagger-ui/)

This graphical interface is fully generated from the OpenAPI specification, located at:

→ `https://api6.angular-buch.com/openapi.json`

If this metadata is rich enough to render a complete admin UI, then it's clearly powerful enough to generate a fully functional Angular API client.
Let’s do that now!

### Generate an Angular Client in One Line

We start with the most minimal setup:

```bash
npx openapi-generator-cli generate \
  -i https://api6.angular-buch.com/openapi.json \
  -g typescript-angular \
  -o ./src/app/shared/book-monkey-api
```

**Hint:** 

Let’s break this down:

| Parameter                   | Meaning                                                   |
| --------------------------- | --------------------------------------------------------- |
| `npx openapi-generator-cli` | Runs the OpenAPI Generator CLI (no global install needed) |
| `generate`                  | The command to run: generate code                         |
| `-i`                        | The URL or file path to the OpenAPI specification         |
| `-g`                        | The generator to use (here: `typescript-angular`)         |
| `-o`                        | The output directory for the generated code               |

These are the bare minimum arguments required arguments. 
With this, you'll get:

- Typed Angular services for each REST resource
- A full NgModule (`ApiModule`)
- Models for all schemas (e.g. `book`, `author`, etc...)
- `HttpClient`-based methods for every endpoint

> 🛠️ Pro Tip: Place the output directory somewhere inside your app’s structure, but outside of actual components or routing - we suggest a path like `src/app/shared/book-monkey-api/`.

The CLI supports many more options.
To see all available configuration options for the `typescript-angular` generator:

```bash
npx openapi-generator-cli config-help -g typescript-angular
```

This gives you a full list of tweakable settings — from service naming patterns to enum handling and many more.

The following table contains the formatted output of the help command.
Each option can be passed via `--additional-properties=...` or configured via an external config file (e.g. `openapitools.json`).

| Option                            | Description |
|-----------------------------------|-------------|
| `allowUnicodeIdentifiers`         | Allow Unicode in names. Default: `false`. |
| `apiModulePrefix`                 | Prefix for the generated `ApiModule`. |
| `configurationPrefix`            | Prefix for the generated `Configuration`. |
| `disallowAdditionalPropertiesIfNotPresent` | Controls handling of `additionalProperties`. Default: `true`. |
| `ensureUniqueParams`             | Renames parameters to avoid duplicates. Default: `true`. |
| `enumNameSuffix`                 | Suffix for enum names. Default: `Enum`. |
| `enumPropertyNaming`             | Naming for enum props: `camelCase`, `PascalCase`, `snake_case`, `UPPERCASE`, `original`. Default: `PascalCase`. |
| `enumPropertyNamingReplaceSpecialChar` | Replace `+`/`-` in enum strings. Default: `false`. |
| `enumUnknownDefaultCase`         | Adds fallback case `unknown_default_open_api` to all enums. Default: `false`. |
| `fileNaming`                     | File naming convention: `camelCase` or `kebab-case`. Default: `camelCase`. |
| `legacyDiscriminatorBehavior`    | Enable legacy discriminator behavior. Default: `true`. |
| `licenseName`                    | License name in package metadata. Default: `Unlicense`. |
| `modelFileSuffix`                | File suffix for model files. |
| `modelPropertyNaming`            | Property naming for models: `camelCase`, `PascalCase`, `snake_case`, `original`. Default: `original`. |
| `modelSuffix`                    | Suffix for model class names. |
| `ngPackagrVersion`               | Version of `ng-packagr` to use. |
| `ngVersion`                      | Angular version compatibility. Default: `19.0.0`. |
| `npmName`                        | Required: name of the npm package. |
| `npmRepository`                  | URL for a private npm repository (for `publishConfig`). |
| `npmVersion`                     | Version of the npm package. Default: `1.0.0`. |
| `nullSafeAdditionalProps`       | Indexers for `additionalProperties` return `undefined`. Default: `false`. |
| `paramNaming`                    | Parameter naming: `camelCase`, `PascalCase`, `snake_case`, `original`. Default: `camelCase`. |
| `prependFormOrBodyParameters`    | Put body/form params first. Default: `false`. |
| `providedIn`                     | Injection scope: `root`, `none`, `any`, `platform`. Default: `root`. |
| `queryParamObjectFormat`         | Format for query object: `dot`, `json`, `key`. Default: `dot`. |
| `rxjsVersion`                    | Compatible RxJS version. |
| `serviceFileSuffix`              | File suffix for service files. Default: `.service`. |
| `serviceSuffix`                  | Suffix for service class names. Default: `Service`. |
| `snapshot`                       | Adds timestamp to version (e.g. `1.0.0-SNAPSHOT.20250615`). Default: `false`. |
| `sortModelPropertiesByRequiredFlag` | Required model props come first. Default: `true`. |
| `sortParamsByRequiredFlag`       | Required method args come first. Default: `true`. |
| `stringEnums`                    | Use TypeScript string enums. Default: `false`. |
| `supportsES6`                    | Use ES6-compatible syntax. Default: `false`. |
| `taggedUnions`                   | Use tagged unions via discriminators. Default: `false`. |
| `tsVersion`                      | Compatible TypeScript version. |
| `useSingleRequestParameter`      | Group all method parameters into a single object. Default: `false`. |
| `useSquareBracketsInArrayNames`  | Append `[]` to array param names. Default: `false`. |
| `withInterfaces`                 | Generate interfaces alongside classes. Default: `false`. |
| `zonejsVersion`                  | Compatible version of `zone.js`. |


In the next section, we’ll explore how to build and integrate this code into your Angular project.


## Using the Generated Code

To integrate the generated API client into your Angular application, simply register the client using `provideApi()` inside your `app.config.ts`. 
This setup is fully compatible with Angular’s standalone application structure:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideApi } from './shared/book-monkey-api';

export const appConfig: ApplicationConfig = {
  providers: [
    // [...]
    provideHttpClient(),
    provideApi()
  ]
};
```

Don't forget to include `provideHttpClient()`.
It registers Angular's HttpClient for injection.
This is required, because the generated client uses HttpClient internally for every request.

> **IMPORTANT:** The `provideApi()` function is currently only available in the latest snapshot builds of OpenAPI Generator. 
  It will become officially available with version **7.14.0**.

<!-- see: https://raw.githubusercontent.com/jase88/openapi-generator/907ac1297454541107bc5e02442567eae3adee2b/modules/openapi-generator/src/main/resources/typescript-angular/README.mustache -->


### Custom Base Path

If your API lives under a different domain or base path, you can pass a custom string:

```ts
provideApi('https://api6.angular-buch.com')
```

This is very helpful if you have different domains or paths for different development stages.

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
import { provideApi, Configuration } from './shared/book-monkey-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    {
      provide: Configuration,
      useFactory: (authService: AuthService) =>
        new Configuration({
          basePath: 'https://api6.angular-buch.com',
          username: authService.getUsername(),
          password: authService.getPassword()
        }),
      deps: [AuthService]
    }
  ]
};
```

In this example, `AuthService` is a custom service that you need to implement yourself. 
It provides dynamic values like username and password (or tokens) at runtime.
You can tailor it to your authentication needs—for example, to return credentials from local storage or a login flow.

Alternatively, you can skip the configuration options entirely and use Angular HTTP interceptors to inject headers or handle authentication globally.
However, that approach is outside the scope of this article.

### Legacy Fallback: Still Using AppModule?

If you haven't migrated to standalone yet, you can still use the `ApiModule` approach:

```ts
import { ApiModule } from './shared/book-monkey-api';

@NgModule({
  imports: [ApiModule.forRoot(() => new Configuration())]
})
export class AppModule {}
```

But we highly recommend the new `provideApi()` method for all modern Angular projects.


### Using the stable API until the next release

If you feel uncomfortable relying on a snapshot version, you can use the current stable API until version `7.14.0` is released:

```ts
importProvidersFrom(
  ApiModule.forRoot(() =>
    new Configuration({
      basePath: 'https://api6.angular-buch.com' 
    })
  )
)
```

This approach works reliably and only requires a one-time configuration in your `app.config.ts`.
It can easily be replaced later on by `provideApi()`.








## Related Articles

* 2018-04-12 - [Generating Angular API clients with Swagger](/blog/2018-04-swagger-codegen)
* 2018-06-08 - [Swagger Codegen is now OpenAPI Generator](/blog/2018-06-swagger-codegen-is-now-openapi-generator)
* 2018-06-10 - [Generating Angular API clients with Apollo and GraphQL code generator](/blog/2018-06-apollo-graphql-code-generator)


