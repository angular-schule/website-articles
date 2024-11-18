---
title: "Watching through a window: Building a moving window with RxJS"
author: Ferdinand Malcher
mail: mail@fmalcher.de
published: 2020-02-04
last-change: 2020-02-04
keywords:
  - RxJS
  - Reactive Programming
  - Observable
language: en
header: rxjs-train.jpg

---

Imagine yourself sitting in a train, landscapes passing by – trees, houses, sheep, people, hills, ...
When I find myself in a situation like that I can't help but thinking of reactive data streams all the time.

All the things that rush by are items of a huge stream, and you subscribe to that Observable by watching through the window.
However, here's an important detail: Whenever a new object appears outside, the window moves forward and opens the view to not just the recent *one* – but to the *last few emitted items*.

![GIF of someone sitting in a train](train.gif)
<br><small>(GIF source: giphy.com)</small>

Luckily there's more behind this than my peculiar interest for watching through train windows, so let's bring this example to the world of software.
Imagine an event stream – this could be log messages, button clicks, or whatever Observable stream you like.
We want to build a UI around this that displays a chronological log of those events.
Just like the train window delimits the number of trees we can see at a time, we only want to display a certain range of the event history – the last few.

When you look into the direction of travel, new items always appear at the front and disappear behind you. We want to adopt this analogy and display the newest element at the top of the list before it runs to the bottom and eventually disappears.

![Animated GIF of a demo application with a log history](loghistory.gif)


## A look into the documentation

My first approach to tackling reactive problems is a quick look into the [RxJS API documentation](https://rxjs.dev/api).
It's very likely that an operator exists for solving the problem.
However, it's important to not let yourself confuse by the number of operators, especially those who sound suitable at first glance.
For a few minutes, I was obsessed with the thought that one of the `buffer` or `window` operators might be the solution.
They are not! Both `buffer` and `window` (and their relatives) collect values from the source and emit them all at once – after a time or when a signal appears.
This sounds good but is still not the right thing for us when we want to move a window forward.

Finally, I cleared my mind and started all over again.
If there is no suitable operator for you, it's the best to think in fundamentals and begin from the ground up using low-level operators like `map`, `filter`, `reduce` and `scan`.

## About the scan operator

When you read about the [`scan` operator](https://rxjs.dev/api/operators/scan) you often stumble upon examples that add up values, like this one:

```ts
import { scan } from 'rxjs/operators';

const source$ = of(1, 2, 3, 4, 5);

const result$ = source$.pipe(
  scan((acc, item) => acc + item, 0)
);

// Result: 1, 3, 6, 10, 15
```

It transforms the stream of numbers to a stream of intermediate results from the addition performed as `acc + item`.
The `scan` operator is also the functional basis for Redux-style state management where we reduce a stream of actions to state objects.
But let's take a closer look at the `scan` operator.

The first argument to `scan` is a *reducer function* with two arguments itself: `acc` and `item`.
The argument `item` is the emitted item from the source stream.
Whatever we return from the function will be the next item in the stream that flows *out* of the operator.
In a way, `scan` is similar to `map` here.
The key difference however is that the reducer also gets the result from its last emission as an argument (also called *accumulator*, hence the argument name `acc`).

So whenever the source fires, we get the following arguments to the reducer:

- the new source item (`item`)
- the previously calculated result (`acc`)

On first execution, `acc` will be undefined since there is no previous calculation.
This is why we can provide a *seed* value as the secound argument to `scan` which will be used as first value to `acc` then.

The following code listing shows the general structure of how we use `scan`:

```ts
function reducer(acc, item) {
  // calculate next value
  return nextValue;
}

scan(reducer, seed);
```

How does all this help us with the train window now?

## Scanning train windows

Back to our train window problem: We want to produce a stream of arrays where each contains the last `n` items from the source.
This array is the list we render in the UI to display the items.

When the source stream looks like this (one item per line)...

```
😍
🦊
🍓
🐈
🍕
🐙
⚽️
🐳
```

...and `n` is 4, the result should look like this:

```
[😍]
[🦊, 😍]
[🍓, 🦊, 😍]
[🐈, 🍓, 🦊, 😍]
[🍕, 🐈, 🍓, 🦊]
[🐙, 🍕, 🐈, 🍓]
[⚽️, 🐙, 🍕, 🐈]
[🐳, ⚽️, 🐙, 🍕]
```


Let's go ahead and scan over the source stream.
This means, as an output we want to create an array that contains
- the new source item at the beginning
- the first `n - 1` items from the last result array


```ts
const n = 4;

const result$ = source$.pipe(
  scan((acc, item) => [item, ...acc.slice(0, n - 1)], [])
);
```

We need to provide an empty array as seed here so that the array operation `.slice()` does not fail for an undefined value.

So what can we achieve with this pattern? There are many possible practical cases: displaying the latest logging entries, the latest stock prices or just the latest tweets about a topic like `#Angular`.
Think of a stream of events that you want to display in realtime, but truncated: then this example is for you.


## Extra: Build a custom operator

To hide the complexity we can wrap this thing into a custom operator.
I wrote a dedicated blog post about this topic here: [Build your own RxJS logging operator](https://angular.schule/blog/2018-02-rxjs-own-log-operator).

```ts
export function shiftWindow(n: number = 4) {
  return scan((acc, item) => [item, ...acc.slice(0, n - 1)], []);
}
```

```ts
const result$ = source$.pipe(
  shiftWindow(4)
);
```



## Demo

You can find a working demo on Stackblitz:

<iframe style="width:100%; height: 25em" title="Stackblitz-Demo" src="https://stackblitz.com/edit/angular-train-window?ctl=1&embed=1&file=src/app/app.component.ts"></iframe>


-------

Special thanks to [Jan-Niklas Wortmann](https://twitter.com/niklas_wortmann) and [Johannes Hoppe](https://twitter.com/JohannesHoppe) for review and feedback.


<small>**Header image:** Photo by "Free-Photos" on <a href="https://pixabay.com/de/photos/zug-wagen-fenster-eisenbahn-569323/">Pixabay</a>, modified. The RxJS logo is under Apache License 2.0.
</small>