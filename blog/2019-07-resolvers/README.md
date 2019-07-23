---
title: "A word on Angular route resolvers – and a praise for Reactive Programming"
author: Ferdinand Malcher
mail: mail@fmalcher.de
published: 2019-07-XX
last-change: 2019-07-XX
keywords:
  - Angular
  - Router
  - Resolver
  - Data Loading
  - RxJS
language: en
thumbnail: XXX.jpg
hidden: true
---

We need to talk about Angular route resolvers.
Resolvers are being used by the Angular router to retrieve (asynchronous) data during navigation.
Thus, the resolved data is available synchronously when the component starts.

If you never heard about resolvers, you are fine!
Have you ever used them? This is okay, but you should probably not.

In this post I want to highlight why resolvers are not the prefect means for resolving async data from HTTP.
I want to point out how there is always a way around resolvers.
However, in the end I want to show you a potentially useful scenario for using a resolver.

## The anatomy of resolvers

Before we start, let's talk about what resolvers are and how we implement them.
If you already used them before, you can probably skip this intro.

Technically speaking, a resolver is an Angular service that encapsulates async operations.
The Angular router utilizes this service to resolve those operations during navigation and make the data available for the routed components.

A resolver always follows a specific structure: it contains a `resolve()` method.
This is the place where we define all necessary asynchronous operations and return them – usually as an Observable.

The `resolve()` method will be called by the router with some arguments, from which we can get information about the route that will be activated.
The type `Book` comes from our own domain – you can see that we need to type the resolver service accordingly.

```ts
import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class BookResolverService implements Resolve<Book> {

constructor(private bs: BookStoreService) { }

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<Book> {
    return this.bs.getOne(route.paramMap.get('isbn'));
  }
}
```

A service alone is not enough – we now need someone to call it.
Since the resolver should be invoked by the router, the right place to insert it is our route configurations.
We provide an object with at least one resolver.

```ts
{
  path: 'mypath',
  component: MyComponent,
  resolve: {
    book: BookResolverService
  }
}
```

When this specific route is being requested, the router automatically invokes the `resolve()` method of the resolver, subscribes to the Observable and makes the resulting data available for the component synchronously.
Within the component, we can use the `ActivatedRoute` service to get access to the data:

```ts
// ...
@Component({ /* ... */ })
export class MyComponent {
  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.book = this.route.snapshot.data.book;
  }
}
```


## The UX problem with resolvers

Resolvers are very straight-forward to use, since they are just services that are automatically being called by the router.
However, we need to keep in mind an important detail:
The router calls the resolver when the route is being requested – and then _waits_ for the data to be resolved before the route is actually being activated.

Now imagine a long running HTTP request.
After clicking a link in our application, the HTTP request starts.
The routing will not be finished before the HTTP esponse comes back.
Thus, if the HTTP takes 5 seconds, it will also take 5 seconds for the routing to complete.
If you are like me, you will have hit the button another 3 times within that time. ;-)
This behavior completely strikes the idea of a Single-Page Application.
An SPA should always react fast and load the necessary data asynchronously at runtime.
With the behavior described – click, wait, continue – we are back to the UX of a classical server-only rendered page like 15 years ago.
Not good.
And here we are with the problematic UX resolvers bring us.

<!-- TIMELINE RESOLVER -->

What we rather want to do is to show the requested page _immediately_ after the click, but without the data.
Ghost elements can help here to indicate that something is in progress.
Finally, when the data is available, we render the complete page.
Resolvers are not the right means for this.
But maybe we can think of another approach?

## What to do instead?

The solution I want to point out here is pragmatic, but goes back to the roots: Don't use resolvers.
Instead, you can go the "normal" way without any real friction.
Asynchronity feels scary at first sight, but in fact there is nothing wrong with handling Observables within components.
Quite the opposite: Angulsr is a reactive framework and highly encourages you to work with reactive streams wherever suitable.

Thus, the best way of doing is to make Observables available from your service and subscribe to them in your component:

```ts
// ...
@Component({ /* ... */ })
export class MyComponent {
  books: Book[];
  
  constructor(private bs: BookStoreService) { }

  ngOnInit() {
    this.bs.getAll()
      .subscribe(books => this.books = books);
  }
}
```

... or, even better, use the `AsyncPipe` to resolve the data directly within the template, so you don't need to care about subscription management in the component:

```ts
// ...
@Component({ /* ... */ })
export class MyComponent {
  books$: Observable<Book[]>;
  
  constructor(private bs: BookStoreService) { }

  ngOnInit() {
    this.books$ = this.bs.getAll();
  }
}
```

```html
<div *ngFor="let b of books$ | async">
  {{ book.title }}
</div>
```


## But I want it synchronous!

I want to emphasize the key point once more:
When using resolvers, the route will be loaded after the asynchronous data from the resolver has been retrieved, or in other words: The router will wait for the resolver to finish.

This leads to the more or less lucky situation that we have all the data available synchronoulsy at the runtime of the component.
And as you might perfectly know: Working with synchronous data is way easier than fiddling around with async stuff.
You don't need to handle Observables and you can just work with the data as intended.
If you feel this way, please always keep one question in mind: **Why do I need this? Is the UX flaw (as described above) really worth the "easier" code?**

At first sight, reactive streams seem to be overly complicated – in fact this was my initial feeling when I first dealt with RxJS a few years back.
Observables are the "final enemy" for many people starting with Angular.
And indeed – to understand reactive programming you need a little change of thinking: Embrace functional and declarative programming, say goodby to the commonly known imperative way.
It needs a lot of practice and it is perfectly fine if you still struggle with Observables and all the operators.
But once you're there you will see that Angular itself is a highly reactive framework.
Component and view are always synchronized, events happen, we react to them, …
Everything that happens somewhere can be interpreted as a stream of events or data – or even more abstract: a set of values.
And thinking of everything as a stream makes it easier to migrate to some sort of reactive state management later, like the popular NgRx.

What is more, sometimes it is impossible to avoid Observables in Angular.
Imagine, you want to retrieve a route parameter that changes during the runtime of a component – you need `ActivatedRoute.paramMap` for that, which is an Observable.
If you want to react to changes in form values, you need to use `FormGroup.valueChanges`.
And there are a lot more! Even the `EventEmitter` that e use for component outputs is an Observable internally.
Don't be scared of Observables!

### Observables in the wild: An example

To point out how Observables cross our way in the daily dev life, I want to get back to the example from above.
Instead of retrieving a list of books, we now want to get one specific book whose `isbn` comes from a route parameter.

We use the `ActivatedRoute` service as usual and get a stream of chaning route params.
Instead of subscribing to that observable (we should avoid that anyway and always use the `AsyncPipe`), we transform the data stream even more.
For every ISBN that changes in the route, we want to retrieve the according book from the API.
We can use the `switchMap()` operator here and transform each ISBN to the retrieved book.
Thus, we get a stream of single books which we can simply display in the template.

```ts
// ...
@Component({ /* ... */ })
export class MyComponent {
  book$: Observable<Book>;
  
  constructor(private bs: BookStoreService, private route: ActivatedRoute) { }

  ngOnInit() {
    this.book$ = this.route.paramMap(
      map(params => params.get('isbn')),
      switchMap(isbn => this.bs.getOne(isbn))
    );
  }
}
```

> Note that we used the `switchMap()` operator intentionally here: When the route changes, we want to cancel the running request. However, please do not use `switchMap()` blindly but also consider its siblings `concatMap()`, `mergeMap()` and `exhaustMap()`.


<!-- CONTINUE HERE  -->
## Child components to the rescue

Even when dealing with Observables in the component, that doesn't mean we cant have data available synchronously.
The key lies within the component tree and in separating what components are allowed to do.
Central element is the presentational component.
Is only concerned with displaying data and capturing events and data from the user through controls like buttons and forms.
Presentationals are "dumb", in the sense of that they do not have any external dependencies.
All communication is done via inputs and outputs, but usualy there are no services involved.

Presentationals always orchestrated in containers at the topmost level.
Are also compoennts, but with very little markup.
Instead, containers are the interface to the rest of the application: they communicate with services and thus perform side-effects.
They pass data to presentationals and retrieve events from them that they forward to the world.


Read more about this pattern here:

Take this pattern as a guideline.
Some suggest to separate containrs and presentationals in separate folders.
In my opinion, it's already a step forward if you are aware of the role of a component.
A component should always be as dumb as possible and as "smart" as necessary.
Stirve to creating a lot of dumb components, as they are easily testable and interchangable.

## Why all the theory?

After clearing up the idea of the two component roles, let's get back to the problem point: Resolvers bring us data to the component SYNCHRONOUSLY, while observables always need a subscribe and might also be asynchronous, especially with HTTP.

if we handle containers and presentationals seriously, we can achieve something similar:
We want the conatiner to retrieve the data.
As soon as the data is available, it should render a child component and pass the data to it as an input.
Thus, at runtime of the child component, the data is available...synchronously – even if it originally comes from an async data source.
The key point is that we do not render the child before the data is available.

We can update the timeline:

CHILD COMP TIMELINE

You can see that the time between click and routing is almost zero.
We still need to wait for the HTTP to complete, but in the meantime we can show some meaningful content to the user instead of letting them wait.

This is relatively easy to implement, as it just makes use of standard Angular concepts.
First, we use the async pipe to resolve the async data in our container component.
We then pass it into the child component which we only render when data is availble – using ngIf.
Thus, at the runtime of the child component, the data will be synchronously available in ngOnInit(). That's cool!


## Why then resolvers?

You are right if you wonder what resolvers might be good for.
The key characteristic is that the router waits for the data to be resolved, but where would we need this behavior?

We discussed a lot about this – for academic reasons – and came up with a potentially valid use case.

Think about data we need...
* instantly when a compoennt starts.
* at many places in our application.
* to retrieve once only, which could take some time.
Think of configuration objects!

We can actually use a resolver to bring config values to our components.






<hr>


<hr>

<small>**Header image:** XXX, XXX National Park, XXX, 2018</small>