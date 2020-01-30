---
title: "Watching through a window: ..."
author: Ferdinand Malcher
mail: mail@fmalcher.de
published: 2020-02-01
last-change: 2020-02-01
keywords:
  - RxJS
  - Reactive Programming
  - Observable
language: en
hidden: true

---

Imagine yourself sitting in a train, landscapes passing by, trees, houses, sheep, people, hills (you probably are in New Zealand).
When I find myself in a situation like that I can't help but thinking of reactive data streams all the time.
All the things that rush by are items of an Observable and you subscribe to the stream by watching through the window.
However, here's an important detail: Whenever a new item appears the window moves forward and opens the view to not just the last *one* – but to the *last few emitted items*.

![GIF of someone sitting in a train](train.gif)

Luckily there's more behind this than my peculiar interest for watching through train windows, so let's bring this example to the world of software.
Imagine an event stream: this could be log messages, a chat, clicks, or whatever observable stream you like.
We want to build a UI around this that displays a chronological log of those events.
Just like the train window delimits the number of trees we can see at a time, we only want to display a certain range of the event history.

And when you look into the direction of travel, new items always appear at the front and run away behind you. We want to adopt this analogy and display the new element at the top of our list before it runs to the bottom and disappears eventually.

![Animated GIF of a demo application with a log history](loghistory.gif)


## A look into the documentation

My first approach to tackling reactive problems is a short look into the RxJS documentation.
It's very likely that an operator exists for solving the problem.
However, it's important here to not let yourself confuse by the number of operators, especially those who sound suitable but aren't.
For a few minutes, I was obsessed by the thought that one of the `buffer` or `window` operators might be the solution – until I cleared my mind and started all over again.

If there is no suitable operator for you, it's the best to think in fundamentals and begin from the bottom up using low-level operators.

## About the scan operator

You probably know the `scan` operator from numerous examples that add up numbers, like this one:

```ts
import { scan } from 'rxjs/operators';

const source$ = of(1, 2, 3, 4, 5);

const result$ = source$.pipe(
  scan((acc, item) => acc + item, 0)
);

// Result: 1, 3, 6, 10, 15
```

This operator is also the functional basis for Redux-style state management where we reduce a stream of actions to state objects.
But let's get back to the basics and take a closer look at the `scan` operator.

The first argument to `scan` is a *reducer function* with two arguments itself.
In a way, `scan` is a bit similar to `map` here:
The argument `item` is the emitted item from the source stream. Whatever we return from the function will be the next item in the stream that flows *out* of the operator.
Of course, you should never use `scan` as an alternative to `map`!
The key diference is that the reducer also gets the result from the last emission as an argument (also called *accumulator*, hence the argument name `acc`).
So whenever the source fires, we get the new source item and the last result item as arguments to the reducer.

On first execution, `acc` will be undefined.
This is why we can provide a *seed* value as the secound argument to `scan` which will be used as first value to `acc` then.

```ts
function reducer(acc, item) {
  // calculate next value
  return nextValue;
}

scan(reducer, seed);
```

How does all this help us with the train window now?

## Scanning train windows

Back to our train window problem we want to produce a stream of arrays that each contain the last `n` items from the source.
When the source stream looks like this...

```
Hello
RxJS
operators
lot of fun
really
cool
bye bye
```

...and `n` is 3, the result should look like this:

```
['Hello']
['RxJS', 'Hello']
['operators', 'RxJS', 'Hello']
['lot of fun', 'operators', 'RxJS']
['really', 'lot of fun', 'operators']
['cool', 'really', 'lot of fun']
['bye bye', 'cool', 'really']
```


Let's go ahead and scan over the source stream.
This means, as an output we want to create an array that contains
- the new source item at the beginning
- the first `n - 1` items from the last result array


```ts
const n = 3;

const result$ = source$.pipe(
  scan((acc, item) => [item, ...acc.slice(0, n - 1)], [])
);
```


## Extra: Build a custom operator

To hide the complexity we can wrap this thing into a custom operator.
I wrote a dedicated blog post about this topic here: [Build your own RxJS logging operator](https://angular.schule/blog/2018-02-rxjs-own-log-operator).

```ts
export function shiftWindow(n: number = 3) {
  return scan((acc, item) => [item, ...acc.slice(0, n - 1)], []);
}
```

```ts
const result$ = source$.pipe(
  shiftWindow(3)
);
```


## Demo

You can find a working demo on Stackblitz so you can play around:

<iframe style="width:100%; height: 25em" src="https://stackblitz.com/edit/angular-train-window?embed=1&file=src/app/app.component.ts"></iframe>

