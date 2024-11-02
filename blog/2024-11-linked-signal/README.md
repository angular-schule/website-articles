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


In Angular 19, there's a [new experimental feature](https://github.com/angular/angular/commit/8311f00faaf282d1a5b1ddca29247a2fba94a692) called a **Linked Signal** that makes it easier to keep track of local state that depends on other signals. 

It lets us create a writable signal that can automatically reset based on changes in other signals. 
This makes it particularly useful for situations where local state needs to stay in sync with dynamic data. 
Here’s a look at what the Linked Signal is, how it works, and some common use cases.


## Contents

* [What is LinkedSignal?](/blog/2024-11-linked-signal#what-is-linkedSignal)
* [Basic Usage of LinkedSignal](/blog/2024-11-linked-signal#basic-usage-of-linkedSignal)
* [Advanced Scenarios for LinkedSignal](/blog/2024-11-linked-signal#advanced-scenarios-for-linkedSignal)
* [LinkedSignal vs. Other Signals](/blog/2024-11-linked-signal#linkedSignal-vs-other-signals)
* [Best Practices for Using LinkedSignal](/blog/2024-11-linked-signal#best-practices-for-using-linkedSignal)
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
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-book-list',
  template: `
    <p>First book in list: {{ firstBook() }}</p>
    <button (click)="changeBookList()">Change Book List</button>
  `,
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
@Component({
  selector: 'app-shopping-cart',
  template: `
    <p>Book: {{ selectedBook().title }}</p>
    <input [(ngModel)]="amount" />
  `,
  standalone: true
})
class ShoppingCartComponent {
  selectedBook = input.required<Book>();
  amount = linkedSignal({
    source: this.selectedBook,
    computation: () => 1 // Resets to 1 when selectedBook changes
  });
}
```

In this case, whenever `selectedBook` changes, the `amount` input resets to `1`. 
This pattern is useful in forms where we want fields to reset to a default state when certain inputs change.

## Advanced Scenarios for Linked Signals

### Nested State Management

Suppose you have nested data such as book properties (`title` and `rating`), and we want these fields to reset when a different `book` is selected. 
Here’s how we could manage this with a Linked Signal:

```typescript
import { Component, input, linkedSignal } from '@angular/core';
import { Book } from './book';

@Component({
  selector: 'app-book',
  template: `
    <p>Title: {{ title() }}</p>
    <p>Rating: {{ rating() }}</p>

    <button (click)="doRateUp()">Rate up!</button> 
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
Since we don't need to modify the `title` within the component, a simple computed signal fulfils this task.


### Synchronizing Server-Data for Client-Side Edits

A Linked Signal can also help when working with server data that needs to be edited locally.
If we're fetching data from an API but need to allow changes on the client side, we can use `linkedSignal()` to keep local edits in sync with the original server data.
Here is an example that uses some books from our HTTP API with a `BookStoreService`:


```typescript
import { Component, inject, linkedSignal } from '@angular/core';
import { BookStoreService } from './book-store.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <ul>
      @for (book of books(); track book.isbn) {
        <li>{{ book.title }}</li>
      }
    </ul>

    <button (click)="sortBooks()">Sort books by rating (locally)</button>
  `,
})
export class DashboardComponent {
  private bookStore = inject(BookStoreService);

  books = linkedSignal(toSignal(this.bookStore.getAllBooks()));

  sortBooks() {
    this.books.update(books => books.toSorted((a, b) => b.rating - a.rating);
  }
}
```

In this example, `books` holds the server data.
Usually we would directly use `toSignal()` to bridge the gap between the Observable from RxJS and the new signal world. 
However, in this case, we wouldn’t be able to edit the fetched data in any way (except by emitting a new item from the Observable). 

But with the help of a Linked Signal, we can still modify the data locally, and any major reset (such as a reload) can restore it to the original source if needed. 
In this example, we’re just sorting the list, but it would also be possible to change the book data and send the updated state back to the server.


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

## Conclusion

The Linked Signal feature in Angular 19 provides a practical solution for managing state that needs to stay in sync with other signals. 
It fills the gap between `signal()` and `computed()`, offering a new way to handle complex reactive frontends where state synchronization is essential. 
Try out `linkedSignal()` in your Angular project to see how it can simplify your state management. 
Please keep in mind that this API is still experimental and could drastically change based on feedback from the community.

<hr>

<small>**Cover image:** ???. Photo by ???</small>
