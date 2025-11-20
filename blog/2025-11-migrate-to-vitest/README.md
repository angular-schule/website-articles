---
title: "Vitest in Angular 21: What's new and how to migrate?"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2025-11-20
lastModified: 2025-11-20
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

Custom settings from the file `karma.conf.js` are not migrated automatically.
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

The schematic currently performs the following transformations in files with the suffix `.spec.ts`:

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

#### 2) `toHaveBeenCalledOnceWith()` does not exist in Jest/Vitest

Jasmine has a convenient matcher for checking that a spy was called "exactly once and with exactly these arguments".
As a replacement, you simply use [`toHaveBeenCalledExactlyOnceWith()`](https://vitest.dev/api/expect.html#tohavebeencalledexactlyoncewith):

```ts
var book = {};

// Jasmine
expect(spy).toHaveBeenCalledOnceWith(book);

// Vitest
expect(spy).toHaveBeenCalledExactlyOnceWith(book);
```

#### 3) Asynchronous Matchers: `expectAsync(...)` (Jasmine) vs. `.resolves/.rejects` (Jest/Vitest)

Jasmine has its [own async API](https://jasmine.github.io/api/5.12/async-matchers): `await expectAsync(promise).toBeResolved() / toBeRejectedWith(...)`.
Jest/Vitest instead use the pattern [`await expect(promise).resolves/...`](https://vitest.dev/api/expect.html#resolves) or [`.rejects/...`](https://vitest.dev/api/expect.html#rejects).
For the migration, you must rewrite these expectations. 

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

Vitest therefore aims for Jest compatibility when it comes to matchers.
Compatibility with Jasmine is not a goal at all.
In practice, the amount of required changes is usually small (mainly for `toBeTrue`/`toBeFalse` and `toHaveBeenCalledOnceWith`), but it does exist.
For asynchronous expectations, the pattern is even different. 
But don't worry: the chances that your project uses `expectAsync` are very low, because the Angular documentation always showed Angular-specific helper functions instead.
Because of this, most projects will probably not need additional changes here.

### Spies and mocks

The spying concept works almost the same as in Jasmine, but it is provided through the [`vi` object](https://vitest.dev/api/vi.html#vi-spyon):

```ts
// Jasmine
spyOn(service, 'loadData').and.returnValue(of([]));

// Vitest
vi.spyOn(service, 'loadData').mockReturnValue(of([]));
```

For spies created in Jasmine using `jasmine.createSpy()`, you now simply use [`vi.fn()`](https://vitest.dev/api/vi.html#vi-fn) in Vitest:

```ts
// Jasmine
const onItem = jasmine.createSpy().and.returnValue(true);

// Vitest
const onItem = vi.fn().mockReturnValue(true);
```

In Jasmine, you can pass a name for the spy as the first argument.
This is used to show more descriptive text in error messages and reports (see the [documentation](https://jasmine.github.io/api/5.12/jasmine#.createSpy)).
If you also want to give a descriptive name in Vitest, you can do so with `.mockName('onItem')`.

```ts
// Jasmine - with name
const onItem = jasmine.createSpy('onItem').and.returnValue(true);

// Vitest - with name
const onItem = vi.fn().mockName('onItem').mockReturnValue(true);
```

### Asynchrony without Zone.js using Vitest timers

Since Angular 21, unit tests run zoneless by default.
This means: The old Angular helpers `waitForAsync()` and `fakeAsync()`/`tick()` no longer work automatically, because they rely on Zone.js.
First of all, this has nothing to do with Vitest.
Even under Jasmine, these utilities would have had to be dispensed with in a zone-free environment.

For simple asynchronous tests, you replace `waitForAsync()` with normal `async/await`, which has also been possible with Jasmine for many years.
The following update therefore works independently of the test runner:

```ts
// BEFORE: waitForAsync + Zone.js
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
````

It may be necessary to “mock” the service to make this example work.
Nothing else changes here.
Only the syntax is modern, and there is no difference between Jasmine and Vitest.

The second Angular classic, [`fakeAsync()`](https://angular.dev/api/core/testing/fakeAsync) and [`tick()`](https://angular.dev/api/core/testing/tick), does need a real replacement.
(Note: These helpers are not part of Jasmine, but come from `@angular/core/testing`.)
Vitest provides its own [fake timer system](https://vitest.dev/api/vi.html#fake-timers).
Using it requires some practice, because not all timers behave the same and not every test needs the same tools.
Let’s start with a simple time-based example.
The following function increases a counter after exactly five seconds:

```ts
export function startFiveSecondTimer(counter: { value: number }) {
  setTimeout(() => {
    counter.value++;
  }, 5000);
}
```

In such cases, `vi.advanceTimersByTime()` is ideal because you can simulate that exactly a certain amount of time has elapsed. It works very similarly to the old `tick(5000)`, but without the `fakeAsync()` zone:

```ts
import { describe, it, expect, vi } from 'vitest';
import { startFiveSecondTimer } from './timer-basic';

describe('startFiveSecondTimer', () => {
  it('increases the counter after exactly 5 seconds', () => {
    vi.useFakeTimers();

    const counter = { value: 0 };
    startFiveSecondTimer(counter);

    // simulate the passing of 5 seconds
    vi.advanceTimersByTime(5000);

    expect(counter.value).toBe(1);

    vi.useRealTimers();
  });
});
```

`advanceTimersByTime()` is therefore the direct replacement for `tick()`.
It works especially well when you want to simulate a specific time period or run multiple timers in the correct order.


But not all timers are this simple.
Sometimes the code works only with timer-based actions, but without additional promises. The following example increments a counter multiple times using only timeouts and intervals:

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

In cases where you want to run *all* timers one after another without manually moving time forward, you use `vi.runAllTimers()`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { startSyncSequence } from './timer-sync';

describe('startSyncSequence', () => {
  it('runs all synchronous timers completely', () => {
    vi.useFakeTimers();

    const counter = { value: 0 };
    startSyncSequence(counter);

    // runs all timers and intervals until the timer queue is empty
    vi.runAllTimers();

    expect(counter.value).toBe(3);

    vi.useRealTimers();
  });
});
```

Here, `advanceTimersByTime()` would be possible, but needlessly complicated. `runAllTimers()` simply executes every timeout and every interval until nothing is left.

It becomes even more interesting when timer callbacks contain asynchronous work themselves, for example through an `await` or promise chains.
In that case, `runAllTimers()` is no longer enough. The following example shows a typical pattern from real applications:

```ts
// timer-async.ts
export function startAsyncJob(): Promise<string> {
  return new Promise(resolve => {
    setTimeout(async () => {
      const data = await Promise.resolve('done'); // asynchronous step in the callback
      resolve(data);
    }, 100);
  });
}
```

To ensure the test handles both the timeout and the `await` inside the callback, Vitest provides `runAllTimersAsync()`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { startAsyncJob } from './timer-async';

describe('startAsyncJob', () => {
  it('runs timers and async callbacks completely', async () => {
    vi.useFakeTimers();

    const promise = startAsyncJob();

    // runs timers AND asynchronous logic inside the timer callbacks
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('done');

    vi.useRealTimers();
  });
});
```

`runAllTimersAsync()` is therefore a good replacement for Jasmine scenarios where `fakeAsync()` and `tick()` were used together with microtask flushing.

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
