---
title: "Effects (WIP)"
author: Ferdinand Malcher
mail: mail@fmalcher.de
published: 2018-06-01
last-change: 2018-06-01
keywords:
  - Angular
  - NgRx
  - RxJS
  - Effects
  - State Management
  - Observables
  - Redux
language: en
hidden: true
---

**In this article we will discuss how we can leverage the power of Effects in NgRx. We will use observable streams different from the usual action stream to build some powerful and neat effects.**

<hr>

## Effects, effects, effects

When working with the [ngrx/store library](https://github.com/ngrx/platform) you might be familiar with the concept of *Effects*.
Effects provide a powerful model to keep our reducers pure and describe side effect handling in a declarative way using RxJS streams.

> If you're not familiar with ngrx/store or effects, please read about the core concepts and building blocks [here](https://gist.github.com/btroncone/a6e4347326749f938510).

Simply speaking, an effect is an Observable that maps its items to actions that will then be dispatched to the store automatically.
In most cases, the source of an Effect is the global stream of actions:

```ts
@Effect()
myEffect$ = this.actions$.pipe(
  ofType(BooksActionTypes.LoadBooks),
  // do awesome things like fetching books from an API
  map(books => LoadBooksSuccess(books))
)

constructor(private actions$: Actions) {}
```

This effect takes the stream of all our actions and filters it by specific actions of the type `LoadBooks`. For each `LoadBooks` action it then performs some awesome stuff, e.g. retrieving the book list from the server. Finally, it converts the book list into a new action `LoadBooksSuccess`. The `@Effect()` decorator makes sure that the new action is being dispatched automatically.

While we usually take the actions stream as the source for our effects, it is not actually bound to this source. In fact you can take whatever Observable you want and take its values as your effect source.

Let's go through some use cases where this comes in handy.


## 1.) Native events

Imagine you want to trigger an action whenever the user resizes the browser window. We're talking about a native event here that's not bound to a specific DOM node in our view.
Using the `fromEvent` operator from RxJS we can easily build up an observable stream of window resizing events.
The debounce is just cosmetic and makes the stream only emit once when the users has stopped resizing for a certain time.
With the final resize event we can then dispatch a new action to our store:

```ts
import { fromEvent } from 'rxjs';

// ...

@Effect()
resize$ = fromEvent(window, 'resize').pipe(
  debounceTime(300),
  map(e => new MyWindowResizeAction(e))
)
```

This solution is very nice and clean, compared to subscribing to the event and then dispatching actions from one of our components.


## 2.) Timers/Intervals

We can follow a similar approach when it comes to intervals. A specific use case could be a polling scenario where you want to dispatch an action every `n` seconds. Look at how sllick we can go for this with an effect:

```ts
import { interval } from 'rxjs';

// ...

@Effect()
interval$ = interval(2000).pipe(
  map(_ => new MyFancyAction())
)
```


## 3.) Fill the store implicitly

Thinking all this a bit further we can do some advanced implicit magic:
Retrieving data from somewhere whenever they are not present in the store. This is quite convenient when it comes to data we need all the time like configuration objects or generic lists of helping entities.

The key behind this idea is that store selectors like `store.pipe(select(mySelector))` also return Observables. Thus, we can build an effect like the one following. Just read the code carefully first and then continue with the explanation below:

```ts
@Effect()
getBooks$ = this.store$.pipe(
  select(getAllBooks), // get book list from store
  filter(booksFromStore => booksFromStore.length == 0), // only continue if there are no books
  mergeMap(() => this.service.getBooks().pipe( // get new book list from service
    map(books => new LoadBooksSuccess(books)) // trigger action that saves new books to the store
  ))
)


// Reducer
// ...
case BooksActionTypes.LoadBooksSuccess: {
  const books = action.payload;
  return { ...state, books };
}
// ...

// Selector
const getAllBooks = createSelector(getBooksState, state => state.books);

```

This effect starts working when the book list in our store changes. Using the `filter` operator it continues the pipeline only when there are no books in the store. This can be the case when

* the application starts with an empty initial state
* or when the books have been deleted by some user action.

We then retrieve the new book list from our service and send it to the store within a `LoadBooksSuccess` action.
So, whenever the books list happens to be empty, our effect will automatically call the service and push the new books to the store.


## Conclusion

You can see that effects can go far beyond reacting to actions. Since effects basically are nothing more than observables that map to actions, we can use *every* observable as the source for our effects.
However, please be careful not to mix up things and do not overuse this pattern! The majority of your effects should still follow the usual pattern described at the very top.

In some cases this one will come in handy, though. Have you experienced some other cases than described here? **Please write us an e-mail or ping us on Twitter – we're happy to discuss them!**
