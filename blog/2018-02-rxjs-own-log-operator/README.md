---
title: Build your own RxJS logging operator
author: Ferdinand Malcher
mail: mail@fmalcher.de
published: 2018-02-19
last-change: 2018-02-19
keywords:
  - RxJS
  - Reactive Programming
  - Observable
  - Angular
language: en
thumbnail: birds-meeting-1309186.jpg
---


**In this article we will cover how to write our own custom operators for RxJS pipelines.**
**We will build a simple logging operator and learn how we can debug observable sequences.**

<hr>

When working with Angular we come into contact with [RxJS](http://reactivex.io/rxjs/) almost every day:
using reactive forms, doing routing, [taming snakes](https://blog.thoughtram.io/rxjs/2017/08/24/taming-snakes-with-reactive-streams.html) or using [NgRx effects](https://github.com/ngrx/platform/blob/master/docs/effects/README.md).
Thinking reactively makes you revisit your common patterns, due to its declarative way of writing code is conceptually different from the imperative style we've been doing for years.


> If you are new to RxJS you will find a great introduction here:
> [André Staltz: "The introduction to Reactive Programming you've been missing"](https://gist.github.com/staltz/868e7e9bc2a7b8c1f754). 
If you are familiar with the German language, you might want to take a look at our [book about Angular (and RxJS)](/buch).

## Building a `log()` operator

When working with observable sequences it's quite helpful to sneak into the data stream to see what's happening in there. Doing so, we usually end up writing lines like these over and over again: 

```typescript
myObservable$.pipe(
  tap(e => console.log(e)),
  map(thing => thing.id),
  tap(e => console.log('end', e))
)
```

Actually, this is what I write a few times a day and I have always been too lazy to create an editor snippet for it.

We're using the `tap` operator here. This operator doesn't change the emitted values but enables us to create side effects such as logging.

Now that [pipeable operators](https://github.com/ReactiveX/rxjs/blob/master/doc/pipeable-operators.md) have been introduced to RxJS it's quite easy to build some custom operators.
In this article we'll build a simple `log()` operator that dramatically simplifies the above code for us:

```typescript
myObservable$.pipe(
  log(),
  map(thing => thing.id),
  log('end')
)
```

We won't just get a cool new helper for debugging but we'll also see, how easy it is to set up some own RxJS operators.


## What are RxJS operators?

RxJS operators are used to model the data stream emitted from an observable source.
We can chain operators together and put them in a pipeline for our stream.
That makes every value run through the whole operator stack.

Operators are applied using the `Observable.pipe()` method which takes all the operators as arguments:

```typescript
import { map, filter } from 'rxjs/operators';

source$.pipe(
  map(value => value + 1),
  filter(value => value > 10)
)
```

The return value of this expression is a new Observable with the mapped and filtered data stream.
There is a whole bunch of built-in RxJS operators which we can import from `rxjs/operators`.
`map` and `filter` are among the most well-known of them.

While the whole operator story looks difficult at first sight, there is not much magic in it:
An operator is just a simple function that
- takes an Observable as argument and
- returns an Observable (with the altered data stream).

```typescript
function(source$: Observable<T>): Observable<U>
```

We can set up such a function in three different ways:

- create and emit the Observable manually
- use existing operators and pipe the source data through them
- wrap an existing operator into a function closure

Let's take a closer look at those three ways.


## 1) Create and emit the Observable manually

The most straight-forward way to create an Observable is using its constructor method `new Observable()`.
We need to set a callback function as argument that is automatically invoked every time a new subscriber is being registered.
The callback function takes a so-called *Observer* as argument which is a reference to the subscriber.
The observer gives us three methods which we can use to send data to the subscriber:
- `next`: for a regular value in the stream
- `error`: when errors occur
- `complete`: when the stream has ended


Using this knowledge of how to create observables we can now go a step further and set up our first own operator. Remember: An operator is a function, that takes and returns an Observable.
Here we go:

```typescript
function(source$) {
  return new Observable(observer => {
    // ...
    observer.next('next value')
  });
};
```

In order to be able to configure our operator with a custom logging message we wrap it into another function that takes that message as argument:

```typescript
export function log(message) {
  return function(source$) {
    return new Observable(observer => {
      // ...
      observer.next('next value')
    });
  };
);
```

Together with some TypeScript types our operator skeleton finally looks like this:

```typescript
export function log<T>(message?: string) {
  return function(source$: Observable<T>): Observable<T> {
    return new Observable<T>(observer => {
      // ...
      observer.next('next value')
    });
  };
);
```


What we want to do inside our `log()` operator is basically two things:
We want to access the source values and
- `console.log()` them
- leave them unchanged and pass them through to the observer

To access the values emitted from the `source$` observable we can simply subscribe to it.
The `subscribe()` method takes – no surprise – an observer as an argument, i.e. an object with `next`, `error` and `complete` methods.
We could actually just take our original observer and pass it into our `subscribe` method like this:

```typescript
return new Observable<T>(observer => {  
  return source$.subscribe(observer);
});
```

However, this will just forward all the source values to the observer without doing a `console.log()`.
Instead, we create a wrapper around our observer with an "enhanced" `next()` method. First we add the `console.log()` call before emitting the value to our observer.
Then, for the error and complete case we can just use the methods provided by the original observer.

```typescript
export function log<T>(message?: string) {
  return function(source$: Observable<T>): Observable<T> {
    return new Observable<T>(observer => {  
      const wrapper = {
        next: value => {
          console.log(message, value);
          observer.next(value);
        },
        error: observer.error,
        complete: observer.complete
      }
      return source$.subscribe(wrapper);
    });
  }
}
```

![](observer-wrapper.png)


If you take a look into the [RxJS source code](https://github.com/ReactiveX/rxjs/blob/cfbfaac36c847a1d09434a78ac1737c4a3149c5c/src/internal/operators/map.ts#L39-L46) you will see: that's exactly the approach they go for all the built-in operators.

However, for beginners this way is anything but intuitive. For a simple use case like our `log()` operator this approach might also be a bit too heavy. Apart from that, creating an observable with its constructor is quite focused on the actual implementation. This is a bit error-prone: If we miss out anything here, it can lead to errors.

Hence, we'll take a look at a much simpler approach in the next section.



## 2) Use existing operators

Let's cast our minds back to what we wanted to do. Our goal was to hide this line in a custom operator:

```typescript
tap(e => console.log('message', e))
```

Each operator is already designed to return a new Observable.
So why not just use it? Instead of manually creating an Observable with `new Observable()` we can just return the source stream that has been piped through the existing `tap` operator:


```typescript
export function log<T>(message?: string) {
  return function(source$: Observable<T>): Observable<T> {
    return source$.pipe(
      tap(e => console.log(message, e))
    );
  }
}
```

This looks much cleaner and easier to read and understand. Plus, we can clearly recognize our original line in that.


## 3) Wrap existing operator into closure

All the built-in operators already return funcations that can be used in the observable pipeline.
What we can now do is, us the existing operator "as is" and return is from our function.
Thus, our `function log()` returns a specific variant of the original `tap()` operator.

```typescript
export function log<T>(message?: string) {
  return tap(e => console.log(message, e));
}
```

We converted the complex example from above to a one-liner. Great!
However, please note that we got rid of all the TypeScript types here.
For our simple `log()` operator, that simply re-emits all the values, there is a problem:
TypeScript can't infer the type from the source observable and automatically sets it to `{}`.
This is why we can't use this operator without explicitly assigning the type in the next step:

```typescript
myObservable$.pipe(
  log(),
  map((thing: Thing) => thing.id)
)
```

Please keep that in mind or go for one of the other approaches.



## Which way is the best?

The answer to this question really depends on our use case.
The general rule is: **as short as necessary, but as readable as possible.**

If you want to create custom combinations of existing operators, it's always a good idea to just use them and return the piped observable from your function (as seen in #2). When this is just about wrapping *one* existing operator, #3 is a bit simpler, but remember that you can't keep the types throughout your pipeline.
If you want to do more complex stuff than just using the existing operators, you should consider going for approach #1.


## Conclusion

Building your own custom operators for your RxJS pipes is very easy. An operator is just a function that takes and returns observables. As long as you stay with this signature you can do whatever you want on the inside: create your own new observable or use existing operators.

Our `log()` operator is a great means to debug reactive streams with less typing.
Just put it into your pipeline and you'll see the output in the browser console.


## See it in action

You can see the `log()` operator in action in our Stackblitz example:

**[👉 Example on Stackblitz](https://stackblitz.com/edit/rxjs-log-operator?file=app%2Fapp.component.ts)**


## Extra: Unit tests

Our code is still missing an important part: tests!
Here are some simple unit tests for our `log()` operator.
The last spec is built with marbles. Read more about this hot approach [in the docs](https://github.com/ReactiveX/rxjs/blob/master/doc/writing-marble-tests.md)!

```typescript
import { Subject } from 'rxjs/Subject';
import { log } from './log.operator';

import { cold, hot } from 'jasmine-marbles';

fdescribe('log operator', () => {
  let subject$: Subject<string>;

  beforeEach(() => {
    spyOn(console, 'log');
    subject$ = new Subject<string>();
  });

  it('should call console.log with custom message for each emitted value', () => {
    subject$.pipe(log('message'))
      .subscribe(() => {});

    subject$.next('a');
    expect(console.log).toHaveBeenCalledWith('message', 'a');

    subject$.next('b');
    subject$.next('c');

    expect(console.log).toHaveBeenCalledTimes(3);
  });

  it('should leave message blank if none given', () => {
    subject$.pipe(log())
      .subscribe(() => {});

    subject$.next('a');
    expect(console.log).toHaveBeenCalledWith(undefined, 'a');
  });

  it('should leave emitted values unchanged', () => {
    let result;
    subject$.pipe(log())
      .subscribe(e => result = e);

    subject$.next('a');
    expect(result).toEqual('a');

    subject$.next('b');
    expect(result).toEqual('b');
  });

  it('should leave emitted values unchanged (marble test)', () => {
    const source$ = hot('-a-a-bc', { a: 'a', b: 'b', c: 'c' })
    const piped$ = source$.pipe(log());
    const expected$ = cold('-a-a-bc', { a: 'a', b: 'b', c: 'c' });

    expect(piped$).toBeObservable(expected$);
  });
});
```


<small>Header image based on picture by [FreeImages.com/Petr Kovar](https://de.freeimages.com/photo/birds-meeting-1309186)</small>



