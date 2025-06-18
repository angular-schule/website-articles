---
title: 'Reactive Angular: Loading Data with the Resource API'
author: Ferdinand Malcher
mail: ferdinand@malcher.media
published: 2025-05-13
lastModified: 2025-06-18
keywords:
  - Resource API
  - Promise
  - Observable
  - resource
  - rxResource
  - Fetch API
language: en
header: header-resource-api.jpg
---

An interesting new feature in Angular is the *Resource API*. It allows us to intuitively load data and process it in components.
In this blog post, we introduce the ideas behind this new interface.

A Resource represents a data set that is loaded asynchronously. This usually involves HTTP requests to fetch data from a server. However, Resource goes a step further than just executing a simple HTTP request: The data can be reloaded at any time or even manually overwritten. Additionally, Resource independently provides information about the loading state. All information and data are exposed as signals, ensuring the current value is always available when changes occur.


> 🇩🇪 This article is available in German language here: [Neu in Angular 19: Daten laden mit der Resource API](https://angular-buch.com/blog/2024-10-resource-api)


## What happened before: Example without Resource

To start, let's consider a scenario implemented in the classic way, without the new Resource API.

We want to display a list of books in a component, which will be loaded via HTTP from a server.
The corresponding `BookStore` service already exists and is injected via dependency injection. The `getAll()` method in the service uses Angular's `HttpClient` and returns an Observable.

In the component, we need a `books` property to cache the data for display in the template.
The property is initialized as a signal, following modern practices.
In the constructor, we subscribe to the Observable from `getAll()`. As soon as the list of books arrives from the server, we set the data on the `books` signal.

```ts
@Component({ /* ... */ })
export class BookList {
  #bs = inject(BookStore);
  books = signal<Book[]>([]);

  constructor() {
    this.#bs.getAll().subscribe(receivedBooks => {
      this.books.set(receivedBooks);
    });
  }
}
```

However, it usually doesn't stop with this simple scenario as additional requirements arise:

- **The book list should be reloadable on button click.** This requires creating a new method (e.g., `reloadList()`) to restart the HTTP request, subscribe again, etc. This duplicates the constructor code.
- **No parallel requests should be made.** If data is to be reloaded while a previous request is still running, it should either be canceled or the new request ignored.
- **A loading indicator should be shown.** We could add a `loading` property and toggle it to `true` or `false` at the appropriate points.
- **Data should be modifiable/overwritable locally.** We could set a new value on the signal. But afterwards, we wouldn't know whether the value was set locally or loaded from the server.
- **The subscription should end when the component is destroyed.** For this we can use [`takeUntilDestroyed()`](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed) or another RxJS-based solution.

All these aspects can of course be implemented with moderate effor, but we often need to repeat similar steps to achieve our goal.
Instead of using imperative style as shown, we could also use RxJS. However, the core issue remains: it's relatively tedious to implement recurring everyday tasks.

The new Resource API aims to fill this gap!

## The new Resource API

A Resource represents data loaded via a loader function.
We initialize it using the `resource()` function.
The provided loader is a function that performs the asynchronous data loading.
This loader runs immediately when the Resource is initialized.

The documentation describes the Resource as follows:

> A Resource is an asynchronous dependency (for example, the results of an API call) that is managed and delivered through signals.
> [It] projects a reactive request to an asynchronous operation defined by a loader function, which exposes the result of the loading operation via signals.

```ts
import { resource } from '@angular/core';
// ...

myResource = resource({
  loader: () => /* load data */
});
```

Interestingly, the loader must return a Promise. Though there is nothing wrong with this native browser model, Angular has traditionally used Observables and RxJS for asynchronous operations.
Angular breaks from tradition here by favoring the browser's native construct.

To perform an HTTP request using a Resource, we have three options:

- 1.) Use an HTTP client that returns Promises, such as the native `fetch()` or the `axios` library.
- 2.) Use the `firstValueFrom()` function from RxJS to convert an Observable into a Promise that resolves with the first item.
- 3.) Use an `rxResource`, which uses an Observable as the loader. More on that later!



### Option 1: Promises and the native Fetch API

In the `BookStore`, we use the native Fetch API so that the `getAll()` method returns a Promise. In the loader, we can use this Promise directly.

```ts
@Injectable({ /* ... */ })
export class BookStore {
  // ...
  getAll(): Promise<Book[]> {
    return fetch(this.apiUrl + '/books').then(res => res.json());
  }
}
```

```ts
// Component
booksResource = resource({
  loader: () => this.#bs.getAll()
});
```

### Option 2: Observables and Angular's `HttpClient`

We use Angular's `HttpClient` as usual, so the `getAll()` method returns an Observable.
To define the loader, we must convert the Observable to a Promise using `firstValueFrom()`.

```ts
@Injectable({ /* ... */ })
export class BookStore {
  // ...
  getAll(): Observable<Book[]> {
    return this.http.get<Book[]>(this.apiUrl + '/books');
  }
}
```

```ts
// Component
booksResource = resource({
  loader: () => firstValueFrom(this.#bs.getAll())
});
```

## Accessing the data

The loader is executed immediately when the Resource object is initialized. The Resource processes the response and offers the following signals to work with the data:

- `value`: loaded data, here `Book[]`
- `status`: state of the Resource, type `ResourceStatus`, e.g., `resolved` or `loading`, see next section
- `error`: error

We can display the loaded books in the template like this:

```html
{{ booksResource.value() | json }}

@for(book of booksResource.value(); track book.isbn) {
  <p>{{ book.title }}</p>
}
```

## Status of the Resource

Using the `status` signal, we can evaluate the state of the Resource, e.g., to show a loading indicator. All `status` values are defined by the [`ResourceStatus` union type](https://angular.dev/api/core/ResourceStatus):

| Status from `ResourceStatus` | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| `idle`                       | No params are defined and nothing is loading. `value()` is `undefined`. |
| `error`                      | Loading failed. `value()` is `undefined`.                               |
| `loading`                    | The Resource is currently loading.                                      |
| `reloading`                  | The Resource is reloading after `reload()` was called.                  |
| `resolved`                   | Loading is complete.                                                    |
| `local`                      | The value was overwritten locally.                                      |


For a loading indicator, we could process the state in a computed signal and return a boolean if the Resource is currently loading:

```ts
import { resource, computed, ResourceStatus } from '@angular/core';
// ...

isLoading = computed(() => this.booksResource.status() === 'loading');
```

```html
@if (isLoading()) {
  <div>LOADING</div>
}
```

To cover all cases, we also need to account for the `Reloading` state.
Using the built-in `isLoading` property solves this quickly: this signal returns `true` if the Resource is in the `loading` or `reloading` state:

```html
@if (booksResource.isLoading()) {
  <div>LOADING</div>
}
```



## Reloading the Resource

A Resource provides a `reload()` method.
When called, the loader function is executed again internally and the data is reloaded.
The result is then again available through the `value` signal.

```html
<button (click)="reloadList()">Reload book list</button>
```

```ts
@Component({ /* ... */ })
export class BookList {
  booksResource = resource({ /* ... */ });

  reloadList() {
    this.booksResource.reload();
  }
}
```

The Resource ensures that only one request is executed at a time.
Reloading is only possible once the previous load has completed.
You can see this behavior clearly in the [Angular source code](https://github.com/angular/angular/blob/20.0.0/packages/core/src/resource/resource.ts#L294-L296).


## Overwriting the Value Locally

The Resource allows the value to be overwritten locally.
The `value` signal is a `WritableSignal` and offers the familiar `set()` and `update()` methods.

We want to sort the book list locally on button click, sorted by rating.
In the method, we can sort the list and directly overwrite the `value` signal.


```ts
@Component({ /* ... */ })
export class BookList {
  booksResource = resource({ /* ... */ });

  sortBookListLocally() {
    const currentBookList = this.booksResource.value();

    if (currentBookList) {
      const sortedList = currentBookList.toSorted((a, b) => b.rating - a.rating);
      this.booksResource.value.set(sortedList);
    }
  }
}
```

We want to point out two things in this code:

- The `value` signal returns type `T | undefined`, in our case `Book[] | undefined`. If the data hasn't been loaded yet, the value is `undefined`. Therefore, we need to check whether `currentBookList` exists. We can also pass a default value through the `defaultValue` option to avoid this behavior.
- Instead of `Array.sort()`, we use the new method `Array.toSorted()`, which does not mutate the array and returns a sorted copy. This preserves immutability. `toSorted()` can only be used if the `lib` option in `tsconfig.json` includes at least `ES2023`, which is not the case in new Angular projects yet.


## `params`: Loader with Parameter

Our app should have a detail page that displays a single book.
So the HTTP request must receive information about which book to load.
When navigating to a different detail page, loading must restart for another book.

The loader must therefore be able to work with parameters.
Let's assume the component has an input property `isbn` through which the current ISBN is available.

In the loader, we could now use the signal `this.isbn` to pass the ISBN to the service:

```ts
@Component({ /* ... */ })
export class BookDetails {
  #bs = inject(BookStore);
  readonly isbn = input.required<string>();

  bookResource = resource({
    // NOTE: Only executed once!
    loader: () => this.#bs.getSingle(this.isbn())
  });
}
```

This code basically works – but only once! The loader function is *untracked*. This means it won't automatically rerun when the signal values it depends on change (unlike with `effect()` or `computed()`).

To solve this, we can use the `params` property: Here we pass a signal or a function that uses signals inside. Whenever these signal change their value, the loader will automatically run again.

The request signal thus provides the parameters with which the loader is executed.

```ts
@Component({ /* ... */ })
export class BookDetails {
  #bs = inject(BookStore);
  readonly isbn = input.required<string>();

  bookResource = resource({
    params: this.isbn,
    // or
    params: () => this.isbn(),
    loader: () => this.#bs.getSingle(this.isbn())
  });
}
```

To make the loader a bit more generic and reusable, we can avoid directly calling `this.isbn()`.
The value from `params` is conveniently passed as an argument to the loader function.
This allows us to outsource the loader to a separate function and reuse it in other Resources.

The loader automatically receives an argument of type `ResourceLoaderParams`, which has a `params` property. In our example, it holds the ISBN returned by the `params` function.

```ts
@Component({ /* ... */ })
export class BookDetails {
  #bs = inject(BookStore);
  readonly isbn = input.required<string>();

  bookResource = resource({
    params: this.isbn,
    loader: ({ params }) => this.#bs.getSingle(params)
  });
}
```

> **Route Parameters with Component Input Binding:** To automatically bind the `isbn` input property to the current route parameter, you can use the router's [*Component Input Binding*](https://netbasal.com/binding-router-information-to-routed-component-inputs-in-angular-78ee92f63e64) feature.


## `rxResource`: Resource with Observables

In all previous examples, we implemented the loader function using Promises. The browser's Fetch API returns a Promise, and the RxJS function `firstValueFrom()` helped us create a Promise from the Observable returned by Angular's `HttpClient`.

Even though Angular now uses signals in many places instead of Observables, reactive programming with RxJS still has its valid use cases.
Angular therefore provides the `rxResource` function. It works just like `resource`, but the loader function returns an Observable instead.
This way, we can use Observables from `HttpClient` directly.

Since an Observable *can* emit an infinite number of values, the property here is called `stream` instead of `loader`.

```ts
@Injectable({ /* ... */ })
export class BookStore {
  // ...
  getAll(): Observable<Book[]> {
    return this.http.get<Book[]>(this.apiUrl + '/books');
  }
}
```

```ts
import { rxResource } from '@angular/core/rxjs-interop';
// ...

booksResource = rxResource({
  stream: () => this.#bs.getAll()
});
```

## Cancelling Ongoing Requests

The Resource provides a way to cancel a running request when a new one is started.
Especially for loaders with parameters (like the ISBN on the detail page), it's important that only the most recently requested data is processed.

The `rxResource` manages this mechanism internally, because an Observable provides a direct way to cancel the request.

For loaders based on Promises, cancelling is a bit more complicated.
The loader also receives a so-called `AbortSignal` in its parameter object.
This is a native browser object that indicates when the request should be aborted.

Together with the native Fetch API, this object can be used directly.
If `this.isbn` changes while the loader is still running, the current fetch request will be aborted.

```ts
@Component({ /* ... */ })
export class BookDetails {
  #bs = inject(BookStore);
  readonly isbn = input.required<string>();

  bookResource = resource({
    params: this.isbn,
    loader: ({ abortSignal, aprams }) => fetch(
      detailsUrl + '/' + params,
      { signal: abortSignal }
    )
  });
}
```

If we're using Angular's `HttpClient` and `firstValueFrom`, cancellation becomes very cumbersome – we would need to convert the `AbortSignal` into an Observable to use the `takeUntil` operator to stop the stream. In this case, we strongly recommend using `rxResource`.

By the way, the Resource also ensures that an active request is stopped when the component is destroyed.


## httpResource: Resource for HTTP Requests

In early 2025, another variant of the Resource was introduced: `httpResource`.
It uses Angular's `HttpClient` under the hood to perform an HTTP request directly.
You no longer need to write the request yourself – the resource handles it for you.

```ts
booksResource = httpResource<Book[]>(
  () => 'https://api.example.org/books',
  { defaultValue: [] }
);
```

The request must be generated using a function.
This is because it runs in a *reactive context*: If you use signals inside the function, the request is re-executed automatically when any of those signals change. This is similar to the `params` property in a resource.
Additional request details can be passed in an options object:

```ts
booksResource = httpResource<Book[]>(
  () => ({
    url: 'https://api.example.org/books',
    params: {
      search: 'Angular'
    }
  })
);
```

Please note that a resource is only meant for *retrieving* data from an API and exposing it with signals.
Write operations such as create, update, or delete cannot be handled with a resource.
You must continue to use `HttpClient` directly for those.


## Conclusion

With the new Resource API, Angular introduces an intuitive and well-integrated interface for loading data from a server.
Use cases beyond a simple HTTP request, especially reloading data and showing a loading indicator, can be implemented quickly with the Resource.
Until now, that required a lot of manual effort.

We welcome Angular's focus on addressing this common everyday problem. The solution covers most use cases reliably and offers a standardized approach-only more advanced needs will require custom implementation going forward.

Angular continues its journey toward embracing signals in the framework. The need to use RxJS and Observables for simple tasks is further reduced.

It remains to be seen what role Angular's `HttpClient` will play in the future. By promoting the use of Promises, Angular encourages HTTP communication via the native Fetch API. It would be desirable for `HttpClient` and Resource to work seamlessly together. One could imagine `HttpClient` directly returning a Resource, avoiding the intermediate step through an Observable or Promise.
In our view, the new interface is a solid foundation-and we're excited to see what comes next!


<hr>
<small>Many thanks to Johannes Hoppe and Danny Koppenhagen for review and feedback.</small>

<small>**Cover image:** Photo by <a href="https://unsplash.com/de/@thepaintedsquarejessica">Jessica Lewis 🦋 thepaintedsquare</a> on <a href="https://unsplash.com/de/fotos/geschnittene-erdbeeren-auf-blaugrunem-keramikteller-15nvaBz_doc">Unsplash</a> (edited) </small>