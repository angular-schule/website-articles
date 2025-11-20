---
title: 'Angular 20 is here!'
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

Before we dive into the usual end-of-year rush, there is news from the Angular world:
On **November 19, 2025**, **Angular 21** was released!
The most important updates: Signal Forms, zoneless apps, testing with Vitest, and the new package `@angular/aria`.

As always, you can find the official release information in the [Angular Blog](https://blog.angular.dev/announcing-angular-v21-57946c34f14b).
You can migrate an existing project to Angular 21 using the command `ng update`.
Detailed information about the steps is available in the [Angular Update Guide](https://angular.dev/update-guide).


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
    // ENABLE the legacy change detection with Zone.js
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
Most specs should continue to work unchanged, because Angular’s `TestBed` and `ComponentFixture` remain exactly the same.
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
The package handles the complex work of accessibility, especially for more complex, frequently used patterns that go beyond standard HTML elements.s.
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


## Providers für `HttpClient`

Mit Angular 21 werden die Providers für den `HttpClient` automatisch eingebunden.
Es ist also nicht mehr zwingend notwendig, in der `app.config.ts` die Funktion `provideHttpClient()` aufzurufen.

Wollen wir die HTTP-Integration konfigurieren, z. B. mit Interceptors oder der Funktion `withFetch()`, müssen wir die Funktion allerdings weiterhin verwenden:

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

## Angulars Unterstützung für AI-Assistenten

Beim Anlegen einer neuen Anwendung (`ng new`) fragt der interaktive Prompt jetzt nach, ob du eine Config für ein bestimmtes KI-Werkzeug generieren möchtest (Kommandozeilenoption `--ai-config`). 
Dadurch wird eine Datei erzeugt, die als _Custom Prompt_ automatisch in AI-Assistenten wie Claude Code, GitHub Copilot, Cursor und vielen weiteren eingelesen wird und diese mit aktuellen Angular Best Practices versorgt:

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

Je nach ausgewähltem Tool variiert der Dateiname und der Speicherort, etwa `.claude/CLAUDE.md` für Claude, `.gemini/GEMINI.md` für Gemini oder `AGENTS.md` nach dem [neuen Standard](https://agents.md/) sowie optional ein Frontmatter.
Der eigentliche Inhalt mit den Angular Best Practices bleibt identisch.

Allerdings gibt es auch Herausforderungen: Custom Prompts werden bei längeren Sessions häufig vergessen, und das begrenzte Kontextfenster führt zu inkonsistenten Ergebnissen.
Um dieses Problem besser zu beherrschen, bietet Angular zusätzlich einen eigenen MCP-Server an, der mit Angular 21 nun stabil ist. 
Der Server ermöglicht AI-Agenten strukturierten Zugriff auf sieben Tools.
Damit wird die "Wissenslücke" zwischen dem trainierten Modell und den aktuellen Best Practices geschlossen: 
LLMs können so auch brandneue Features wie Signal Forms und Angular Aria nutzen, obwohl sie zum Zeitpunkt des Trainings noch nicht existierten.

Der MCP-Server bietet aktuell sieben Tools an:

1. Mit einem interaktiven KI-Tutor Angular kennenlernen (`ai_tutor`). Siehe auch die Dokumentation unter ["Angular AI Tutor"](https://angular.dev/ai/ai-tutor).
2. Moderne Angular-Pattern-Beispiele finden (`find_examples`).
3. Best Practices bereitstellen (`get_best_practices`).
4. Alle Projekte im Workspace auflisten (`list_projects`).
5. Die Anwendung auf Zoneless Change Detection migrieren (`onpush_zoneless_migration`).
6. Die Dokumentation durchsuchen (`search_documentation`).
7. Code-Migrationen mit Schematics durchführen (`modernize`, **experimentell**).

<!-- Mehr Details zu `AGENTS.md`, MCP und praktischen Erfahrungen findest du in unserem ausführlichen Artikel über [Vibe-Coding mit Angular](/blog/2025-11-ai-mcp-vibe-coding). -->


## Migrationsskripte

Es wird nicht mehr empfohlen, die Direktive `ngClass` zu verwenden. 
Wir haben darüber schon vor einem Jahr [in einem Blogpost berichtet](https://angular.schule/blog/2024-11-ngclass-ngstyle).
Zur Umstellung auf direkte Class Bindings mit `[class]` bietet Angular ein Migrationsskript an:

```bash
ng generate @angular/core:ngclass-to-class
```

Das `RouterTestingModule` für Unit-Tests wird ebenfalls nicht mehr unterstützt.
Ein Migrationsskript kann die Tests auf das neuere `provideRouterTesting()` umstellen, siehe [Commit](https://github.com/angular/angular/commit/861cee34e0e9b5562cfe70d245f30b7ddea7d8fd).

```bash
ng generate @angular/core:router-testing-module-migration
```


## Sonstiges

Alle Details zu den Neuerungen findest du immer im Changelog von [Angular](https://github.com/angular/angular/releases) und der [Angular CLI](https://github.com/angular/angular-cli/releases).
Einige interessante Aspekte haben wir hier zusammengetragen:

- **Bindings für ARIA-Attribute:** Bisher mussten wir für ARIA-Attribute immer ein Attribute Binding verwenden: `[attr.aria-label]="myLabel"`. Die Attribute können nun auch direkt gebunden werden: `[aria-label]="myLabel"`.
- **Reguläre Ausdrücke in Templates:** Angular unterstützt jetzt reguläre Ausdrücke direkt in Templates (siehe [PR](https://github.com/angular/angular/pull/63857)).
- **Tailwind-Support für `ng new`:** Angular unterstützt schon länger direkt TailwindCSS. Nun kann das Framework auch direkt beim Anlegen einer Anwendung konfiguriert werden: `ng new --style=tailwind` (siehe [Commit](https://github.com/angular/angular-cli/commit/4912f39906b11a3212f11d5a00d577e2a0bacab4)).

<hr>


Wir wünschen dir viel Spaß beim Entwickeln mit Angular 21!
Hast du Fragen zur neuen Version von Angular oder zu unserem Buch? Schreibe uns!

**Viel Spaß wünschen
Ferdinand, Danny und Johannes**

<hr>

<small>**Titelbild:** Drei Zinnen, Dolomiten, Italien. Foto von Ferdinand Malcher</small>
