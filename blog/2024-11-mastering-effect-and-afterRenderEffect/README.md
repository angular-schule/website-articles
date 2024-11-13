---
title: 'Angular 19: Mastering effect() and afterRenderEffect()'
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2024-11-12
lastModified: 2024-11-12
keywords:
  - Angular
  - JavaScript
  - Signals
  - Reactive Programming
  - Effect
  - afterRenderEffect
  - Angular 19
language: en
thumbnail: effect.jpg
sticky: false
---


Angular 19 has a significant change with the simplification of the `effect()` API and [the introduction of `afterRenderEffect()`](https://github.com/angular/angular/pull/57549). 
This change impacts how Angular handles post-render tasks and is especially useful for applications that rely on precise timing for rendering and DOM manipulation. 
In this article, we’ll explore how these two APIs compare, when to use each, and how to take advantage of phased execution with `afterRenderEffect()`.

## Contents

* [Angular 19 vs. Previous Versions: What’s Different?](/blog/2024-11-mastering-effect-and-afterRenderEffect#angular-vs-previous-versions-whats-different)
* [Core Differences Between `effect()` and `afterRenderEffect()`](/blog/2024-11-mastering-effect-and-afterRenderEffect##core-differences-between-effect-and-afterrendereffect)
* [Introducing `effect()`](/blog/2024-11-mastering-effect-and-afterRenderEffect##introducing-effect)
  * [Example for `effect()`: setting multipe things at once](/blog/2024-11-mastering-effect-and-afterRenderEffect##example-for-effect-setting-multipe-things-at-once)
  * [When to choose `effect()` over `computed()`](/blog/2024-11-mastering-effect-and-afterRenderEffect##when-to-choose-effect-over-computed)
* [Introducing `afterRenderEffect()`](/blog/2024-11-mastering-effect-and-afterRenderEffect##introducing-afterrendereffect)
  * [Understanding the Phases](/blog/2024-11-mastering-effect-and-afterRenderEffect##understanding-the-phases)
  * [Phases Only Run Again When "Dirty" Through Signal Dependencies](/blog/2024-11-mastering-effect-and-afterRenderEffect##phases-only-run-again-when-dirty-through-signal-dependencies)
  * [Example of `afterRenderEffect()`: Dynamically Resizing a Textarea](/blog/2024-11-mastering-effect-and-afterRenderEffect##example-of-afterrendereffect-dynamically-resizing-a-textarea)
* [Migration Guide: From Angular Lifecycle Hooks to Signal-Based Reactivity](/blog/2024-11-mastering-effect-and-afterRenderEffect##migration-guide-from-angular-lifecycle-hooks-to-signal-based-reactivity)
* [Best Practices for Using `effect()` and `afterRenderEffect()`](/blog/2024-11-mastering-effect-and-afterRenderEffect##best-practices-for-using-effect-and-afterrendereffect)
* [Demo Application](/blog/2024-11-mastering-effect-and-afterRenderEffect##demo-application)
* [Conclusion](/blog/2024-11-mastering-effect-and-afterRenderEffect##conclusion)

## Angular 19 vs. Previous Versions: What’s Different?

The `effect()` API was introduced as part of Angular’s new signal-based reactivity model [in Angular 16](https://blog.angular.dev/angular-v16-is-here-4d7a28ec680d).
Angular 19 now introduces a significant update to the `effect()` API, making it easier to manage side effects directly within `effect()` functions, even when they involve setting signals. 

Before this change, effects had a more restrictive approach: It was discouraged to set signals within `effect()`, and to allow this behavior, we had to enable the `allowSignalWrites` flag:

```ts
// OLD WAY
effect(() => {
  this.mySignal.set('demo');
}, { allowSignalWrites: true })
```

Previously, Angular’s documentation advised developers to avoid setting signals in `effect()`, as it could lead to issues like `ExpressionChangedAfterItHasBeenChecked` errors, circular updates, or unnecessary change detection cycles.
Developers were encouraged to keep `effect()` usage limited to specific side effects, such as:

- Logging changes for analytics or debugging purposes.
- Keeping data in sync with local storage (e.g., `window.localStorage`).
- Implementing custom DOM behaviors not achievable with template syntax.
- Handling third-party UI libraries, such as rendering to a `<canvas>` element or integrating charting libraries.

However, developers found that the `allowSignalWrites` flag was not as effective in encouraging these patterns as initially expected.
The flag was planned as an exception, but it was too often used in legitimate cases where setting signals was reasonable or even necessary, such as updating a signal after a series of changes or working with multiple signals.
In response, Angular’s new approach now allows setting signals within `effect()` by default, removing the need for `allowSignalWrites`.
This more flexible design reflects Angular’s commitment to simplifying the development experience.
See the [official blog post](https://blog.angular.dev/latest-updates-to-effect-in-angular-f2d2648defcd) that confirms this new guidance.

We interpret this new information in the following way:
> 💡 **It is now a valid case to use `effect()` for state updates or side effects that are difficult to achieve with other reactive primitives, such as `computed()`**.

This change to the paradigm is in line with new features introduced in Angular 19, such as `linkedSignal()` and `resource()`.
Both help to maintain cleaner and more declarative state management patterns where possible. 
Good patterns are no longer enforced by the `allowSignalWrites` flag, but instead by useful high-level signal APIs.

With this shift, here’s a new general rule of thumb:
- **Use `effect()`** for tasks traditionally performed in `ngOnInit` or `ngOnChanges`.
- **Use `afterRenderEffect()`** for tasks traditionally handled in `ngAfterViewInit` or `ngAfterViewChecked`, or when you need to interact directly with rendered DOM elements.

Let’s dive into the specifics! 🚀



## Core Differences Between `effect()` and `afterRenderEffect()`

Both `effect()` and `afterRenderEffect()` are designed to track and respond to changes in signals, but they differ in timing and use cases.

- **`effect()`** runs as part of the Angular change detection cycle and can now safely modify signals without any additional flags.
- **`afterRenderEffect()`** is a lower-level API that executes after the DOM has been updated. 
  It’s particularly suited for tasks that require interacting directly with the DOM, such as measuring element sizes or making complex visual updates in phases.

Here’s a simple comparison to illustrate how these functions operate:

```typescript
counter = signal(0);

effect(() => {
  console.log(`Current counter value: ${this.counter()}`);
});

afterRenderEffect(() => {
  console.log('DOM rendering completed for this component');
});
```

As expected, the console output for `afterRenderEffect` is triggered after the output of `effect`.


## Introducing `effect()`

Angular supports two types of effects: **component effects** and **root effects**. 
Component effects are initiated when `effect()` is called within a component, directive, or a service tied to them. 
Root effects, on the other hand, are initiated when `effect()` is called outside the component tree, such as in a root service, or by setting the `forceRoot` option.

The main difference between these effect types is their timing. 
Component effects operate as part of Angular’s change detection, which allows them to safely read input signals and manage views dependent on component state.
Root effects, however, run as microtasks, independent of the component tree or change detection.

In this article, we only discuss **component effects**.


### Example for `effect()`: setting multipe things at once

Consider the example below, where `effect()` is used to synchronize form fields based on the input signal `currentBook`.
The API for reactive forms has not been updated to work hand in hand with signals, so we still need to patch the form as we have done in the past.
However, some improvements to the Reactive Forms API have already been promised.
We also want to set another signal after we have patched the form. 

Here is our example of a form that can create a new book and edit an existing book:

```typescript
@Component({
  selector: 'app-book-form',
  imports: [ReactiveFormsModule],
  template: `
    @let c = bookForm.controls;

    <form [formGroup]="bookForm" (ngSubmit)="submitForm()">
      <input [formControl]="c.isbn" placeholder="ISBN" />
      <input [formControl]="c.title" placeholder="Title" />
      <textarea [formControl]="c.description" placeholder="Description"></textarea>
      <button type="submit">
        @if (isEditMode()) { Edit } @else { Create }
      </button>
    </form>
  `,
})
export class BookFormComponent {

  currentBook = input<Book | undefined>();

  bookForm = new FormGroup({
    isbn: new FormControl(/* ... */),
    title: new FormControl(/* ... */),
    description: new FormControl(/* ... */),
  });
  isEditMode = signal(false);

  updateForm = effect(() => {
    const book = this.currentBook();
    if (book) {
      this.bookForm.patchValue(book);
      this.bookForm.controls.isbn.disable();
      this.isEditMode.set(true);
    } else {
      this.bookForm.controls.isbn.enable();
      this.isEditMode.set(false);
    }
  });

  submitForm() {
    // ...handle form submission logic
  }
}
```

In this example, `effect()` is ideal for handling the side effect (patching the form) without rerunning unnecessary computations. 
We are also free to set signals in the effect now.
To show that this is now perfectly valid, we updated another signal during that phase.
We dediced for a signal called `isEditMode`, that is updated accordingly.
In the past, we would have been using `ngOnChanges` to patch the form when the input was changed.


### When to choose `effect()` over `computed()`

The previous constraints on `effect()` have been removed, so it is now more challenging to decide when to use `computed()` or `effect()`.
In our opinion, the choice between `effect()` and `computed()` depends on the use case:
- **Use `computed()`** for deriving a value based on other signals, especially when you need a pure, read-only reactive value. 
  We covered `computed()` and `linkedSignal()` in this article: **[Angular 19: Introducing LinkedSignal for Responsive Local State Management](https://angular.schule/blog/2024-11-effect-and-afterRenderEffect)**
- **Use `effect()`** if the operation is more complex, involves setting multiple signals or requires side effects to be performed outside the world of signals, such as synchronising reactive form states or logging events.

For patching forms, there is currently no better approach than using effects. 
This approach can also be easily migrated to what would have been done in the past with `ngOnchanges` – which is great.
But whether we should have used a better computed signal for the `isEditMode` is questionable.
It is not easy to make a decision here, because we could also have written the following:

```ts
isEditMode = computed(() => !!this.currentBook());
```

Perhaps we have to accept that in some situations both options are absolutely valid!


## Introducing `afterRenderEffect()`

The new `afterRenderEffect()` function allows us to control when tasks occur during the DOM update process.
This is particularly beneficial for UI manipulations that require specific timing to avoid layout shifts and ensure smooth animations.

The API itself mirrors the functionality of 
* [`afterRender`](https://next.angular.dev/api/core/afterRender) *(registers a callback to be invoked each time the application finishes rendering)* and 
* [`afterNextRender`](https://next.angular.dev/api/core/afterNextRender) *(registers a callbacks to be invoked the next time the application finishes rendering, during the specified phases.)* 

which are both in **Developer Preview**!

The Angular docs recommend avoiding `afterRender` when possible and suggest specifying explicit phases with `afterNextRender` to avoid significant performance degradation. 
You’ll see a similar recommendation for `afterRenderEffect()`. There is one signature that is intended for use and another that exists but is not recommended.

But there is one big difference:
> **💡 Values are propagated from phase to phase as signals instead of as plain values.** 

As a result, later phases may not need to execute if the values returned by earlier phases do not change - and if there is no other dependency established (we will talk about this soon). Before we start, some important facts to know about the effects created by `afterRenderEffect()`:

* **Phased Execution**: These effects can be registered for specific phases of the render cycle. 
  The Angular team recommends adhering to these phases for optimal performance.
* **Signal Integration**: These effects are supposed to work seamlessly with Angular’s signal reactivity system, and signals can be set during the phases.
* **Selective Execution**: These effects only rerun when they are "dirty" due to signal dependencies. If no signal changes, the effect won’t trigger again.
* **No SSR**: These effects execute only in browser environments, not on the server.


### Understanding the Phases

Phased execution is useful for avoiding unnecessary layout recalculations.
We can register for each phase by specifying a callback function.
The first callback receives no parameters.
Each subsequent phase callback will receive the return value of the previous phase **as a signal**.
This can be used to coordinate work across multiple phases.

`afterRenderEffect()` offers four distinct phases.  
They run in the following order:

| Phase                 | Rule                   |
|-----------------------|------------------------|
| 1. `earlyRead`        | Use this phase to **read** from the DOM before a subsequent write callback, for example to perform custom layout that the browser doesn't natively support. Prefer the read phase if reading can wait until after the write phase. **Never** write to the DOM in this phase. |
| 2. `write`            | Use this phase to **write** to the DOM. **Never** read from the DOM in this phase. |
| 3. `mixedReadWrite`   | Use this phase to read from and write to the DOM simultaneously. **Never** use this phase if it is possible to divide the work among the other phases instead. |
| 4. `read`             | Use this phase to **read** from the DOM. **Never** write to the DOM in this phase. |

[According to the docs](https://next.angular.dev/api/core/afterRenderEffect), you should prefer using the `read` and `write` phases over the `earlyRead` and `mixedReadWrite` phases when possible, to avoid performance degradation.

To summarise this, with `afterRenderEffect()` you can do the following in the four phases:
1. **earlyRead**: Read DOM properties before writes.
2. **write**: Execute DOM write operations.
3. **mixedReadWrite**: Allows for combined reads and writes but should be used sparingly!
4. **read**: Execute DOM reads after writes are completed.
5. ...and you can pass on a value (or an object) from one phase to the next.

As mentionend before, there is also a second signature of `afterRenderEffect()` that accepts a single callback. 
This function registers an effect to run after rendering is complete, specifically during the `mixedReadWrite` phase.
However, the Angular documentation recommends specifying an explicit phase for the effect whenever possible to avoid potential performance issues.
Therefore, we won't cover this signature in our article, as its usage is not recommended.


### Phases Only Run Again When "Dirty" Through Signal Dependencies

When `afterRenderEffect()` is initially called, all registered phases execute once in sequence.
However, for any phase to run again, it must be marked as "dirty" due to a change in signal dependencies. 
This dependency-based system helps Angular to optimize performance by preventing redundant executions.

For a phase to be marked "dirty" and eligible to rerun, it must establish a dependency on a signal that changes. 
If a phase does not track any signals, or if the tracked signals remain unchanged, the phase won’t be marked as dirty, and its code will not re-execute.

There are two main ways to establish dependencies in `afterRenderEffect()`:

1. **Tracking the Value of a Previous Phase’s Output**: 
  Each phase can return a value to be passed as input to the next phase (except `earlyRead`, which has no previous phase). 
  This value is wrapped in a signal, and if we then read that signal in the following phase, we create a dependency. 
  It's important to understand that we must actually execute the signal’s value function because simply passing the signal around is insufficient to establish a dependency.

2. **Directly Tracking Component Signals**: 
  We can also create dependencies by accessing other signals directly within the phase. 
  For example, in the upcoming example, we read a signal from the component within the `earlyRead` phase to create a dependency and ensure the phase executes multiple times.

> **💡 Angular ensures that phases only re-execute when their tracked signals change, marking the phase itself as "dirty."   
  Without these signal dependencies, each phase will run only once!**


### Example of `afterRenderEffect()`: Dynamically Resizing a Textarea

Let’s take a closer look at `afterRenderEffect()` through a practical example.

In this example, we demonstrate how `afterRenderEffect()` can be used to dynamically adjust the height of a `<textarea>` based on both user and programmatic changes.
The textarea is designed to be resized by dragging the bottom-right corner, but we also want it to automatically adjust its height periodically.
To achieve this, we read the current height from the DOM and update it based on a central signal called  `extraHeight`.

This example was inspired by the article ["Angular 19: afterRenderEffect"](https://medium.com/@amosisaila/angular-19-afterrendereffect-5cf8e6482256) by Amos Lucian Isaila Onofrei, which we modified for a better separation between reads and writes. (The original example reads from the DOM in the write phase, which is explicitely not recommended according to the Angular docs.)

Our example will demonstrate how to use multiple phases (`earlyRead`, `write`, and `read`) in `afterRenderEffect()` to handle DOM manipulation efficiently, while respecting Angular’s guidelines for separating reads and writes:

```typescript
import { Component, viewChild, ElementRef, signal, afterRenderEffect } from "@angular/core";

@Component({
  selector: 'app-resizable',
  template: `<textarea #myElement style="border: 1px solid black; height: 100px; resize: vertical;">
    Resizable Element
  </textarea>`,
})
export class ResizableComponent {

  myElement = viewChild.required<ElementRef>('myElement');
  extraHeight = signal<number>(0);

  constructor() {

    const effect = afterRenderEffect({

      // earlyRead: Captures the current height of the textarea from the DOM.
      earlyRead: (onCleanup) => {

        console.warn(`earlyRead executes`);

        // Make `extraHeight` a dependency of `earlyRead`
        // Now this code it will run again whenever `extraHeight` changes
        // Hint: remove this statement, and `earlyRead` will execute only once!
        console.log('earlyRead: extra height:', this.extraHeight());

        const currentHeight: number = this.myElement()?.nativeElement.offsetHeight;
        console.log('earlyRead: offset height:', currentHeight);

        // Pass the height to the next phase
        return currentHeight;
      },

      // write: Sets the new height by adding `extraHeight` to the captured DOM height.
      write: (currentHeight, onCleanup) => {

        console.warn(`write executes`);

        // Make `extraHeight` a dependency of `earlyRead`
        // Hint: change this code to `const newHeight = currentHeight();`, 
        // so that we have no dependency to a signal that is changed, and `write` will be executed only once
        // Hint 2: if `currentHeight` changes in `earlyRead`, `write` will re-run, too. 
        // resize the textarea manually to achieve this
        const newHeight = currentHeight() + this.extraHeight();

        this.myElement().nativeElement.style.height = `${newHeight}px`;
        console.log('write: written height:', newHeight);

        onCleanup(() => {
          console.log('write: cleanup is called', newHeight);
        });

        // Pass the height to the next phase
        // Hint: pass the same value to `read`, e.g. `return 100`, to see how `read` is skipped
        return newHeight;
      },

      // The read phase logs the updated height
      read: (newHeight, onCleanup) => {
        console.warn(`read executes`);
        console.log('read: new height:', newHeight());
      }
    });

    // Trigger a new run every 4 seconds by setting the signal `extraHeight`
    setInterval(() => {
      console.warn('---- new round ----');
      this.extraHeight.update(x => ++x)
    }, 4_000);

    // Try this, if the signal value stays the same, nothing will hapen
    // setInterval(() => this.extraHeight.update(x => x), 4_000);

    // cleanup callbacks are also executed when we destroy the hook
    // setTimeout(() => effect.destroy(), 20_000);
  }
}
```

In our setup, an interval updates the `extraHeight` signal every 4 seconds.
By updating `extraHeight`, we create a "dirty" state that restarts the `afterRenderEffect()` phases, which checks and adjusts the height of the `<textarea>` as needed:

**Explanation of the Phases**  

In this example, an interval updates `extraHeight` every 4 seconds, creating a new round of execution across the phases. 
Here’s a breakdown of each phase:

1. **earlyRead Phase**: 
  This phase captures the current height of the `textarea` by reading the `offsetHeight` directly from the DOM. 
  This read operation from the DOM is necessary because the textarea can also be resized manually by the user, so its size must be checked before any adjustment.
  The result, `currentHeight`, is passed to the next phase. 
  In this phase, we use the `extraHeight` as our tracked dependency to ensure that the code will run multiple times.
  We encourage you to remove this statement: `console.log('earlyRead: extra height:', this.extraHeight());`.
  If you do this, you will see that the `earlyRead` callback will only execute once and that any manual change to the textarea will be ignored in the next run.

2. **write Phase**: 
  The write phase adds the `extraHeight` value to the captured `currentHeight` and updates the textarea’s height style property.
  This DOM write operation directly adjusts the element’s height in pixels.
  An `onCleanup` function is provided to handle any required cleanup or resources before the next write operation.
  In this example no cleanup is required, but we wanted to mention the fact that long-running tasks (such as a timeout) should be cleaned up. The cleanup will be called before entering the same phase again, or if the effect itself is destroyed.
  The `write` phase then passes the new height, `newHeight`, to the `read` phase.
  Hint: Pass the same value to `read` (eg. `return 100`) and you will see that the follow-up phase won't be executed.
  Setting the same number twice won’t be considered a change, so the `write` phase won’t mark the `read` phase as dirty.

3. **read Phase**: The final `read` phase logs the `newHeight`. 
  We could also read from the DOM in that phase and store the result to a new signal. But in this example this work is not necessary, because the `earlyRead` is already doing that job.

> We encourage you to scroll down to check out our Demo Application. 
  Feel free to follow the hints in the comments to experiment with the specifics of each phase.

## Migration Guide: From Angular Lifecycle Hooks to Signal-Based Reactivity

With Angular 19, the Angular team's broader vision of signal-based components is slowly taking shape.
The long-term goal here is to eventually phase out all traditional lifecycle hooks, except for `ngOnInit` and `ngOnDestroy`.

The addition of `effect()` and `afterRenderEffect()` showcases how Angular is moving in this direction. 
These effects are more intuitive for managing component state changes and post-render interactions, thus making the old lifecycle hooks redundant.
For instance, `afterRenderEffect()` is designed to handle tasks traditionally managed by `ngAfterViewInit` and `ngAfterViewChecked`.

This approach has been in the pipeline for some time. 
In April 2023, Angular’s team outlined this trajectory in their [RFC #49682](https://github.com/angular/angular/discussions/49682). 
The document proposed the introduction of `afterRenderEffect()` as part of a roadmap to replace Angular’s current change detection, moving away from imperative lifecycle hooks to a cleaner, more reactive pattern. 

Migrating from Angular lifecycle hooks to `effect()` and `afterRenderEffect()` is straightforward:
- **ngOnInit / ngOnChanges** → `effect()`: Handles signal-based logic and other state.
- **ngAfterViewInit / ngAfterViewChecked** → `afterRenderEffect()`: Manages DOM manipulations post-render.

Or to put it another way, here’s a direct mapping:

| Lifecycle Hook        | Replacement            |
|-----------------------|------------------------|
| `ngOnInit`            | `effect()`             |
| `ngOnChanges`         | `effect()`             |
| `ngAfterViewInit`     | `afterRenderEffect()`  |
| `ngAfterViewChecked`  | `afterRenderEffect()`  |

Now the only important hook left is actually `ngOnDestroy`.
Will we also get a replacement for this, or will we no longer need this functionality once everything has been completely migrated to signals? 🤔


## Best Practices for Using `effect()` and `afterRenderEffect()`

To make the most of these new APIs, here are a few best practices:

1. **Use `computed()` for simple dependencies**: Reserve `effect()` for more complex or state-dependent operations.
2. **Choose phases carefully in `afterRenderEffect()`**: Stick to the specific phases and avoid `mixedReadWrite` when possible.
3. **Use `onCleanup()` to manage resources**: Always use `onCleanup()` within effects for any resource that needs disposal, especially with animations or intervals.
4. **Direct DOM Manipulations only when necessary**: Remember, Angular’s reactive approach minimizes the need for manual DOM manipulations. 
  Use `afterRenderEffect()` only when Angular’s templating isn’t enough.


## Demo Application

To make it easier to see the effects in action, we’ve created a demo application on GitHub that showcases all the examples discussed in this article.
The first link leads to the source code on GitHub, where you can download it.
The second link opens a deployed version of the application for you to try out.
Last but not least, the third link provides an interactive demo on StackBlitz, where you can edit the source code and see the results in real time.

> **[1️⃣ Source on GitHub: demo-effect-and-afterRenderEffect](https://github.com/angular-schule/demo-effect-and-afterRenderEffect)**  
> **[2️⃣ Deployed application](https://angular-schule.github.io/demo-effect-and-afterRenderEffect/)**  
> **[3️⃣ StackBlitz Demo](https://stackblitz.com/github/angular-schule/demo-effect-and-afterRenderEffect)**  


## Conclusion

Angular’s new `effect()` API opens up new possibilities for reactive state management and `afterRenderEffect()` provides efficient DOM manipulation when needed.
By understanding when to use each API, developers can create responsive and powerful Angular applications with a clean new syntax.

Try out `effect()` and `afterRenderEffect()` in your next Angular project and see how they simplify your state management and DOM interactions!
> **⚠️ Please note that both APIs are in Developer Preview and may still be subject to change!**


<hr>

<small>Thanks to Ferdinand Malcher for review and feedback!</small>

<small>**Cover image:** Composed with Dall-E and Adobe Firefly</small>