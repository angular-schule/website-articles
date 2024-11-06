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
Angular 19 introduces a significant update to the `effect()` API, making it easier to manage side effects directly within `effect()` functions, even when they involve setting signals. 

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
Both help tp maintain cleaner and more declarative state management patterns where possible. 
Good patterns are no longer enforced by the `allowSignalWrites` flag, but instead by useful high-level signal APIs.

With this shift, here’s a new general rule of thumb:
- **Use `effect()`** for tasks traditionally performed in `ngOnInit` or `ngOnChanges`.
- **Use `afterRenderEffect()`** for tasks traditionally handled in `ngAfterViewInit` or `ngAfterViewChecked`, or when you need to interact directly with rendered DOM elements.

Let’s dive into the specifics! 🚀



## Core Differences Between `effect()` and `afterRenderEffect()`

Both `effect()` and `afterRenderEffect()` are designed to track and respond to changes in signals, but they differ in timing and use cases.

- **`effect()`** runs as part of the Angular change detection cycle and can now safely modify signals without any additional flags.
- **`afterRenderEffect()`** is a lower-level API that executes after the DOM has been updated. It’s particularly suited for tasks that require interacting directly with the DOM, such as measuring element sizes or making complex visual updates in phases.

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


## Practical Scenarios and Examples

### When to Choose `effect()` Over `computed()`

Choosing between `effect()` and `computed()` depends on the use case:
- **Use `computed()`** for deriving a value based on other signals, especially when you need a pure, read-only reactive value. 
  We covered `computed()` and `linkedSignal()` in this article: **[Angular 19: Introducing LinkedSignal for Responsive Local State Management](https://angular.schule/blog/2024-11-effect-and-afterRenderEffect)**
- **Use `effect()`** when the operation is more complex, involves multiple signals, or needs to modify signal values, like synchronizing form states or logging events.

Consider the example below, where `effect()` is used to synchronize form fields based on the input signal `currentBook`:

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
In the past, we would have been using `ngOnchanges` to patch the form when the input was changed.


## Introducing `afterRenderEffect()`

The `afterRenderEffect()` function, new in Angular 19, offers phased execution, allowing you to control when tasks occur during the DOM update process.
This is particularly beneficial for UI manipulations that require specific timing to avoid layout shifts and ensure smooth animations.

### Understanding the Phases

`afterRenderEffect()` offers four distinct phases:
1. **earlyRead**: Ideal for reading DOM properties before writes.
2. **write**: Executes DOM write operations.
3. **mixedReadWrite**: Allows for combined reads and writes but should be used sparingly.
4. **read**: Executes DOM reads after writes are completed.

Let’s look at an example to demonstrate these phases.


## TODO: EXAMPLE

### Rules about the phased execution

Phased execution is useful for avoiding unnecessary layout recalculations. 
Here’s a quick guide:

| Phase                 | Rule                   |
|-----------------------|------------------------|
| 1. `earlyRead`        | Use this phase to **read** from the DOM before a subsequent write callback, for example to perform custom layout that the browser doesn't natively support. Prefer the read phase if reading can wait until after the write phase. **Never** write to the DOM in this phase. |
| 2. `write`            | Use this phase to **write** to the DOM. **Never** read from the DOM in this phase. |
| 3. `mixedReadWrite`   | Use this phase to read from and write to the DOM simultaneously. **Never** use this phase if it is possible to divide the work among the other phases instead. |
| 4. `read`             | Use this phase to **read** from the DOM. **Never** write to the DOM in this phase. |

According to the docs, you should prefer using the `read` and `write` phases over the `earlyRead` and `mixedReadWrite` phases when possible, to avoid performance degradation.


## Migration Guide: From Angular Lifecycle Hooks to Signal-Based Reactivity

With Angular 19, we're witnessing the Angular team’s broader vision of Signal-based Components start to take shape.
The long-term goal here is to eventually phase out all traditional lifecycle hooks, except for `ngOnInit` and `ngOnDestroy`.

The recent addition of `effect()` and `afterRenderEffect()` showcases how Angular is moving in this direction. 
These reactivity tools are more intuitive for managing component state changes and post-render interactions, gradually making other lifecycle hooks redundant.
For instance, `afterRenderEffect()` is designed to handle tasks traditionally managed by `ngAfterViewInit` and `ngAfterViewChecked`, allowing developers to write more predictable and declarative code.

This approach has been in the pipeline for some time. 
In April 2023, Angular’s team outlined this trajectory in their [RFC #49682](https://github.com/angular/angular/discussions/49682). 
The document proposed the introduction of `afterRenderEffect()` as part of a roadmap to replace Angular’s current change detection and lifecycle management, moving away from imperative lifecycle hooks to a cleaner, more reactive pattern. 

Migrating from Angular lifecycle hooks to `effect()` and `afterRenderEffect()` is straightforward:
- **ngOnInit / ngOnChanges** → `effect()`: Handles state or signal-based logic.
- **ngAfterViewInit / ngAfterViewChecked** → `afterRenderEffect()`: Manages DOM manipulations post-render.

Or to put it another way, here’s a direct mapping:

| Lifecycle Hook        | Replacement            |
|-----------------------|------------------------|
| `ngOnInit`            | `effect()`             |
| `ngOnChanges`         | `effect()`             |
| `ngAfterViewInit`     | `afterRenderEffect()`  |
| `ngAfterViewChecked`  | `afterRenderEffect()`  |


## Best Practices for Using `effect()` and `afterRenderEffect()`

To make the most of these new APIs, here are a few best practices:

1. **Use `computed()` for simple dependencies**: Reserve `effect()` for more complex or state-dependent operations.
2. **Choose phases carefully in `afterRenderEffect()`**: Stick to specific phases to avoid layout thrashing, and avoid `mixedReadWrite` when possible.
3. **Use `onCleanup()` to manage resources**: Always use `onCleanup()` within effects for any resource that needs disposal, especially with animations or intervals.
4. **Direct DOM Manipulations only when necessary**: Remember, Angular’s reactive approach minimizes the need for manual DOM manipulations. 
  Use these APIs only when Angular’s templating isn’t enough.


## Demo Application

To make it easier to see Linked Signals in action, we’ve created a demo application on GitHub that showcases all the examples discussed in this article.
The first link leads to the source code on GitHub, where you can download it.
The second link opens a deployed version of the application for you to try out.
Last but not least, the third link provides an interactive demo on StackBlitz, where you can edit the source code and see the results in real time.

> **[1️⃣ Source on GitHub: demo-effect-and-afterRenderEffect](https://github.com/angular-schule/demo-effect-and-afterRenderEffect)**  
> **[2️⃣ Deployed application](https://angular-schule.github.io/demo-effect-and-afterRenderEffect/)**  
> **[3️⃣ StackBlitz Demo](https://stackblitz.com/github/angular-schule/demo-effect-and-afterRenderEffect)**  


## Conclusion

Angular’s new `effect()` and `afterRenderEffect()` APIs open up new possibilities for reactive and efficient DOM manipulation with the new world of signals.
By understanding when to use each, leveraging phased execution, and carefully managing dependencies, developers can create responsive and performant Angular applications. 

Try out `effect()` and `afterRenderEffect()` in your next Angular 19 project, and see how they streamline state management and DOM interactions!


<hr>

<small>Thanks to Danny Koppenhagen for review and feedback!</small>

<small>**Cover image:** Generated with ChatGPT</small>
