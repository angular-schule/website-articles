---
title: 'Angular 19: Mastering effect() and afterRenderEffect()'
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2024-11-07
lastModified: 2024-11-07
keywords:
  - Angular
  - JavaScript
  - Signals
  - Reactive Programming
  - Effect
  - afterRenderEffect
  - Angular 19
language: en
thumbnail: linkedsignal.jpg
sticky: false
---


Angular 19 has a significant change with the simplification of the `effect()` API and [the introduction of `afterRenderEffect()`](https://github.com/angular/angular/pull/57549). 
This change impacts how Angular handles post-render tasks and is especially useful for applications that rely on precise timing for rendering and DOM manipulation. 
In this article, we’ll explore how these two APIs compare, when to use each, and how to take advantage of phased execution with `afterRenderEffect()`.


## Angular 19 vs. Previous Versions: What’s Different?

The `effect()` API was introduced as part of Angular’s new signal-based reactivity model [in Angular 16](https://blog.angular.dev/angular-v16-is-here-4d7a28ec680d).
Angular 19 now introduces a significant update to the `effect()` API, making it easier to manage side effects directly within `effect()` functions, even when they involve setting signals. 

This change marks a departure from Angular’s more restrictive approach, which aimed to discourage setting signals within `effect()` by requiring an `allowSignalWrites` flag to enable this behavior:

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
Please review the [official blog post](https://blog.angular.dev/latest-updates-to-effect-in-angular-f2d2648defcd) that confirms this new guidance.

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
Component effects operate as part of Angular's change detection, which allows them to safely read input signals and manage views dependent on component state.
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

The previous constraints on `effect()` have been removed, it is now more challenging to decide when to use `computed()` or `effect()`.
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
* [`afterNextRender`](https://next.angular.dev/api/core/afterNextRender) *(Registers a callbacks to be invoked the next time the application finishes rendering, during the specified phases.)* 

which are both in **Developer Preview**!

The Angular docs recommend avoiding `afterRender` when possible and suggest specifying explicit phases with `afterNextRender` to avoid significant performance degradation. 
You’ll see a similar recommendation for `afterRenderEffect()`. There is one signature that is intended for use and another that exists but is not recommended.

**But there is one big difference:** values are propagated from phase to phase as signals instead of as plain values.
As a result, later phases may not need to execute if the values returned by earlier phases do not change.


Before we start, some important facts to know about `afterRenderEffect()`:

* **Phased Execution**: These effects can be registered for specific phases of the render cycle. The Angular team recommends adhering to these phases for optimal performance.
* **Signal Integration**: These effects are supposed to work seamlessly with Angular’s signal reactivity system, and signals can be set during the phases.
* **Selective Execution**: These effects run only when they are "dirty" due to signal dependencies. If no signal changes, the effect won’t trigger again.
* **No SSR**: These effects execute only in browser environments, not on the server.

---

This version keeps your wording with just a slight refinement!


### Understanding the Phases

Phased execution is useful for avoiding unnecessary layout recalculations.
We can register for each phase by specifying a callback function.
The first callback receive no parameters.
Each subsequent phase callback will receive the return value of the previously run phase callback **as a signal**.
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

Let’s look at an example to demonstrate these phases.


### Example for `afterRenderEffect()` ??? TODO


## Migration Guide: From Angular Lifecycle Hooks to Signal-Based Reactivity

With Angular 19, the Angular team's broader vision of signal-based components is slowly taking shape.
The long-term goal here is to eventually phase out all traditional lifecycle hooks, except for `ngOnInit` and `ngOnDestroy`.

The addition of `effect()` and `afterRenderEffect()` showcases how Angular is moving in this direction. 
These effects are more intuitive for managing component state changes and post-render interactions, gradually making the old lifecycle hooks redundant.
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
> **⚠️ Please note that both APIs are in developer preview and may still be subject to change!**


<hr>

<small>Thanks to Ferdinand Malcher for review and feedback!</small>

<small>**Cover image:** Generated with ChatGPT</small>
