---
title: "5 useful NgRx effects that don't rely on actions"
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
thumbnail: canyonlands.jpg
hidden: true
---

**In this article we will discuss how we can leverage the power of Effects in NgRx. We will use observable streams other than the usual action stream to build some powerful and neat effects.**

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


## The example data: Books

In the following examples we will use a *book list* as our data.
The state tree looks like this:

```ts
interface BooksState {
  books: Book[];
}
```

We have a `LoadBooks` action that triggers an HTTP request through an effect:

```ts
@Effect()
loadBooks = this.actions$.pipe(
  ofType(BooksActionTypes.LoadBooks),
  mergeMap(() => this.service.getBooks().pipe( // get book list from service
    map(books => new LoadBooksSuccess(books)) // trigger action that saves new books to the store
  ))
);
```

The `LoadBooksSuccess` action invokes a reducer to add the book list to the state:

```ts
// ...
case BooksActionTypes.LoadBooksSuccess: {
  const books = action.payload;
  return { ...state, books };
}
```


<hr>

Now that you know the setup, let's go through some use cases where it comes in handy to take some other Observables as source for our effects.


## 1.) Native events

Imagine you want to trigger an action whenever the user resizes the browser window. We're talking about a native event here that's not bound to a specific DOM node in our view.
Using the `fromEvent` operator from RxJS we can easily build up an observable stream of window resizing events.
The debounce is just cosmetic and makes the stream only emit once when the user has stopped resizing for a certain amount of time.
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

We can follow a similar approach when it comes to intervals. A specific use case could be a polling scenario where you want to dispatch an action every `n` seconds. Look at how slick we can go for this with an effect:

```ts
import { interval } from 'rxjs';
// ...

@Effect()
interval$ = interval(2000).pipe(
  map(_ => new MyFancyAction())
)
```

## 3.) Route events

Angular itself uses Observables extensively, e.g. in the router or for reactive forms. Of course, we can also use those streams in our effects.
Let's say we want to fetch some data from the server when a specific route is being activated.

There are a few approaches to this:
1. Dispatching the action from the routed component using `this.store.dispatch()`, usually within `ngOnInit()`
2. Using a route guard to intercept the routing process and dispatch the action (as described in an [article by Todd Motto here](https://toddmotto.com/preloading-ngrx-store-route-guards))
3. Listen to router events in an effect

Number #3 is as simple as our previous examples:
We can use the `events` Observable from the Angular router and listen to some specific events.
With the event payload we can decide what to do next, for example dispatching a `LoadBooks` action:

```ts
@Effect()
loadBooks$ = this.router.events.pipe(
  filter(e => e instanceof ActivationStart)),
  filter(e => isRoute('/books/list'))
  map(_ => new LoadBooks())
);

constructor(private router: Router) {}

// ...
function isRoute(path: string, event: ActivationStart) {
  const currentPath: string[] = [];
  let route = event.snapshot;

  while (route.parent) {
    if (route.routeConfig && route.routeConfig.path) {
      currentPath.push(route.routeConfig.path);
    }
    route = route.parent;
  }
  return path === currentPath.reverse().join('/');
}
```

I don't want to elaborate on the structure of the event payload here since it is quite complex.
We built the `isRoute` function to traverse through the router tree and bring all our route segments together.

Actually, this idea is pretty much the same like [amcdnl](https://twitter.com/amcdnl) followed with his [ngrx-router](https://github.com/amcdnl/ngrx-router) library.
Your effects become very simple and clean like this one:

```ts
import { ofRoute } from 'ngrx-router';
// ...

@Effect()
loadBooks$ = this.actions$.pipe(
  ofRoute('/books/list'),
  map(_ => new LoadBooks())
);
```

Using *ngrx-router* you can also match multiple routes, use route param placeholders or match by regular expressions.
**If you like the approach above you might want to check this one out!**



## 4.) Fill the store implicitly

Getting into this a bit more we can do some advanced implicit magic:
Retrieving data from somewhere whenever they are not present in the store. This is quite convenient when it comes to data we need all the time like configuration objects or generic lists of helping entities.

The key behind this idea is that store selectors like `store.pipe(select(mySelector))` also return Observables. Thus, we can build an effect like the one following. Just read the code carefully first and then continue with the explanation below:

```ts
@Effect()
getBooks$ = this.store$.pipe(
  select(getAllBooks), // get book list from store
  filter(booksFromStore => booksFromStore.length == 0), // only continue if there are no books
  map(_ => new LoadBooks())
)

// Selector
const getAllBooks = createSelector(getBooksState, state => state.books);

```

This effect starts working when the book list in our store changes. Using the `filter` operator it continues the pipeline only when there are no books in the store. This can be the case when

* the application starts with an empty initial state
* or when the books have been deleted by some user action.

We then dispatch a `LoadBooks` action to load books from the server.
So, whenever the books list happens to be empty, our store will automatically call the service and push the new books to the store.


## 5.) Loop of Death ☠️

Last but not least will be one of my favorites.
What looks like a harmless little line of code is one of the most evil effects:

```ts
@Effect()
loopOfDeath$ = this.actions$;
```

It just takes all actions and replicates them into an infinite loop. Yay! Please… don't do this.


## Conclusion

You can see that effects can go far beyond reacting to actions. Since effects basically are nothing more than observables that map to actions, we can use *every* observable as the source for our effects.
However, please be careful not to mix up things and do not overuse this pattern! The majority of your effects should still follow the usual pattern described at the very top.

In some cases this one will come in handy, though. Have you experienced some cases other than the ones described here? **Please write us an e-mail or ping us on [Twitter](https://twitter.com/angular_schule) – we're happy to discuss them!**
