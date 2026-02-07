---
title: 'Angular 19: Introducing LinkedSignal for Responsive Local State Management'
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
author2: Ferdinand Malcher
mail2: mail@fmalcher.de
published: 2024-11-04
lastModified: 2024-12-04
keywords:
  - Angular
  - JavaScript
  - Signals
  - Reactive Programming
  - Linked Signal
  - Angular 19
  - Computed Signals 
language: en
header: linkedsignal.jpg
sticky: false
---


In Angular 19, there's a [new feature](https://github.com/angular/angular/commit/8311f00faaf282d1a5b1ddca29247a2fba94a692) called a **Linked Signal** that makes it easier to keep track of local state that depends on other signals. It lets us create a writable signal that can automatically reset based on changes in other signals. 
This makes it particularly useful for situations where local state needs to stay in sync with dynamic data. 
Here's a look at what the Linked Signal is, how it works, and some common use cases.


## Contents

* [What is a Linked Signal?](#what-is-a-linked-signal)
* [Basic Usage of Linked Signal](#basic-usage-of-linked-signal)
* [Advanced Scenarios for Linked Signals](#advanced-scenarios-for-linked-signals)
* [Linked Signal vs. Other Signals](#linked-signal-vs-other-signals)
* [Best Practices for Using Linked Signal](#best-practices-for-using-linked-signal)
* [Demo Application](#demo-application)
* [Conclusion](#conclusion)


> **🇩🇪 This article is available in German language here: [Neu in Angular 19: LinkedSignal für reaktive Zustandsverwaltung](https://angular-buch.com/blog/2024-11-linked-signal)**


## What is a Linked Signal?

A Linked Signal is a new feature that Angular 19 introduces to help you manage state that automatically syncs with other signals.
In simple terms, we receive a writable signal that resets itself when the value of its source signal changes.
A Linked Signal can be created by using the [`linkedSignal()` factory function](https://next.angular.dev/api/core/linkedSignal).


A Linked Signal has the following characteristics:

- **Writable and Reactive**: Like a [`signal`](https://angular.dev/guide/signals#writable-signals), we can update the value of a Linked Signal manually, but it also responds to changes in its source.
- **A Combination of Signal and Computed**: It's like [`computed`](https://angular.dev/guide/signals#computed-signals) because it derives its value from other signals, but it stays writable, allowing us to override it when needed.

By combining these characteristics, Linked Signals provide a flexible way to manage state that adapts to changes in related signals but can also be directly controlled when required.
To understand the flexibility, consider the following example which compares Computed and Linked Signals:

```ts
import { computed, linkedSignal } from '@angular/core';

const timestampMs = signal(Date.now());

// computed(): Signal (not writable)
const timestampSeconds = computed(() => timestampMs() / 1000);
timestampSeconds.set(0); // ❌ compilation error

// linkedSignal(): WritableSignal
const timestampSecondsLinked = linkedSignal(() => timestampMs() / 1000);
timestampSecondsLinked.set(0); // ✅ works
```

The signature and usage of `computed()` and `linkedSignal()` look very similar: Both accept a computation function which updates the result value of the signal when any of the bound signals (here: `timestampMs`) changes.
The difference lies in their return types: While `computed()` returns a read-only `Signal`, the new `linkedSignal()` function creates a `WritableSignal`.

That means, we can override the value using `set()` and `update()` whenever required.
A signal created with `computed()` does not allow modifying the value manually.

In this first example, we used the **shorthand syntax** for the Linked Signal.
It is also possible to separate the computation into a second function.
The value of the source is automatically passed into the computation function.

```ts
const timestampMs = signal(Date.now());

const timestampSecondsLinked = linkedSignal({
  source: timestampMs,
  computation: ms => ms / 1000
});
```

Whether or not to use the the more elaborate options object with `source` and `computation` over the simpler shorthand syntax depends on use-case and taste.
Both examples for `timestampSecondsLinked` above have the exact same behaviour.
In more complex cases, a separate computation function might make the code more readable.


## Basic Usage of Linked Signal

To see how it works, let's take a look at a complete example. 
Our component has a list of books in the `books` signal.
Then we're using a Linked Signal to keep track of the *first book* in the list.
We decided to use the full notation with an options object. The separate computation makes it more readable, compared to a one-line function that combines source and computation.

Whenever the list of books changes (e.g. through the `changeBookList()` method), the `firstBook` signal will automatically recalculate its value to the first book in the updated list.
Up to here, all of this could have been achieved with a Computed Signal.
However, the Linked Signal makes it possible to manually override the value in the `overrideFirstBook()` method.

```typescript
import { Component, linkedSignal, signal } from '@angular/core';

@Component({
  selector: 'app-book-list',
  template: `
    <p>First book in list: {{ firstBook() }}</p>
    <button (click)="changeBookList()">Change Book List</button>`
})
export class BookListComponent {
  books = signal(['Angular', 'React', 'Vue']);

  firstBook = linkedSignal({
    source: this.books,
    computation: books => books[0]
  });

  // this also works (shorthand notation)
  // firstBook = linkedSignal(() => this.books()[0]);

  overrideFirstBook() {
    // Manually updating `firstBook`, which now returns 'jQuery'
    this.firstBook.set('jQuery');
  }

  changeBookList() {
    // Changing `books` causes `firstBook` to reset, now returning 'Next.js'
    this.books.set(['Next.js', 'Svelte', 'Nuxt']);
  }
}
```

In this example:
- The Linked Signal `firstBook` initially points to the first book in the list of `books`.
- We can override the value manually at any time, as shown with the "jQuery" book.
- When `books` changes, `firstBook` recalculates to reflect the first item in the updated list.

The signal always holds the latest value – either set manually through `set()`/`update()` or calculated by the computation function when the source changes.


### Use Case with Input Signals

A common use for a Linked Signal is a component that resets based on an input signal. 
For example, a shopping cart component might want to reset the quantity field when the selected product changes. 
While we could achieve the same result with `computed`, we also want to be able to set the quantity based on the user's input.

```typescript
import { Component, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-shopping-cart',
  template: `
    <p>Book: {{ selectedBook().title }}</p>
    <input [(ngModel)]="amount">`,
  imports: [FormsModule]
})
export class ShoppingCartComponent {
  selectedBook = input.required<Book>();
  amount = linkedSignal({
    source: this.selectedBook,
    computation: () => 1 // Resets to 1 when selectedBook changes
  });
}
```

In this case, whenever `selectedBook` changes, the value of `amount` resets to 1.
The `<input>` field in the template reflects this change and resets to 1 as well.
This pattern is useful in forms where we want fields to reset to a default state when certain inputs change.

For this use-case, the full notation with `source` and `computation` is the most straight-forward way: We are not interested in the actual value of `selectedBook`. Instead, we just want to reset the value to `1` whenever `selectedBook` changes. This is why we separated `source` and `computation`.

## Advanced Scenarios for Linked Signals

### Nested State Management

Suppose you have nested data such as book properties (`title` and `rating`), and we want these fields to reset when a different `book` is selected. 
Here's how we could manage this with a Linked Signal:

```typescript
import { Component, computed, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-book',
  template: `
    <p>Title: {{ title() }}</p>
    <p>Rating: {{ rating() }}</p>

    <button (click)="doRateUp()">Rate up</button>
  `,
})
export class BookComponent  {
  book = input.required<Book>();
  ratingChange = output<{ isbn: string, newRating: number }>();

  title = computed(() => this.book().title);
  rating = linkedSignal(() => this.book().rating);

  // this also works (full notation)
  /*rating = linkedSignal({
    source: this.book,
    computation: book => book.rating,
  });*/

  doRateUp() {
    const newRating = this.rating() + 1;
    this.rating.set(newRating);

    this.ratingChange.emit({ 
      isbn: this.book().isbn,
      newRating
    });
  }
}
```

Our properties `title` and `rating` are derived from the `book` source.
Both `title` and `rating` recalculate their values when `book` changes, helping to keep data synchronized in cases where the structure of state is hierarchical or dependent on specific identifiers.
While the Linked Signal makes sure that the data resets when necessary, we can still update our local state directly.
In this example we update `rating` locally and communicate the change back to the parent component.
Since we don't need to modify the `title` within the component, a Computed Signal fulfils this task.

We used the shorthand notation for the Linked Signal because the computation is very simple.
Also, compared to `computed()`, both lines look very similar.
However, depending on your taste, the full notation is also possible.


### Synchronizing Server-Data for Client-Side Edits

A Linked Signal is also helpful when working with server data that needs to be edited locally.
If we're fetching data from an API but need to allow changes on the client side, we can use `linkedSignal()` to keep local edits in sync with the original server data.
Here is an example that uses data from our HTTP API, fetched through a simple `HttpClient` wrapper called `BookStoreService`:

```typescript
import { Component, inject, linkedSignal } from '@angular/core';
import { BookStoreService } from './book-store.service';

@Component({
  selector: 'app-dashboard',
  template: `
    @for (b of books(); track b.isbn) {
      <app-book
        (ratingChange)="handleRatingChange($event.isbn, $event.newRating)"
        [book]="b"
      />
    } 

    <button (click)="changeOrder()">Change order (locally)</button>
  `,
})
export class DashboardComponent {
  private bookStore = inject(BookStoreService);

  books = linkedSignal(
    toSignal(this.bookStore.getAllBooks(), { initialValue: [] })
  );

  changeOrder() {
    this.books.update(books => books.toReversed());
  }

  handleRatingChange(isbn: string, newRating: number) {
    this.books.update(books =>
      books.map(b => {
        // if this is the book we want to update, set the new rating
        if (b.isbn === isbn) {
          return { ...b, rating: newRating };
        } else {
          // leave all other books in the list unchanged
          return b;
        }
      })
    );
  }
}
```

In this example, `books` holds the server data.
Typically, we would use `toSignal()` to convert the RxJS Observable to a signal. 
However, with `toSignal()` alone, we wouldn't be able to edit the fetched data directly (except by emitting a new item from the Observable). 

Using a Linked Signal, we can still modify the data locally, and any major reset (such as a reload) can restore it to the original source if needed.

We used the shorthand notation for `linkedSignal()` and passed in the signal from `toSignal()` directly. This is because we only want to convert the source into a Linked Signal. There is no need for an additional computation.

We then change the order of the book list whenever the method `changeOrder()` is called.
We're also handling the `ratingChange` event from the previous example.
The corresponding `handleRatingChange()` method accepts the identifier `isbn` and the new rating, and replaces the outdated book entity with an updated copy.
To complete the flow, it would also be possible to modify the book data and send the updated state back to the server.

> ℹ️ **Did you know?** Angular introduced the new experimental **Resource API** in version 19. It allows you to load data asynchronously while keeping the result signal writable.
> We presented the Resource API in a separate blog post (in German 🇩🇪): **[Die neue Resource API von Angular](https://angular-buch.com/blog/2024-10-resource-api)**


### Connecting Reactive Forms with Signals

We can even use Linked Signals for building helpers that connect other worlds to signals.
For example, this wrapper function synchronises a `FormControl` (or any other control) from Angular's Reactive Forms with a signal.
Data is synchronized bidirectionally: When the form value changes (`valueChanges`), the signal value will be updated.
The signal returned from the function is writable, so whenever we change the value in the signal, the form value will be updated (`setValue()`).

```ts
export function signalFromControl<T>(control: AbstractControl<T>) {
  const controlSignal = linkedSignal(
    toSignal(control.valueChanges, { initialValue: control.value })
  );
  effect(() => control.setValue(controlSignal()));
  return controlSignal;
}
```

In this example, you see an effect that establishes a **reactive listener**, which automatically responds to changes in signals. The function inside `effect()` makes sure that whenever the signal `controlSignal` changes, the form control value is updated via `setValue()`. This creates a **two-way synchronization** between the signal and the form control.
For a more detailed exploration of `effect()` and its capabilities, read our article: **[Angular 19: Mastering effect and afterRenderEffect](/blog/2024-11-effect-afterrendereffect)**.

The helper can be used as follows:

```ts
bookForm = new FormGroup({
  isbn: new FormControl('', { nonNullable: true }),
  title: new FormControl('', { nonNullable: true }),
});

title = signalFromControl(this.bookForm.controls.title);

// ...
// Form value will be updated to 'Angular'
this.title.set('Angular');

// Signal value will be updated to 'Signals'
this.bookForm.setValue({ isbn: '123', title: 'Signals' });
```



## Linked Signal vs. Other Signals

Here's a quick comparison with other types of signals in Angular:

- **`signal()`**: Creates a basic writable signal that maintains its value independently of other signals. It has a start value, and the value can be overridden with `set()` and `update()`.
- **`computed()`**: Creates a read-only signal derived from other signals, recalculating automatically but without allowing manual changes.
- **`linkedSignal()`**: Combines the reactivity of `computed()` with the mutability of `signal()`, allowing the value to be updated manually while remaining linked to a source signal.

We recommend to only use `linkedSignal()` for state that should reset based on specific dependencies. Please continue to use `computed()` for derived data that doesn't need to be overridden.

## Best Practices for Using Linked Signal

Here are some tips for using Linked Signals effectively:

- **Keep Computation Functions Simple**: Avoid complex calculations in the `computation` function to prevent cyclic dependencies and make your code easier to understand. 
  If a computation leads to a cyclic read of itself, Angular will stop execution with the following error: ["Detected cycle in computations."](https://github.com/angular/angular/blob/7d0ba0cac85220cbbe4044667a51e5b95512f5d6/packages/core/primitives/signals/src/computed.ts#L114)
- **Use for Resetting Patterns**: `linkedSignal()` is ideal for cases where you need to reset a state based on a particular signal, like clearing a form field when a new item is selected. 
  If you don't need reset functionality, consider using `computed()` instead.
- **Consider Effects for Multiple Updates**: If you need multiple signals to react to a single change, using `effect()` might be clearer and more efficient than creating multiple signals with `linkedSignal()`.


## Demo Application

To make it easier to see Linked Signals in action, we've created a demo application on GitHub that showcases all the examples discussed in this article.
The first link leads to the source code on GitHub, where you can download it.
The second link opens a deployed version of the application for you to try out.
Last but not least, the third link provides an interactive demo on StackBlitz, where you can edit the source code and see the results in real time.

> **[1️⃣ Source on GitHub: demo-linked-signal](https://github.com/angular-schule/demo-linked-signal)**<br>
> **[2️⃣ Deployed application](https://angular-schule.github.io/demo-linked-signal/)**<br>
> **[3️⃣ StackBlitz Demo](https://stackblitz.com/github/angular-schule/demo-linked-signal?file=src%2Fapp%2Fbooks%2Fdashboard%2Fdashboard.component.ts)**


## Conclusion

The Linked Signal feature in Angular 19 provides a practical solution for managing state that needs to stay in sync with other signals. 
It fills the gap between `signal()` and `computed()`, offering a new way to handle complex reactive frontends where state synchronization is essential. 
Try out `linkedSignal()` in your Angular project to see how it can simplify your state management. 
**⚠️ Please note the API is still in Developer Preview and may be subject to change!**

<hr>

<small>Thanks to Danny Koppenhagen for review and feedback!</small>

<small>**Cover image:** Generated with Adobe Firefly</small>
