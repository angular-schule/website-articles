---
title: 'Angular 19: Introducing LinkedSignal for Responsive Local State Management'
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2024-11-04
lastModified: 2024-11-04
keywords:
  - Angular
  - JavaScript
  - Signals
  - Reactive Programming
  - LinkedSignal
  - Angular 19
  - Computed Signals 
language: en
thumbnail: ???.jpg
sticky: false
---


In Angular 19, there’s a [new experimental feature](https://github.com/angular/angular/commit/8311f00faaf282d1a5b1ddca29247a2fba94a692) called a **Linked Signal** that makes it easier to keep track of local state that depends on other signals. 

It lets us create a writable signal that can automatically reset based on changes in other signals. 
This makes it particularly useful for situations where local state needs to stay in sync with dynamic data. 
Here’s a look at what the Linked Signal is, how it works, and some common use cases.


## Contents

* [What is a LinkedSignal?](/blog/2024-11-linked-signal#what-is-a-linkedsignal)
* [Basic Usage of LinkedSignal](/blog/2024-11-linked-signal#basic-usage-of-linkedsignal)
* [Advanced Scenarios for LinkedSignal](/blog/2024-11-linked-signal#advanced-scenarios-for-linkedsignals)
* [LinkedSignal vs. Other Signals](/blog/2024-11-linked-signal#linkedsignal-vs-other-signals)
* [Best Practices for Using LinkedSignal](/blog/2024-11-linked-signal#best-practices-for-using-linked-signal)
* [Demo Application](/blog/2024-11-linked-signal#demo-application)
* [Conclusion](/blog/2024-11-linked-signal#conclusion)


<!-- > **🇩🇪 This article is available in German here: [Angular 19: Einführung von LinkedSignal für die lokale reaktionsfähige Zustandsverwaltung](https://angular-buch.com/blog/2024-11-linked-signal)** -->


## What is a Linked Signal?

A Linked Signal is an experimental feature that Angular 19 introduces to help you manage state that automatically syncs with other signals. 
In simple terms, we receive a writable signal that resets itself when the value of its source signal changes.
A Linked Signal can be created by using the [`linkedSignal()` factory function](https://next.angular.dev/api/core/linkedSignal).


A Linked Signal has the following characteristics:

- **Writable and Reactive**: Like a [`signal`](https://angular.dev/guide/signals#writable-signals), we can update the value of a Linked Signal manually, but it also responds to changes in its source.
- **A Combination of Signal and Computed**: It’s like [`computed`](https://angular.dev/guide/signals#computed-signals) because it derives its value from other signals, but it stays writable, allowing us to override it when needed.


## Basic Usage of Linked Signal

To see how it works, let’s take a look at a complete example. 
Our component has a list of books in the `books` signal.
Then we’re using a Linked Signal to keep track of the *first book* in the list, created by the `linkedSignal()` factory function.
Whenever the list of books changes, the `firstBook` signal will automatically reset to the first book in the updated list.
Up to here, all of this could have been achieved with a Computed Signal.
However, the Linked Signal makes it possible to manually set the value in the `overrideFirstBook()` method.

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
- When `books` changes, `firstBook` recalculates to reflect the first item in the updated list.
- However, we can also override the value manually, as shown with the 'jQuery' book. 


### Use Case with Input Signals

A common use for a Linked Signal could be components that reset based on an input signal. 
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

In this case, whenever selectedBook changes, the value of amount resets to 1.
The input field reflects this change and resets to 1 as well.
This pattern is useful in forms where we want fields to reset to a default state when certain inputs change.

## Advanced Scenarios for Linked Signals

### Nested State Management

Suppose you have nested data such as book properties (`title` and `rating`), and we want these fields to reset when a different `book` is selected. 
Here’s how we could manage this with a Linked Signal:

```typescript
import { Component, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-book',
  template: `
    <p>Title: {{ title() }}</p>
    <p>Rating: {{ rating() }}</p>

    <button (click)="doRateUp()">Rate up</button>
  `,
})
class BookComponent  {
  book = input.required<Book>();
  ratingChange = output<{ isbn: string, newRating: number }>();

  title = computed(() => this.book().title);

  rating = linkedSignal({
    source: this.book,
    computation: book => book.rating,
  });

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

With this setup, both `title` and `rating` reset when `book` changes, helping to keep data synchronized in cases where the structure of state is hierarchical or dependent on specific identifiers. 
While the Linked Signal makes sure that the data resets when necessary, we can still update our local state directly. 
In this example we update `rating` locally and communicate the change back to the parent component.
Since we don’t need to modify the `title` within the component, a simple computed signal fulfils this task.


### Synchronizing Server-Data for Client-Side Edits

A Linked Signal is also helpful when working with server data that needs to be edited locally.
If we’re fetching data from an API but need to allow changes on the client side, we can use `linkedSignal()` to keep local edits in sync with the original server data.
Here is an example that uses data from our HTTP API, fetched through a simple `httpClient` wrapper called `BookStoreService`:

```typescript
import { Component, inject, linkedSignal } from '@angular/core';
import { BookStoreService } from './book-store.service';

@Component({
  selector: 'app-dashboard',
  template: `
    @for (b of books(); track b.isbn) {
      <app-book
        (ratingChange)="handleRatingChange($event)"
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

  handleRatingChange({ isbn, newRating }: { isbn: string, newRating: number }) {
    this.books.update(books => books.map(b => b.isbn === isbn ? {...b, rating: newRating } : b));
  }
}
```

In this example, `books` holds the server data.
Typically, we would use `toSignal()` to convert the RxJS Observable to a signal. 
However, with `toSignal()` alone, we wouldn’t be able to edit the fetched data directly (except by emitting a new item from the Observable). 

Using a Linked Signal, we can still modify the data locally, and any major reset (such as a reload) can restore it to the original source if needed. 
In this example, we’re changing the order of the books whenever the method `changeOrder()` is called.
We're also handling the `ratingChange` event from the previous example.
The corresponding `handleRatingChange` method accepts the identifier `isbn` and the new rating, and replaces the outdated book entity with an updated copy.
To complete the flow, it would also be possible to modify the book data and send the updated state back to the server.


## Linked Signal vs. Other Signals

Here’s a quick comparison with other types of signals in Angular:

- **`signal()`**: Creates a basic writable signal that maintains its value independently of other signals. It has a start value, and the value can be overridden with `set()` and `update()`.
- **`computed()`**: Creates a read-only signal derived from other signals, recalculating automatically but without allowing manual changes.
- **`linkedSignal()`**: Combines the reactivity of `computed()` with the mutability of `signal()`, allowing the value to be updated manually while remaining linked to a source signal.

Use `computed()` for derived data that doesn’t need to be overridden, while `linkedSignal()` is best for state that should reset based on specific dependencies.

## Best Practices for Using Linked Signal

Here are some tips for using Linked Signals effectively:

- **Keep Computation Functions Simple**: Avoid complex calculations in the `computation` function to prevent cyclic dependencies and make your code easier to understand. 
  If a computation leads to a cyclic read of itself, Angular will stop execution with the following error: ["Detected cycle in computations."](https://github.com/angular/angular/blob/7d0ba0cac85220cbbe4044667a51e5b95512f5d6/packages/core/primitives/signals/src/computed.ts#L114)
- **Use for Resetting Patterns**: `linkedSignal()` is ideal for cases where you need to reset a state based on a particular signal, like clearing a form field when a new item is selected. 
  If you don't need reset functionality, consider using `computed()` instead.
- **Consider Effects for Multiple Updates**: If you need multiple signals to react to a single change, using `effect()` might be clearer and more efficient than creating multiple signals with `linkedSignal()`.


## Demo Application

To make it easier to see Linked Signals in action, we’ve created a demo application on GitHub that showcases all the examples discussed in this article.
The first link leads to the source code on GitHub, where you can download it.
The second link opens a deployed version of the application for you to try out.
Last but not least, the third link provides an interactive demo on StackBlitz, where you can edit the source code and see the results in real time.

> **[1️⃣ Source on GitHub: demo-linked-signal](https://github.com/angular-schule/demo-linked-signal)**  
> **[2️⃣ Deployed application](https://angular-schule.github.io/demo-linked-signal/)**
> **[2️⃣ StackBlitz Demo](https://stackblitz.com/github/angular-schule/demo-linked-signal?file=src%2Fapp%2Fbooks%2Fdashboard%2Fdashboard.component.ts)**


## Conclusion

The Linked Signal feature in Angular 19 provides a practical solution for managing state that needs to stay in sync with other signals. 
It fills the gap between `signal()` and `computed()`, offering a new way to handle complex reactive frontends where state synchronization is essential. 
Try out `linkedSignal()` in your Angular project to see how it can simplify your state management. 
Please keep in mind that this API is still experimental and could drastically change based on feedback from the community.

<hr>

<small>**Cover image:** ???. Photo by ???</small>
