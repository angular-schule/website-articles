---
title: "How to integreate third party libraries and widgets into Angular"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2019-02-21
keywords:
  - Angular
  - jQuery
  - library
  - libraries
language: en
thumbnail: ../angular.png
hidden: true
---

**
For an upcoming workshop we were asked how to integrate third-party libraries into an Angular application.
In this blog post we want to have a closer look at this question.
We will discuss a few possible strategies and weigh them against each other.**

<hr>

First of all, we would like to state that it is basically a better idea to use native Angular modules.
This is the only way to profit from an optimal bundle size.
However, it is often simply necessary to fall back on existing solutions that already meet all technical requirements and thus save a lot of time and money.

Usually the following questions should be answered in advance in order to keep the effort as low as possible:

- Are there alternatives that are already based on Angular and how much would be the effort to use this alternative?
- Is the library / widget compatible with ES2015 (ES6) Modules or do we have to use the global object (`window`)? 
- How big is the foreign code? Will it slow down the build process significantly. Can we use a CDN if necessary?
- Is jQuery a dependency? (jQuery itself is also quite large, see [jQuery file size](https://mathiasbynens.be/demo/jquery-size))

Table of contents:
* [Integrating a pure ES6 JavaScript Library](#integrating-a-pure-es6-javascript-library)

## Integrating a pure ES6 JavaScript Library

As an example of a perfect third party library we would like to introduce lodash.
Lodash is the Swiss Army Knife for all kinds of programming tasks.
It is well organized and supports ES2015 modules.

For example, if we want to make a deep copy of an object, we are very well served with Lodash.

```bash
npm install lodash
npm install @types/lodash --save-dev
``` 

Now we are able to import the method as normal.
The command looks like this.

```ts
import { cloneDeep } from 'lodash';

const nestedObject = {
  nested: {
     hello: 'world'
  }
}
const deepCopy = cloneDeep(nestedObject);

nestedObject === deepCopy // false
nestedObject.nested === deepCopy.nested // false (it's a deep copy)
```

Since clean tree shaking [can be tricky](https://medium.com/@martin_hotell/tree-shake-lodash-with-webpack-jest-and-typescript-2734fa13b5cd), we can also try a separate package.
So we don't install the whole codebase but only the needed part and its types.

```bash
npm install lodash.clonedeep
npm install @types/lodash.clonedeep --save-dev
```

```ts
import cloneDeep from 'lodash.clonedeep';
```

This doesn't just apply to lodash.
We should always check how big the bundles will be by our new dependencies.
In fact, if we work with 3rd party libraries, the bundle sizes will become one of the biggest showstoppers ever.

**[👉 Demo on Stackblitz](https://stackblitz.com/edit/angular-3rd-party-libraries-and-widgets?file=src%2Fapp%2Flodash-example%2Flodash-example.component.ts)**


# Integrating a JavaScript Widget

Lets take a look at [plotly.js](https://plot.ly/javascript/).
It's is a high-level, declarative charting library, which is built on top of [d3.js](http://d3js.org/) and [stack.gl](http://stack.gl/),
The library ships with many preconfigured chart types, including scientific charts, 3D graphs, statistical charts, SVG maps, financial charts, and more.

![plotly.js demo](plotly_2017.png)

We can again start by installing it via npm

```bash
npm install plotly.js-dist
```

and import plotly.js as

```
import Plotly from 'plotly.js-dist'; 
```

But beware, plotly.js with all it's depedencies (inlcuding D3.js) is huge!
Again, we can save a lot of bundle size if we choose the right package.
Please refer to the official [bundle information](https://github.com/plotly/plotly.js/blob/master/dist/README.md#bundle-information) to choose the right partial bundle.

The main plotly.js bundle weights in at:

| plotly.js | plotly.min.js | plotly.min.js + gzip |
|-----------|---------------|----------------------|
| 6.1 MB | 2.8 MB | 849.5 kB |

That's a hell of a lot of code to draw a pie chart, for example.
If we just want to draw a pie chart we can choose the `basic` partial bundle instead.
It contains trace modules `scatter`, `bar` and `pie`:

| Raw size | Minified size | Minified + gzip size |
|------|-----------------|------------------------|
| 2.3 MB | 810.9 kB | 264.8 kB |

At least that's a little better.
There are also CDN links available, which can be used, too.
We will use them later on.


# Integrating a jQuery Widget