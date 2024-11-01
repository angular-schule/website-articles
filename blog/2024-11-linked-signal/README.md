---
title: 'Angular 19: Introducing LinkedSignal for Responsive Local State Management'
author: Johannes Hoppe and Ferdinand Malcher
mail: team@angular.schule
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


In Angular 19, there's a [new feature](https://github.com/angular/angular/commit/8311f00faaf282d1a5b1ddca29247a2fba94a692) that makes it easier to keep track of local state that depends on other signals. 
This feature is called `linkedSignal`. 
It lets us create a writable signal that can automatically reset based on changes in other signals. 
This makes it particularly useful for situations where local state needs to stay in sync with dynamic data. 
Let’s go over what `linkedSignal` is, how it works, and some common use cases.


## Contents

* [What is LinkedSignal?](/blog/2024-11-linked-signal#what-is-linkedSignal)
* [Basic Usage of LinkedSignal](/blog/2024-11-linked-signal#basic-usage-of-linkedSignal)
* [Advanced Scenarios for LinkedSignal](/blog/2024-11-linked-signal#advanced-scenarios-for-linkedSignal)
* [LinkedSignal vs. Other Signals](/blog/2024-11-linked-signal#linkedSignal-vs-other-signals)
* [Best Practices for Using LinkedSignal](/blog/2024-11-linked-signal#best-practices-for-using-linkedSignal)
* [Conclusion](/blog/2024-11-linked-signal#conclusion)


<!-- > **🇩🇪 This article is available in German here: [Angular 19: Einführung von LinkedSignal für die lokale reaktionsfähige Zustandsverwaltung](https://angular-buch.com/blog/2024-11-linked-signal)** -->


## What is LinkedSignal?

`linkedSignal` is an experimental signal that Angular 19 introduces to help you manage state that automatically syncs with other signals. In simple terms, it’s a writable signal that resets itself when the value of its source signal changes.

LinkedSignal has the following characteristics:

- **Writable and Reactive**: Like [`signal`](https://angular.dev/guide/signals#writable-signals), we can update the value of a `linkedSignal` manually, but it also responds to changes in its source.
- **A Combination of Signal and Computed**: It’s like [`computed`](https://angular.dev/guide/signals#computed-signals) because it derives its value from other signals, but it stays writable, allowing us to override it when needed.


## Basic Usage of LinkedSignal

To see how it works, let’s look at a complete example. 
Here, we’re using `linkedSignal` to keep track of the first book in a list. 
Whenever the list of books changes, the `firstBook` signal will automatically reset to the first book in the updated list.

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
    // Manually updating the linkedSignal, which now returns 'jQuery'
    this.firstBook.set('jQuery');
  }

  changeBookList() {
    // Changing `books` causes the linkedSignal to reset, now returning 'Next.js'
    this.books.set(['Next.js', 'Svelte', 'Nuxt']);
  }
}
```

In this example:
- The signal `firstBook` initially points to the first book in the list of `books`.
- When `books` changes, `firstBook` recalculates to reflect the first item in the updated list.
- However, we can also overide the value manually, as shown with the 'jQuery' book. 


### Use Case with Input Signals

A common use for `linkedSignal` could be components that reset based on an input signal. 
For example, a shopping cart component might want to reset the quantity field when the selected product changes. We could already achieve the same result with `computed`, but additionally we also want to be able to set the quantity based on the users input.

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
This pattern is useful in forms where we want fields to return to a default state when certain inputs change.

## Advanced Scenarios for LinkedSignal

### Nested State Management

Suppose you have nested data such as book properties (`title` and `rating`), and we want these fields to reset when a different `book` is selected. 
Here’s how we could manage this with `linkedSignal`:

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

  title = linkedSignal({
    source: this.book,
    computation: book => book.title,
  });

  rating = linkedSignal({
    source: this.book,
    computation: book => book.rating,
  });

  doRateUp() {
    this.rating.update(rating => rating + 1);

    this.ratingChange.emit({ 
      isbn: this.book().isbn(),
      newRating
    });
  }
}
```

With this setup, both `title` and `rating` reset when `book` changes, helping to keep data synchronized in cases where the structure of state is hierarchical or dependent on specific identifiers. 
While the `linkedSignal` makes sure that the data resets when necessary, we can still update our local state directly. 
In this example we update `rating` locally and communicate the change back to the parent component.

### Synchronizing Server-Data for Client-Side Edits

`linkedSignal` can also help when dealing with data from a server that we want to edit locally.
If we're fetching data from an API but need to allow changes on the client side, we can use `linkedSignal` to keep local edits in sync with the original server data.
Here is an example that uses some books from our API:


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
    const sortedBooks = this.books().toSorted((a, b) => b.rating - a.rating);
    this.books.set(sortedBooks);
  }
}
```

In this example, `books` holds the server data.
Usually we would directly use `toSignal()` to bridge the gap between the Observable from RxJS and the new signal world. However, in this case, we would have no chance to edit the signal in any way (except by updating the Observable). 

But with the help of `linkedSignal` we can still modify the data locally, and any major reset (such as a reload) can restore it to the original source if needed. 
In this example we are just sorting the list, but it could be also possible to change data of the books and send the data back to the server.
There are many ways to use this new signal in our applications.


## LinkedSignal vs. Other Signals

Here’s a quick comparison of `linkedSignal` with other types of signals in Angular:

- **`signal()`**: Creates a basic writable signal that maintains its value independently of other signals.
- **`computed()`**: Creates a read-only signal derived from other signals, recalculating automatically but without allowing manual changes.
- **`linkedSignal()`**: Combines the reactivity of `computed()` with the mutability of `signal()`, allowing manual updates while staying linked to a source signal.

Use `computed()` for derived data that doesn’t need to be overridden, while `linkedSignal()` is best for state that should reset based on specific dependencies.

## Best Practices for Using LinkedSignal

Here are some tips for using `linkedSignal` effectively:

- **Keep Computation Functions Simple**: Avoid complex calculations in the `computation` function to prevent cyclic dependencies and make your code easier to understand.
- **Use for Resetting Patterns**: `linkedSignal` is ideal for cases where you need to reset a state based on a particular signal, like clearing a form field when a new item is selected.
- **Consider Effects for Multiple Updates**: If you need multiple signals to react to a single change, using `effect()` might be clearer and more efficient than creating multiple instances of `linkedSignal`.

## Conclusion

The `linkedSignal` feature in Angular 19 provides a practical solution for managing state that needs to stay in sync with other signals. 
It fills a gap between `signal()` and `computed()`, giving you a new way to handle complex, reactive frontends where state synchronization is essential. 
Try out `linkedSignal` in your Angular projects to see how it can simplify your state management. 
Please keep in mind that this API is still experimental and could drastically change based on community feedback.

<hr>

<small>**Cover image:** ???. Photo by ???</small>
