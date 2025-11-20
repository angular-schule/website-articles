---
title: 'Angular 21 is here!'
author: Angular Book Team
mail: team@angular-buch.com
published: 2025-11-20
lastModified: 2025-11-20
keywords:
  - Angular
  - Angular 21
  - MCP-Server
  - ARIA
  - Zoneless
  - Signal Forms
  - Vitest
  - Karma
language: en
header: angular21.jpg
sticky: true
---

<!-- Before we dive into the usual end-of-year rush, there is news from the Angular world: -->
On **November 19, 2025**, **Angular 21** was released!
The most important updates: Signal Forms, zoneless apps, testing with Vitest, the new package `@angular/aria`, and more support for AI assistants.

As always, you can find the official release information in the [Angular Blog](https://blog.angular.dev/announcing-angular-v21-57946c34f14b).
You can migrate an existing project to Angular 21 using the command `ng update`.
Detailed information about the steps is available in the [Angular Update Guide](https://angular.dev/update-guide).

> 🇩🇪 This article is available in German language here: [Angular 21 ist da!](https://angular-buch.com/blog/2025-11-angular21)


## Versions of TypeScript and Node.js

The following versions of TypeScript and Node.js are required for Angular 21:

- TypeScript: >=5.9.0 <6.0.0
- Node.js: ^20.19.0 || ^22.12.0 || ^24.0.0

You can find detailed information about supported versions in the [Angular documentation](https://angular.dev/reference/versions).

## Zoneless change detection: the new default

Angular has supported zoneless change detection for some time.
In the past, the library Zone.js was used to detect changes to data.
With signals as the new foundation, the approach has changed significantly: Signals explicitly announce when a value has changed.
<!-- We covered this in detail in the [blog post about Angular 18](/blog/2024-05-angular18). -->

Now there is great news about this topic: Zoneless change detection is the new default!
New applications created with Angular 21 use the new mechanism by default.
When creating an application with `ng new`, we no longer need the `--zoneless` option.
It is also no longer necessary to call the function `provideZonelessChangeDetection()` in `app.config.ts`.

If you still want to use the old Zone.js-based implementation for compatibility reasons, you can configure change detection in `app.config.ts`.
Additionally, Zone.js must be installed and listed under `polyfills` in `angular.json` – just like it was in all applications in the past.

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    // enable the LEGACY change detection with Zone.js
    provideZoneChangeDetection({ eventCoalescing: true }),
};
```



## Signal Forms

The current approaches for form handling in Angular are not designed to work well with signals.
Now a new experimental approach has been introduced: *Signal Forms*.
This variant not only integrates signals extensively, but also aims to simplify how forms are created and managed.

The basic idea: The data lives inside a simple signal that we control.
Angular derives the structure of the form from the data.
The validation rules are defined as a schema, written directly in code.

```ts
import { schema, form, Field } from '@angular/forms/signals';

export const bookFormSchema = schema<Book>(fieldPath => {
  required(fieldPath.isbn);
  minLength(fieldPath.isbn, 10);
  maxLength(fieldPath.isbn, 13);
  required(fieldPath.title);
});

@Component({
  // ...
  imports: [Field]
})
export class MyForm {
  protected readonly bookData = signal<Book>({
    isbn: '',
    title: ''
  });

  protected readonly bookForm = form(this.bookData, bookFormSchema);
}
```

In the template, we create the data bindings using a single directive:

```html
<form>
  <input [field]="bookForm.isbn" />
  <input [field]="bookForm.title" />
</form>
```

We have published detailed blog posts on Signal Forms:

* [**Part 1: Getting Started with the Basics**](https://angular-buch.com/blog/2025-10-signal-forms-part1)
* [**Part 2: Advanced Validation and Schema Patterns**](https://angular-buch.com/blog/2025-10-signal-forms-part2)
* [**Part 3: Child Forms and Custom UI Controls**](https://angular-buch.com/blog/2025-10-signal-forms-part3)

In the long run, this new approach may replace the older variants *Reactive Forms* and *Template-Driven Forms*.
The Angular team also places great emphasis on backward compatibility, so migrating to a signal-based form should not be a major problem.
However, the new approach is still experimental, meaning that the interfaces and concepts are subject to change.


## Vitest: the new test runner

Angular 21 brings one of the biggest changes in testing we've seen in years:
[Vitest](https://vitest.dev) "officially" replaces Karma and Jasmine as the standard test runner.
Vitest was already introduced as an experimental test runner in [Angular 20 (May 2025)](https://angular-buch.com/blog/2025-05-angular20#experimenteller-test-builder-f%C3%BCr-vitest).
With Angular 21, Vitest is now officially stable and no longer marked as experimental.

Vitest then became the default for new projects with `ng new`.
So for new projects, the path clearly leads to Vitest, but you can still choose Karma/Jasmine if you prefer:

```bash
# Create a project with Vitest as the test runner
ng new my-project

# Create a project with Karma as the test runner
ng new my-project --test-runner=karma
```

Vitest offers significant advantages: much faster test execution, modern APIs, a Jest-like expect syntax, flexible fake timers, and even a real browser mode if needed.
The browser mode works similarly to how it did under Karma and is ideal for realistic UI tests.
Most specs should continue to work unchanged, because Angular's `TestBed` and `ComponentFixture` remain exactly the same.
The main changes are to Jasmine-specific matchers or spies.

The actual migration starts by using the new `unit-test` builder in `angular.json`.
After that, you can use an experimental schematic for existing tests that automatically transfers many Jasmine patterns to Vitest:

```bash
ng g @schematics/angular:refactor-jasmine-vitest
```

At the same time, the Angular team has marked support for the test runners Jest and Web Test Runner as **deprecated**.
We have put together a detailed migration guide, including practical examples for fake timers, matchers, and async/await:

* **[Vitest in Angular 21: What's new and how to migrate?](/blog/2025-11-migrate-to-vitest)**



## @angular/aria: accessible components made easy

With Angular 21, the new package [`@angular/aria`](https://angular.dev/guide/aria/overview) was introduced: a collection of directives that implement common [WAI-ARIA patterns](https://www.w3.org/WAI/ARIA/apg/patterns/).
The package handles the complex work of accessibility, especially for more complex, frequently used patterns that go beyond standard HTML elements.
Keyboard interactions, ARIA attributes, focus management, and screen reader support are all taken into account under the hood of the directives.

You install the new package as usual via the Angular CLI:

```bash
ng add @angular/aria
```

In its first version, `@angular/aria` provides directives for the following interactive patterns:

| Component        | Description                                                                      |
| ---------------- | -------------------------------------------------------------------------------- |
| **Accordion**    | Expandable sections (accordion), which can be opened individually or exclusively |
| **Autocomplete** | Text input with filtered suggestions while typing                                |
| **Combobox**     | Combination of text input and popup with search results                          |
| **Grid**         | Two-dimensional data display with cell-by-cell keyboard navigation               |
| **Listbox**      | Single or multi-select option lists with keyboard navigation                     |
| **Menu**         | Dropdown menus with nested submenus and keyboard shortcuts                       |
| **Multiselect**  | Multi-select dropdown pattern with compact display                               |
| **Select**       | Single-select dropdown pattern with keyboard navigation                          |
| **Tabs**         | Tab interfaces with automatic or manual activation modes                         |
| **Toolbar**      | Grouped controls with logical keyboard navigation                                |
| **Tree**         | Hierarchical lists with expand/collapse functionality                            |

The new package is especially useful when developing complex components and when existing accessible component libraries cannot be used, for example because their styling cannot be adapted.
The directives do not involve any visual elements, but ensure consistent behavior as well as barrier-free keyboard navigation, focus handling, and screen reader optimization.

You can find more information about the new directives in the Angular documentation: [Angular Aria Guide](https://angular.dev/guide/aria/overview)

> Some of these building blocks previously existed in similar form in the [Component Development Kit (CDK)](https://material.angular.dev/cdk/dialog/overview) of Angular. The CDK was the foundation of the Angular Material component library.
> With `@angular/aria`, the Angular team brings the core of this collection closer to the Angular platform and strengthens the focus on accessibility.


## Providers for `HttpClient`

With Angular 21, the providers for `HttpClient` are included automatically.
This means it is no longer necessary to call the function `provideHttpClient()` in the file `app.config.ts`.

If we want to configure the HTTP integration, for example by adding interceptors or using the function `withFetch()`, we still need to call the function:

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    provideHttpClient(
      withFetch(),
      withInterceptors([ /* ... */ ])
    )
  ]
};
```

## Angular's support for AI assistants

When creating a new application (`ng new`), the interactive prompt now asks whether you want to generate a config file for a specific AI tool (command-line option `--ai-config`).
This creates a file that is automatically read as a _custom prompt_ by AI assistants such as Claude Code, GitHub Copilot, Cursor, and many others, supplying them with up-to-date Angular best practices:

```bash
? Which AI tools do you want to configure with Angular best practices? https://angular.dev/ai/develop-with-ai
 ◉ None
 ◯ Agents.md      [ https://agents.md/                                               ]
❯◯ Claude         [ https://docs.anthropic.com/en/docs/claude-code/memory            ]
 ◯ Cursor         [ https://docs.cursor.com/en/context/rules                         ]
 ◯ Gemini         [ https://ai.google.dev/gemini-api/docs                            ]
 ◯ GitHub Copilot [ https://code.visualstudio.com/docs/copilot/copilot-customization ]
 ◯ JetBrains AI   [ https://www.jetbrains.com/help/junie/customize-guidelines.html   ]

↑↓ navigate • space select • a all • i invert • ⏎ submit
```

Depending on the selected tool, the file name and location differ, for example `.claude/CLAUDE.md` for Claude, `.gemini/GEMINI.md` for Gemini, or `AGENTS.md` following the [new standard](https://agents.md/), optionally with a frontmatter header.
The actual content with Angular best practices remains identical.

There are, however, challenges: custom prompts are often forgotten during long sessions, and the limited context window can lead to inconsistent results.
To address this issue, Angular additionally offers its own MCP server, which is now stable with Angular 21.
The server gives AI agents structured access to seven tools.
This closes the "knowledge gap" between the trained model and current best practices:
LLMs can use brand-new features such as Signal Forms and Angular Aria, even though these did not exist at training time.

The MCP server currently provides seven tools:

1. Learn Angular with an interactive AI tutor (`ai_tutor`). See the documentation under ["Angular AI Tutor"](https://angular.dev/ai/ai-tutor).
2. Find modern Angular pattern examples (`find_examples`).
3. Provide best practices (`get_best_practices`).
4. List all projects in the workspace (`list_projects`).
5. Migrate the application to zoneless change detection (`onpush_zoneless_migration`).
6. Search the documentation (`search_documentation`).
7. Perform code migrations with schematics (`modernize`, **experimental**).

<!-- More details about `AGENTS.md`, MCP, and practical experience can be found in our detailed article about [Vibe Coding with Angular](/blog/2025-11-ai-mcp-vibe-coding). -->


## Migration scripts

It is no longer recommended to use the `ngClass` directive.
<!-- We already wrote about this one year ago [in a blog post](https://angular.schule/blog/2024-11-ngclass-ngstyle). -->
To migrate to direct class bindings with `[class]`, Angular provides a migration script:

```bash
ng generate @angular/core:ngclass-to-class
```

The `RouterTestingModule` for unit tests is also no longer supported.
A migration script can update the tests to the newer `provideRouterTesting()`, see the [commit](https://github.com/angular/angular/commit/861cee34e0e9b5562cfe70d245f30b7ddea7d8fd).

```bash
ng generate @angular/core:router-testing-module-migration
```

## Other updates

You can always find all the details about new features in the changelogs of [Angular](https://github.com/angular/angular/releases) and the [Angular CLI](https://github.com/angular/angular-cli/releases).
We have collected some interesting highlights here:

* **Bindings for ARIA attributes:** Until now, we always had to use an attribute binding for ARIA attributes: `[attr.aria-label]="myLabel"`. These attributes can now be bound directly: `[aria-label]="myLabel"`.
* **Regular expressions in templates:** Angular now supports regular expressions directly in templates (see [PR](https://github.com/angular/angular/pull/63857)).
* **Tailwind support for `ng new`:** Angular has supported TailwindCSS for a while. Now the framework can also be configured directly when creating a new application: `ng new --style=tailwind` (see [commit](https://github.com/angular/angular-cli/commit/4912f39906b11a3212f11d5a00d577e2a0bacab4)).

<hr>

We wish you lots of fun developing with Angular 21!
Do you have questions about the new version of Angular or about our book? Write to us!

**Have fun!
Ferdinand, Danny and Johannes**

<hr>

<small>**Cover image:** Tre Cime di Lavaredo, Dolomites, Italy. Photo by Ferdinand Malcher</small>
