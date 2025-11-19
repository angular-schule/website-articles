---
title: "Vitest in Angular 21: What's new and how to migrate?"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2025-11-18
lastModified: 2025-11-18
keywords:
  - Angular
  - Angular 21
  - Vitest
  - Karma
  - Jasmine
language: en
header: angular-vitest.jpg
---

Angular 21 introduces a significant change to unit testing:
Vitest is now the default, replacing the previous standard combination of Karma and Jasmine.
When creating a new project with `ng new`, Angular 21 now uses **Vitest** as the default test runner.
Vitest promises significantly faster startup times, modern features, and an easy-to-use Jest-compatible API.
In this article, we'll show you what Vitest means for you, how to migrate existing Angular projects, and what benefits Vitest offers.

## Inhalt

TODO






















## Why Angular replaces Karma and Jasmine

Karma and Jasmine served Angular well for many years, primarily because they ran in a real browser.
However, there were disadvantages: the execution speed was never optimal and the ecosystem became outdated ([Karma has been deprecated since 2023](https://github.com/karma-runner/karma#karma-is-deprecated-and-is-not-accepting-new-features-or-general-bug-fixes)).
Over several years, the Angular team evaluated alternatives (Jest, Web Test Runner, etc.) without finding a clear winner.
[Vitest](https://vitest.dev/) has since become quite popular and proved to be a suitable solution.

Vitest was particularly well-suited because it offers a real browser mode.
As with Karma before, tests can be run in a real browser with a "real" DOM and real events.
The browser mode was recently [declared stable](https://vitest.dev/blog/vitest-4.html#browser-mode-is-stable) with Vitest 4 in October 2025.
At the same time, Vitest is fast and modern: it is built on [Vite](https://vite.dev/), is ESM- and TypeScript-first, and ensures extremely short start-up and repetition times.
Additionally, Vitest provides a powerful API with snapshot testing, flexible [fake timers](https://vitest.dev/guide/mocking/timers.html), the extremely helpful helper [`expect.poll`](https://vitest.dev/api/expect.html#poll), [test fixtures](https://vitest.dev/guide/test-context), and Jest-compatible matchers.
Last but not least, Vitest is widely adopted across the frontend ecosystem, allowing existing knowledge to transfer easily.
In short: Switching ensures speed, a significantly better developer experience, and future-proofing, while still allowing real browser testing.


## Migration guide: From Karma/Jasmine to Vitest

<!-- Source: https://github.com/angular/angular/blob/6178e3ebfbc69a2afa04dd19ea4d6d8b1bfb0649/adev/src/content/guide/testing/migrating-to-vitest.md -->

If you want to create a **new project** with Angular 21, the Angular CLI uses the new test runner Vitest by default.
You can control this choice using the `--test-runner` option:
With `--test-runner=vitest` you get the new, faster, and more modern default solution.
If you want to keep the proven Karma/Jasmine combination, use the option `--test-runner=karma`.
If you do not specify the option, Vitest is used automatically.

To migrate an **existing project** to Angular 21 and Vitest, you must first update the project to version 21 using `ng update`.
Note that migrating existing projects to Vitest is currently still **experimental**.
This process also requires Angular’s `application` build system, which is enabled by default in newly created projects.
Once your project has been updated to version 21, you can continue with the following steps.


### Manual migration steps

Before you use the automatic refactoring schematic, you need to adjust your project manually so that Vitest is used as the test runner.

#### 1. Install dependencies

Install `vitest` and a DOM emulation library.
Although tests can still run in the browser (see step 5), Vitest uses a DOM emulation by default to simulate a browser environment in Node.js and to execute tests faster.
The CLI automatically detects `happy-dom` if it is installed; otherwise it falls back to `jsdom`.
One of these two packages must be present.


```bash
npm install --save-dev vitest jsdom
```

#### 2. Update `angular.json`

Find the `test` target of your project in the `angular.json` file and set the `builder` to `@angular/build:unit-test`.

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test"
        }
      }
    }
  }
}
```

The `unit-test` builder uses `"tsConfig": "tsconfig.spec.json"` and `"buildTarget": "::development"` by default.
If your project needs different values, you can create your own build configuration. This is useful when the `development` configuration is missing or when you need special test settings, for example a configuration named `testing`.

The previous builder `@angular/build:karma` allowed you to define build options (such as `polyfills`, `assets`, `styles`) directly in the `test` target. The new builder `@angular/build:unit-test` does not support this.
If your test build options differ from the `development` configuration, you must move these options into a separate build configuration.
If they already match `development`, no further step is necessary.

> **Tip:** As an alternative, you can simply create a new project using `ng new` and copy the relevant parts of the newly generated `angular.json` into your existing project.
> This gives you a clean template for the Vitest configuration automatically.


#### 3. Adopt a custom `karma.conf.js` configuration

Custom settings in `karma.conf.js` file are not migrated automatically.
Check this file before deleting it, and transfer the relevant options manually.
Many Karma options have Vitest equivalents that you can define in a `vitest.config.ts` and then include through `runnerConfig` in the `angular.json`.

Typical migration paths:

* **Reporters:** Karma reporters must be replaced with Vitest-compatible reporters. Many of them can be configured directly in `angular.json` under `test.options.reporters`. For more complex cases, use `vitest.config.ts`.
* **Plugins:** Karma plugins require suitable Vitest alternatives. Note that code coverage is already integrated in the Angular CLI and can be enabled with `ng test --coverage`.
* **Custom browser launchers:** These are replaced by the `browsers` option in `angular.json` and by installing a browser provider such as `@vitest/browser-playwright`.

You can find more settings in the official [Vitest documentation](https://vitest.dev/config/).

#### 4. Remove Karma and `test.ts` files

You can now delete the files `karma.conf.js` and `src/test.ts` and uninstall all Karma-related packages.
The following commands matches a standard Angular project.
Your project may contain additional packages.


```bash
npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter
```

#### 5. Configure browser mode (optional)

If you want to run tests in a real browser, you must install a browser provider and adjust the `angular.json`.
Choose depending on your needs:

* **Playwright:** `@vitest/browser-playwright` for Chromium, Firefox, and WebKit
* **WebdriverIO:** `@vitest/browser-webdriverio` for Chrome, Firefox, Safari, and Edge
* **Preview:** `@vitest/browser-preview` for WebContainer environments like StackBlitz

```bash
npm install --save-dev @vitest/browser-playwright
```

After that, you must extend the `angular.json`.
Add the `browsers` option to the `test` target.
The browser name depends on the provider you use (for example `chromium` for Playwright).

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "browsers": ["chromium"]
          }
        }
      }
    }
  }
}
```

Der Headless‑Modus wird automatisch aktiviert, wenn die Umgebungsvariable `CI` gesetzt ist oder der Browsername "Headless" enthält (z. B. `ChromeHeadless`). 
Andernfalls läuft der Browser sichtbar.

### Automatic test refactoring using the schematic

The Angular CLI provides a schematic that automatically converts your Jasmine tests to Vitest.

**IMPORTANT:** The `refactor-jasmine-vitest` schematic is experimental and does not cover all patterns.
Always review the changes manually.

#### 1. Overview

The schematic currently performs the following transformations in the `.spec.ts` files:

* `fit`/`fdescribe` → `it.only`/`describe.only`
* `xit`/`xdescribe` → `it.skip`/`describe.skip`
* `spyOn` → `vi.spyOn`
* `jasmine.objectContaining` → `expect.objectContaining`
* `jasmine.any` → `expect.any`
* `jasmine.createSpy` → `vi.fn`
* Conversion of lifecycle hooks (`beforeAll`, `beforeEach`, etc.) to their Vitest equivalents
* `fail()` → `vi.fail()`
* Adjustment of matchers to the Vitest API
* [TODO comments](https://github.com/angular/angular-cli/pull/31469) for parts that cannot be converted automatically
* Tests with `done` callbacks are rewritten into `async`/`await` tests
<!--(see PR https://github.com/angular/angular-cli/pull/31435 and following -->

The schematic deliberately does not perform certain tasks.
It does not install Vitest or any other required dependencies.
It also does not modify the `angular.json` to enable the Vitest builder.
Likewise, it does not remove Karma files from the project.
Finally, the schematic does not convert complex spy scenarios, which must still be reviewed manually.
The manual migration (as described above) therefore remains necessary.


#### 2. Execute the schematic

If your project is configured for Vitest, you can start the automatic refactoring:

```bash
ng g @schematics/angular:refactor-jasmine-vitest
```

The schematic provides several additional options:

| Option             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `--project <name>` | Selects a specific project from the workspace.     |
| `--include <path>` | Limits the refactoring to a file or a directory.   |
| `--file-suffix`    | Defines a different file extension for test files. |
| `--add-imports`    | Adds explicit Vitest imports.                      |
| `--verbose`        | Enables detailed logging of the performed changes. |

#### 3. After the migration

1. **Execute the tests:** Use `ng test` to make sure all tests still work.
2. **Review the changes:** Check the modifications, especially for complex spies or asynchronous tests.

`ng test` runs tests in **watch mode** when the terminal is interactive.
In CI environments, the test runner automatically runs the tests in single-run mode.

#### 4. Custom configuration (optional)

The Angular CLI generates the Vitest configuration behind the scenes based on the options in `angular.json`.

If the provided options are not sufficient, you can use a custom configuration.
This makes extended options available, but the Angular team does not provide direct support for the specific contents of the configuration file or for any third-party plugins used inside it.
The CLI also overrides certain properties (`test.projects`, `test.include`) to ensure correct operation.

If needed, you can include your own Vitest configuration file (`vitest.config.ts`) to make adjustments that go beyond the standard options.
There are two ways to do this: You can directly reference a specific configuration file by providing the exact path in the `angular.json`:

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "runnerConfig": "vitest.config.ts"
          }
        }
      }
    }
  }
}
```

Alternatively, you can let the Angular CLI search automatically.
For automatic discovery, set `"runnerConfig": true` in the `angular.json`.
The builder will then search for a file named `vitest-base.config.*`, first in the project directory and then in the workspace root.
This allows you to define shared settings centrally and reuse them easily.



## The new syntax and APIs

Most specs run unchanged because **TestBed, ComponentFixture & Co.** remain available.
When migrating from Jasmine to Vitest, many testing patterns stay familiar, but some parts of the API change.
You mainly have to get familiar with the parts that are specific to Jasmine.

### Global functions

The well-known global test functions such as `describe`, `it` or `test`, `beforeEach`, `afterEach`, and `expect` remain available in Vitest without changes.
They are available without additional imports as long as your `tsconfig.spec.json` contains `types: ["vitest/globals"]`.
However, we still recommend importing these functions explicitly.
This avoids possible name collisions, for example with functions from Cypress that have the same names, which has caused confusing problems in the past.

### Matchers

The usual matchers like `toBe`, `toEqual`, `toContain`, or `toHaveBeenCalledWith` remain available in Vitest. If you used `jasmine.any(...)` in Jasmine, you now use `expect.any(...)` in Vitest.
Important: Vitest does not aim to provide an API that is compatible with Jasmine.
Instead, Vitest offers a [**Jest-compatible** expect API](https://vitest.dev/api/expect.html) based on Chai.
The Jest test framework itself aims to be somewhat compatible with Jasmine.
But since Vitest only wants to be compatible with Jest, some challenges arise because certain matchers simply do not exist.

#### 1) `toBeTrue()` / `toBeFalse()` do not exist in Jest/Vitest

Jasmine includes the strict boolean matchers `toBeTrue()` and `toBeFalse()`.
They do not exist in Jest (and therefore not in Vitest).
Instead, you can simply use the matcher [`toBe(true)`](https://vitest.dev/api/expect.html#tobe) or `toBe(false)`.

```ts
// Jasmine
expect(result).toBeTrue();
expect(flag).toBeFalse();

// Vitest
expect(result).toBe(true);
expect(flag).toBe(false);
```

#### 2) `toHaveBeenCalledOnceWith()` gibt es in Jest/Vitest nicht

Jasmine hat einen praktischen Matcher für einen Spy mit der Prüfung auf "genau einmal und genau mit diesen Argumenten". 
Als Ersatz verwendest du einfach [`toHaveBeenCalledExactlyOnceWith()`](https://vitest.dev/api/expect.html#tohavebeencalledexactlyoncewith):

```ts
var book = {};

// Jasmine
expect(spy).toHaveBeenCalledOnceWith(book);

// Vitest
expect(spy).toHaveBeenCalledExactlyOnceWith(book);
```

#### 3) Asynchrone Matchers: `expectAsync(...)` (Jasmine) vs. `.resolves/.rejects` (Jest/Vitest)

Jasmine hat eine [eigene Async-API](https://jasmine.github.io/api/5.12/async-matchers): `await expectAsync(promise).toBeResolved() / toBeRejectedWith(...)`. 
Jest/Vitest nutzen stattdessen das Muster [`await expect(promise).resolves/...`](https://vitest.dev/api/expect.html#resolves) bzw. [`.rejects/...`](https://vitest.dev/api/expect.html#rejects). 
Beim Umstieg müssen diese Expectations umgeschrieben werden.

```ts
// Jasmine
await expectAsync(doWork()).toBeResolved();
await expectAsync(doWork()).toBeResolvedTo('OK');
await expectAsync(doWork()).toBeRejectedWithError('Boom');

// Jest/Vitest
await expect(doWork()).resolves.toBeDefined();
await expect(doWork()).resolves.toBe('OK');
await expect(doWork()).rejects.toThrow('Boom');
```

Vitest zielt also bei den Matchern auf Jest‑Kompatibilität ab. 
Kompatibilität mit Jasmine steht hingegen überhaupt nicht im Fokus. 
In der Praxis ist der Anpassungsaufwand meist gering (vor allem bei `toBeTrue`/`toBeFalse` und `toHaveBeenCalledOnceWith`), aber er existiert. 
Bei asynchronen Erwartungen unterscheidet sich das Pattern sogar deutlich. Allerdings wurde `expectAsync` in der Angular-Dokumentation nie erwähnt; stattdessen wurden eigene Hilfsfunktionen gezeigt.
Daher dürfte in den meisten Projekten hier wahrscheinlich gar keine zusätzliche Arbeit anfallen.


### Spys und Mocks

Das Spying-Konzept funktioniert nahezu identisch wie bei Jasmine, wird jedoch über das [`vi`‑Objekt bereitgestellt](https://vitest.dev/api/vi.html#vi-spyon):

```ts
// Jasmine
spyOn(service, 'loadData').and.returnValue(of([]));

// Vitest
vi.spyOn(service, 'loadData').mockReturnValue(of([]));
```

Für Spys, die bei Jasmine mit `jasmine.createSpy()` erzeugt wurden, verwendest du in Vitest jetzt einfach [`vi.fn()`](https://vitest.dev/api/vi.html#vi-fn):

```ts
// Jasmine
const onItem = jasmine.createSpy().and.returnValue(true);

// Vitest
const onItem = vi.fn().mockReturnValue(true);
```

In Jasmine kann man mit den ersten Argument einen Namen für den Spy vergeben.
Dies dient dazu, in Fehlermeldungen und Reports aussagekräftigere Texte anzuzeigen (siehe [Doku](https://jasmine.github.io/api/5.12/jasmine#.createSpy)).
Falls du in Vitest ebenfalls einem einen sprechenden Namen geben möchtest, kannst du dies mit `.mockName('onItem')` tun.

```ts
// Jasmine - mit Name
const onItem = jasmine.createSpy('onItem').and.returnValue(true);

// Vitest - mit Name
const onItem = vi.fn().mockName('onItem').mockReturnValue(true);
```

### Asynchronität ohne Zone.js mit Vitest Timer

Seit Angular 21 laufen Unit-Tests standardmäßig zoneless. 
Das bedeutet: Die früheren Angular-Hilfsfunktionen `waitForAsync()` und `fakeAsync()`/`tick()` funktionieren nicht mehr automatisch, weil sie auf Zone.js basieren. 
Entscheidend ist: Das hat erstmal nichts mit Vitest zu tun.
Auch unter Jasmine hätte man in einer zonenlosen Umgebung auf diese Utilitys verzichten müssen.

Für einfache asynchrone Tests ersetzt man `waitForAsync()` daher durch ganz normales `async/await`, das es seit vielen Jahren auch mit Jasmine möglich ist.
Folgendes Update funktioniert also unabhängig vom Test-Runner:

```ts
// FRÜHER: waitsForAsync + Zone.js
it('should load data', waitForAsync(() => {
  service.getData().then(result => {
    expect(result.title).toContain('Hello');
  });
}));

// MODERN: zoneless + async/await
it('should load data', async () => {
  const result = await service.getData();
  expect(result.title).toContain('Hello');
});
```

Ggf. muss der Service für dieses Beispiel "ausgemockt" werden, damit es funktioniert.
Hier bleibt alles unverändert.
Modern ist nur die Schreibweise, bei der es zwischen Jasmine und Vitest keinen Unterschied gibt.

Der zweite Angular-Klassiker [`fakeAsync()`](https://angular.dev/api/core/testing/fakeAsync) und [`tick()`](https://angular.dev/api/core/testing/tick) braucht hingegen einen echten Ersatz.
(Hinweis: Diese beiden Helfer sind nicht Bestandteil von Jasmine, sondern kommen aus `@angular/core/testing`.)
Vitest bringt ein eigenes [Fake-Timer-System](https://vitest.dev/api/vi.html#fake-timers) mit.
Die Nutzung erfordert etwas Einarbeitung, denn nicht alle Timer funktionieren gleich und nicht jeder Test braucht dieselben Werkzeuge. 
Beginnen wir mit einem einfachen zeitbasierten Beispiel. 
Die folgende Funktion erhöht einen Counter nach genau fünf Sekunden:

```ts
export function startFiveSecondTimer(counter: { value: number }) {
  setTimeout(() => {
    counter.value++;
  }, 5000);
}
```

Für solche Fälle ist `vi.advanceTimersByTime()` ideal, denn man kann gezielt simulieren, dass exakt eine bestimmte Zeit verstrichen ist. Ganz ähnlich wie früher `tick(5000)`, aber ohne fakeAsync-Zone:

```ts
import { describe, it, expect, vi } from 'vitest';
import { startFiveSecondTimer } from './timer-basic';

describe('startFiveSecondTimer', () => {
  it('erhöht den Counter nach exakt 5 Sekunden', () => {
    vi.useFakeTimers();

    const counter = { value: 0 };
    startFiveSecondTimer(counter);

    // simuliert das Vergehen von 5 Sekunden
    vi.advanceTimersByTime(5000);

    expect(counter.value).toBe(1);

    vi.useRealTimers();
  });
});
```

`advanceTimersByTime()` ist damit der unmittelbare Ersatz für `tick()`.
Es eignet sich besonders gut, wenn du eine ganz bestimmte Zeitspanne simulieren oder mehrere Timer in korrekt getakteter Reihenfolge ablaufen lassen möchtest.


Doch nicht alle Timer sind so einfach. 
Manchmal besteht der Code nur aus timerbasierten Aktionen, aber ohne zusätzliche Promises. Das folgende Beispiel inkrementiert einen Counter mehrfach, indem es ausschließlich Timeouts und Intervals nutzt:

```ts
// timer-sync.ts
export function startSyncSequence(counter: { value: number }) {
  setTimeout(() => { counter.value++; }, 300);
  const interval = setInterval(() => {
    counter.value++;
    if (counter.value === 3) {
      clearInterval(interval);
    }
  }, 200);
}
```

In Fällen, in denen du *alle* Timer der Reihe nach abarbeiten willst, ohne manuell Zeit vorzuspulen, nutzt du `vi.runAllTimers()`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { startSyncSequence } from './timer-sync';

describe('startSyncSequence', () => {
  it('führt alle synchronen Timer vollständig aus', () => {
    vi.useFakeTimers();

    const counter = { value: 0 };
    startSyncSequence(counter);

    // führt alle Timer und Intervals aus, bis die Timer-Queue leer ist
    vi.runAllTimers();

    expect(counter.value).toBe(3);

    vi.useRealTimers();
  });
});
```

Hier wäre `advanceTimersByTime()` zwar möglich, aber unnötig kompliziert. `runAllTimers()` löst einfach jedes Timeout und jedes Interval aus, bis nichts mehr übrig ist.

Noch interessanter wird es, wenn Timer-Callbacks selbst wieder asynchron arbeiten, beispielsweise durch ein `await` oder Promise-Ketten.
Dann reicht `runAllTimers()` nicht mehr aus. Das folgende Beispiel zeigt ein typisches Muster aus realen Anwendungen:

```ts
// timer-async.ts
export function startAsyncJob(): Promise<string> {
  return new Promise(resolve => {
    setTimeout(async () => {
      const data = await Promise.resolve('done'); // asynchroner Schritt im Callback
      resolve(data);
    }, 100);
  });
}
```

Damit der Test nicht nur den Timeout, sondern auch das `await` im Callback vollständig abarbeitet, bietet Vitest `runAllTimersAsync()` an:

```ts
import { describe, it, expect, vi } from 'vitest';
import { startAsyncJob } from './timer-async';

describe('startAsyncJob', () => {
  it('führt Timer und async-Callbacks vollständig aus', async () => {
    vi.useFakeTimers();

    const promise = startAsyncJob();

    // führt Timer UND asynchrone Logik innerhalb der Timer-Callbacks aus
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('done');

    vi.useRealTimers();
  });
});
```

`runAllTimersAsync()` ist damit ein guter Ersatz für Jasmine-Szenarien, bei denen `fakeAsync()` und `tick()` in Kombination mit Microtask-Flushing verwendet wurden. 

### TestBed und ComponentFixture

Nach all den kleinen, aber subtilen Unterschieden zwischen Jasmine und Vitest gibt es hier gute Nachrichten: 
Die Verwendung von `TestBed` und `ComponentFixture` bleibt vollständig unverändert, da dies kein Thema ist, das Vitest berührt. 
Du erzeugst weiterhin deine Komponenten oder Services mithilfe von `TestBed`.
Auch der explizite Aufruf von `fixture.detectChanges()` ist unverändert notwendig, um die Change Detection manuell anzustoßen.


## Bekannte Einschränkungen und Fallstricke

Spezielle Karma-Anwendungsfälle wie eigene Karma-Plugins oder individuelle Browser‑Launcher lassen sich erwartungsgemäß nicht direkt auf Vitest übertragen.
Du wirst im Vitest-Ökosystem nach Alternativen suchen müssen.

Bei der Umstellung auf Vitest kann eine kurze Gewöhnungsphase im Team nötig sein, da bestimmte neue API-Konzepte wie `vi.spyOn`, `vi.fn` oder Strategien zum Zurücksetzen von Mocks zwar leicht zu erlernen sind, sich aber dennoch von Jasmine unterscheiden. 
Achte deshalb darauf, dass deine Tests mögliche Manipulationen an globalen Objekten vollständig aufräumen und verwende dafür idealerweise Methoden wie [`afterEach`](https://vitest.dev/api/#aftereach) mit [`vi.restoreAllMocks()`](https://vitest.dev/api/vi.html#vi-restoreallmocks).


## Fazit

Mit Vitest als Standard in Angular 21 wird das Testen deutlich moderner und schneller. 
Die Umstellung ist meist unkompliziert, die Migrations‑Schematics helfen beim Einstieg. 
Wo früher `fakeAsync` und Zone.js‑Magie nötig waren, reichen heute `async/await` und flexible Fake‑Timer. 
Und wenn es realistisch sein muss, steht dir der Browser‑Modus zur Verfügung.
Insgesamt bedeutet das: kürzere Feedback‑Schleifen, robustere Tests und weniger Reibung im Alltag. Viel Spaß beim Testen!

<hr>

<small>Vielen Dank an Ferdinand Malcher und Danny Koppenhagen für das Review und das wertvolle Feedback!</small>
