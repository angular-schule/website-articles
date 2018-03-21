---
title: "10 pure immutable operations you should know"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2017-12-08
keywords:
  - Immutable
  - Array
  - TypeScript
language: en
thumbnail: glass-cube-and-sphere-1423317.jpg
hidden: true
---

## Without any framework

Let's talk about immutability.
If you work with a framework like [`@angular-redux/store`](https://github.com/angular-redux/store) or [@ngrx](https://github.com/ngrx/platform) then you should try to not alter existing state. Immutable objects are also very handy, when you optimise you angular application with `ChangeDetectionStrategy.OnPush`.

In general, you can decide between two different approaches:

1. Use an existing framework like [Immutable.js](https://facebook.github.io/immutable-js/) or [seamless-immutable](https://github.com/rtfeldman/seamless-immutable)
2. Use some pure JavaScript patterns that allow us to always create new objects instead of touching existing ones
  
In the beginning, an existing framework gives you guidance and makes it pretty much harder to mess up the state.
However, using pure ECMAScript functions can be fun, too!
There is no extra layer of abstraction and soon you will like those repeating patterns.
With a bit of practice your code is very easy to read and to test.
Sounds great?
Let's start!

By the way, we will use TypeScript in order to have interfaces,
a bit of type checking and those nice access modifiers for the constructor we'll be using later.

## 1. Manipulating objects with the spread operator

Imagine, you have a state like this:

```ts
export interface State {
  prop1: string;
  prop2: string;
  prop3: string;
}
```

You want to change one or more properties.
The most obvious way to create a new object is this:

```ts
const state = {
  prop1: 'test1',
  prop2: 'test2',
  prop3: 'test3'
}

const newState = {
  prop1: state.prop1,
  prop2: state.prop2,
  prop3: 'CHANGED!'
}

console.log(newState); // {prop1: "test1", prop2: "test2", prop3: "CHANGED!"}

```

This is the same as:

```ts
// ...

const prop1 = state.prop1;
const prop2 = state.prop1;

const newState = {
  prop1,
  prop2,
  prop3: 'CHANGED!'
}

console.log(newState); // {prop1: "test1", prop2: "test2", prop3: "CHANGED!"}
```

However, we can also change one or more properties by using the Object Spread Operator (`...`):

```ts
const state = {
  prop1: 'test1',
  prop2: 'test2',
  prop3: 'test3'
}

const newState = {
  ...state,
  prop3: 'CHANGED!'
}

console.log(newState); // {prop1: "test1", prop2: "test2", prop3: "CHANGED!"}

```

This is easy to understand and super clean!
Also the code is not going to break when more properties are added in the future.


# 2. Manipulating objects with `Object.assign()`

Sometimes you want to reuse a bunch of properties from various places.
[Object.assign()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) can be very useful here: 

```ts
const initialState = {
  prop1: 'start1',
  prop2: 'start2',
  prop3: 'start3'
}

const state = {
  prop1: 'test1',
  prop2: 'test2',
  prop3: 'test3'
}

const newState = Object.assign(
  {},
  initialState,
  {
     prop2: state.prop2
  },
  {
     prop3: 'CHANGED!'
  }
);

console.log(newState); // {prop1: "start1", prop2: "test2", prop3: "CHANGED!"}

```

The order of arguments is important.
The first object is the one whose properties are going to be assigned by `Object.assign()`.
That first object is being mutated, so that's why we have to use a new empty object here.
All other arguments are sources to copy properties from. They are not being mutated.
If the same properties occur multiple times, the last one defined wins.


# 3. - 10. Manipulating arrays

Recently we found a pretty cool snippet on [Twitter](https://twitter.com/lukejacksonn/status/928244319760220160).
It shows a collection of immutable array operations using ECMAScript 2015 syntax:

```js
// immutable-array.js

clone = x => [...x];
push = y => x => [...x, y];
pop = x => x.slice(0, -1);
unshift = y => x => [y, ...x];
shift = x => x.slice(1);
sort = f => x => [...x].sort(f);
delete = i => x => [...x.slice(0, i), ...x.slice(i + 1)];
splice = (s, c, ...y) => x => [...x.slice(0, s), ...y, ...x.slice(s + c)];
```

All those operations return a new array instead of manipulating the existing one – which is the core concept of immutability.
Honestly, the code is a bit tricky to read and understand.
I decided to refactor it a bit and to verify everything with unit tests. _(hint: the above code is proven to be flawless)_

```ts
// immutable-array.ts

/**
 * Immutable array manipulations
 * These functions don't mutate the original array but return a new one instead
 *
 * inspired by https://twitter.com/lukejacksonn/status/928244319760220160
 */
export class ImmutableArray {

  constructor(private arr: any[]) { }

  /**
   * Create a shallow copy of the array
   */
  clone = () => [...this.arr];

  /**
   * Add one element to the end of the array
   */
  push = newElement => [...this.arr, newElement];

  /**
   * Remove the last element from the array
   */
  pop = () => this.arr.slice(0, -1);

  /**
   * Add one elements to the front of the array
   */
  unshift = (newElement) => [newElement, ...this.arr];

  /**
   * Remove the first element from the array
   */
  shift = () => this.arr.slice(1);

  /**
   * Sort the elements of an array
   */
  sort = compareFn => this.clone().sort(compareFn);

  /**
   * Remove an element by index position
   */
  delete = index => [...this.arr.slice(0, index), ...this.arr.slice(index + 1)];

  /**
   * Remove existing elements and/or adds new elements
   *
   * @param start Index at which to start changing the array
   * @param deleteCount An integer indicating the number of old array elements to remove
   * @param elements The elements to add to the array, beginning at the start index.
   *                 If you don't specify any elements, splice() will only remove elements from the array.
   */
  splice = (start, deleteCount, ...elements) => [
    ...this.arr.slice(0, start),
    ...elements,
    ...this.arr.slice(start + deleteCount)
  ]
}
```

As promised, here is a set of **unit tests** that demonstrate the usage of each method:

```ts
// immutable-array.spec.ts

import { ImmutableArray } from './immutable-array';

describe('ImmutableArray', function() {

  let abc;
  beforeEach(() => abc = ['A', 'B', 'C']);

  it('clone() should create a shallow copy of the array', function() {
    const result = new ImmutableArray(abc).clone();
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('push() should add one element to the end of the array', function() {
    const result = new ImmutableArray(abc).push('D');
    expect(result).toEqual(['A', 'B', 'C', 'D']);
  });

  it('pop() should remove the last element from the array', function() {
    const result = new ImmutableArray(abc).pop();
    expect(result).toEqual(['A', 'B']);
  });

  it('unshift() should add one element to the front of the array', function() {
    const result = new ImmutableArray(abc).unshift('D');
    expect(result).toEqual(['D', 'A', 'B', 'C']);
  });

  it('shift() should remove the first element from the array', function() {
    const result = new ImmutableArray(abc).shift();
    expect(result).toEqual(['B', 'C']);
  });

  it('sort() should sort the elements of an array', function() {
    const result = new ImmutableArray(abc).sort((a, b) => b.localeCompare(a));
    expect(result).toEqual(['C', 'B', 'A']);
  });

  it('delete() should remove an element by index position', function() {
    const result = new ImmutableArray(abc).delete(1);
    expect(result).toEqual(['A', 'C']);
  });

  it('splice() should remove 0 elements from index 2, and insert "Z"', function() {
    const result = new ImmutableArray(abc).splice(2, 0, 'Z');
    expect(result).toEqual(['A', 'B', 'Z', 'C']);
  });

  it('splice() should remove 2 elements from index 1', function() {
    const result = new ImmutableArray(abc).splice(1, 2);
    expect(result).toEqual(['A']);
  });
});
```

Look closely and you'll realize that the `sort()` method is just a little abstraction of the original `Array.sort()` method.
This is because `Array.sort()` will mutate the given array, which is what we want to avoid.
In practice, nobody wants to reimplement the original implementation.
Thus, the simplest way of getting a new sorted array is to make a shallow copy first.

<!--
## Demo

Of course, there is a demo at:

-->