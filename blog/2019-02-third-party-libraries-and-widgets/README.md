---
title: "How to integrate third party libraries and widgets into Angular"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2019-02-27
keywords:
  - Angular
  - jQuery
  - library
  - libraries
language: en
thumbnail: pixabay-books-1655783.jpg
---

**For an upcoming workshop we were asked how to integrate third-party libraries into an Angular application.
In this blog post we want to have a closer look at this question.
We will discuss a few possible strategies that depend on which technology to integrate.**

> Note: The whole article is based on the assumption that you are using the [Angular CLI](https://cli.angular.io/).

<hr>

Table of contents:

* [General Considerations](/blog/2019-02-third-party-libraries-and-widgets#general-considerations)
* [Integrating a pure ES6 JavaScript Library](/blog/2019-02-third-party-libraries-and-widgets#integrating-a-pure-es6-javascript-library) (lodash)
* [Integrating JavaScript Widgets](/blog/2019-02-third-party-libraries-and-widgets#integrating-javascript-widgets) (plotly.js)
* [Integrating old jQuery Widgets](/blog/2019-02-third-party-libraries-and-widgets#integrating-old-jquery-widgets) (jquery-datetimepicker)
* [Integrating modern jQuery Widgets](/blog/2019-02-third-party-libraries-and-widgets#integrating-modern-jquery-widgets) (Kendo UI for jQuery)
* [Improving performance](/blog/2019-02-third-party-libraries-and-widgets#improving-performance) (NgZone)
* [Don't reinvent the wheel](/blog/2019-02-third-party-libraries-and-widgets#don-t-reinvent-the-wheel)
* [Conclusion](/blog/2019-02-third-party-libraries-and-widgets#conclusion)


## General Considerations
   
First of all, we would like to state that it is basically a better idea to use native Angular modules.
This is the only way to profit from an optimal bundle size.
However, it is often simply necessary to fall back on existing solutions that already meet all technical requirements and thus save a lot of time and money.

Usually the following questions should be answered in advance in order to keep the effort as low as possible:

- Are there alternatives that are already based on Angular and how much effort would there be to use this alternative?
- Is the library / widget compatible with ES2015 (ES6) Modules or do we have to use the global object (`window`)? 
- How big is the foreign code? Will it slow down the build process significantly? Can we use a CDN if necessary?
- Is jQuery a dependency? (jQuery itself can be quite large, see [jQuery file size](https://mathiasbynens.be/demo/jquery-size))



## Integrating a pure ES6 JavaScript Library

As an example of a perfect third party library we would like to introduce lodash.
Lodash is the Swiss Army Knife for all kinds of programming tasks.
It is well organized and supports ES2015 modules.

For example, if we want to make a deep copy of an object, we are very well served with Lodash.
First, we have to install it:

```bash
npm install lodash
npm install @types/lodash --save-dev
``` 

Now we are able to import the method as usual.
The required command looks like this:

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
So we don't install the whole codebase but only the necessary parts and its types.

```bash
npm install lodash.clonedeep
npm install @types/lodash.clonedeep --save-dev
```

```ts
import cloneDeep from 'lodash.clonedeep';
```

This doesn't just apply to lodash.
We should always check how big the bundles will be by our new dependencies.
In fact, if we work with 3rd party libraries, the bundle sizes will become one of the biggest showstoppers.

You might get the following error, when using the Angular CLI with `lodash.clonedeep`:
> lodash-example.component.ts(7,8): error TS1192: Module '"xxx/node_modules/@types/lodash.clonedeep/index"' has no default export.

No worries, there is compiler option to fix the typechecking.
The option `allowSyntheticDefaultImports` allows default imports from modules with no explicit default export.
So we want to open the file `tsconfig.json` and add the following value:

```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true
  }
}
``` 

**[👉 Code on Stackblitz](https://stackblitz.com/edit/angular-3rd-party-libraries-and-widgets?file=src%2Fapp%2Flodash-example%2Flodash-example.component.ts)**


## Integrating JavaScript Widgets

Lets take a look at [plotly.js](https://plot.ly/javascript/).
It is a high-level, declarative charting library, which is built on top of [d3.js](http://d3js.org/) and [stack.gl](http://stack.gl/),
The library ships with many preconfigured chart types, including scientific charts, 3D graphs, statistical charts, SVG maps, financial charts, and more.

![plotly.js demo](plotly_2017.png)

We can again start by installing it via npm

```bash
npm install plotly.js-dist
```

and import plotly.js as

```ts
import Plotly from 'plotly.js-dist'; 
```

But beware, plotly.js with all its depedencies (including D3.js) is huge!
Again, we can save a lot of bundle size if we choose the right package.
Please refer to the official [bundle information](https://github.com/plotly/plotly.js/blob/master/dist/README.md#bundle-information) to choose the right partial bundle.

The main plotly.js bundle weighs in at:

| plotly.js | plotly.min.js | plotly.min.js + gzip |
|-----------|---------------|----------------------|
| 6.1 MB    | 2.8 MB        | 849.5 kB             |

That's a hell of a lot of code to draw a pie chart, for example.
If we just want to draw a pie chart we can choose the `basic` partial bundle instead.
It contains trace modules `scatter`, `bar` and `pie`:

| Raw size | Minified size | Minified + gzip size |
|----------|---------------|----------------------|
| 2.3 MB   | 810.9 kB      | 264.8 kB             |

At least that's a little better.
<!--
There are also CDN links available, which can be used, too.
We will take a look at them later on.
https://cdn.plot.ly/plotly-basic-1.44.4.min.js
-->

So we are going to install [`plotly.js-basic-dist`](https://www.npmjs.com/package/plotly.js-basic-dist) via

```bash
npm install plotly.js-basic-dist
```

and import it like this:

```ts
import Plotly from 'plotly.js-basic-dist'
```

The plotly.js packages with the `-dist` suffix contain a ready-to-use plotly.js distributed bundle.
It is not minified, but we don't want it to be minified here.
Instead, we will minify the code from plotly.js along with the other code in the productive build of Angular (`ng build --prod`).

Ok. Let's start.

The idea behind plotly.js is quite simple.
We have a `<div>` element, get a reference to it and draw a "plot" into it. 
In a world without Angular our code would look like this:

```ts
const myDiv = document.getElementById('id_of_the_div')

const data = [{
  values: [66, 22, 12],
  labels: ['Angular', 'React', 'Vue'],
  type: 'pie'
}];

const layout = {
  title: 'Top 3 Most Popular SPA Frameworks in 2019*',
  height: 400,
  width: 500
};

Plotly.newPlot(myDiv, data, layout);
``` 

<small>(&ast;Note: exactly one person was interviewed for this ranking.)</small>

The question is, where do we get a reference to the DOM element from?

The simplest way provided by angular is the wrapper `ElementRef`.
It's the return type of the `@ViewChild()` decorator, if there is no component applied (otherwise it will return a component instance instead). 
The decorator accepts various selectors, as described [here](https://angular.io/api/core/ViewChild). 
We will use a template reference variable as a string, so `@ViewChild('myDiv')` will query against `<div #myDiv></div>`.
The `ElementRef` will be ready when `ngAfterViewInit()` is called:

```ts
import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import Plotly from 'plotly.js-basic-dist'

@Component({
  selector: 'app-plotlyjs-example',
  template: `<div #myDiv></div>`
})
export class PlotlyjsExampleComponent implements AfterViewInit {

  @ViewChild('myDiv')
  myDiv: ElementRef;

  ngAfterViewInit() {

    const myDivEl = this.myDiv.nativeElement;

    const data = [{
      values: [66, 22, 12],
      labels: ['Angular', 'React', 'Vue'],
      type: 'pie'
    }];

    const layout = {
      title: 'Top 3 Most Popular SPA Frameworks in 2019*',
      height: 400,
      width: 500
    };

    Plotly.newPlot(myDivEl, data, layout);
  }
}
```

There are multiple other ways to get a reference to a DOM element.
We recommend the following article if you are interested in other ways to get a reference to a DOM element: [Angular in Depth: Exploring Angular DOM manipulation techniques](https://blog.angularindepth.com/exploring-angular-dom-abstractions-80b3ebcfc02)

**[👉 Code on Stackblitz](https://stackblitz.com/edit/angular-3rd-party-libraries-and-widgets?file=src%2Fapp%2Fplotlyjs-example%2Fplotlyjs-example.component.ts)**


## Integrating old jQuery Widgets

As we have seen, ES2015 modules are an ideal way to use third-party libraries.
However, not all third-party libraries support this modern way.
These libraries often assume that jQuery is available in the global scope and very old ones don't utilize modules at all.

Here it is important to pay attention to the version of jQuery.
Not all libraries support jQuery v3, because it has a some of breaking changes.
For this example I have chosen the plugin `jquery-datetimepicker` since it requires "classic" jQuery.
So let's install jQuery from the outdated v1 branch and the library with the help of npm.

```bash
npm install jquery@1.12.4
npm install @types/jquery@1.10.35 --save-dev
npm install jquery-datetimepicker@2.5.20
```
Fortunately, the Angular CLI provides a declarative way to provide these libraries/widgets via the `angular.json` file.
Locate the build configuration of your project and search for the `scripts` property.
It accepts an array of JavaScript files that are added to the global scope of the project.
This is especially useful for legacy libraries or analytic snippets.    

```json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "options": {
            "scripts": [
              "node_modules/jquery/dist/jquery.min.js",
              "node_modules/jquery-datetimepicker/build/jquery.datetimepicker.full.js"
            ],
            "styles": [
              "src/styles.css",
              "node_modules/jquery-datetimepicker/jquery.datetimepicker.css"
            ]
          }
        }
      }
    }
  }
}
```

First we have to load jQuery, then the plugins.
Next to the `scripts` property we see the `styles` property. 
It allows us to add global stylesheets.
Angular CLI supports CSS imports and all major CSS preprocessors.

To satisfy the type checking we create an interface with the name `JQuery` in your local typings declaration file `typings.d.ts` and introduce the plugin function.

```ts
interface JQuery {
  datetimepicker(options?: any): any;
}
```

Now we are ready to do all that dirty jQuery stuff we used to love for so many years:

```ts
import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-jquery-old-example',
  template: `<input id="datetimepicker" type="text">`
})
export class JqueryOldExampleComponent implements AfterViewInit {

  public ngAfterViewInit()
  {
    jQuery('#datetimepicker').datetimepicker();
  }
}
```

Note that this is not clean code.
We use an object in the global scope (`jQuery`) and select directly against an element by ID.
If we include the component twice and thus have two IDs, the result is not deterministic.
The next example shows a better approach.

**[👉 Code on Stackblitz](
https://stackblitz.com/edit/angular-3rd-party-libraries-and-widgets?file=src%2Fapp%2Fjquery-old-example%2Fjquery-old-example.component.ts)**


## Integrating modern jQuery Widgets

Of course, also jQuery as well as modern jQuery plugins support all kind of module formats and can be imported via `import` statements.
As an example, we want to try out the Scheduler of Kendo UI for jQuery (which hasn't been ported to Kendo UI for Angular until now!)

```bash
npm install jquery@3.3.1
npm install @types/jquery@3.3.29 --save-dev
```

Here we will install the full version of Kendo UI for jQuery.
Please keep in mind that the vendor provides customized versions, too.

```bash
npm install @progress/kendo-ui
```

Since we are able to use modules, we can import jQuery and the plugin directly from the typescript code.
There is no need to add an entry to `angular.json`:

```ts
import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import options from './options';
import jQuery from 'jquery';
import '@progress/kendo-ui';

@Component({
  selector: 'app-kendo-ui-jquery-example',
  template: `<div #myDiv></div>`
})
export class KendoUiJqueryExampleComponent implements AfterViewInit {

  @ViewChild('myDiv')
  myDiv: ElementRef;

  public ngAfterViewInit()
  {
    const myDivEl = this.myDiv.nativeElement;
    jQuery(myDivEl).kendoScheduler(options);
  }
}
```

We also see again the use of `ElementRef`.
It's a better approach to ask Angular for reference to a DOM element instead of grabbing it directly.

**[👉 Code on Stackblitz](https://stackblitz.com/edit/angular-3rd-party-libraries-and-widgets?file=src%2Fapp%2Fkendo-ui-jquery-example%2Fkendo-ui-jquery-example.component.ts
)**


## Improving performance

We can improve the performance of all shown solutions.
The default change detection from Angular is triggered on every event that our code is subscribed to.
This can have a huge impact to the overall performance of our Angular app.
A lot of old code listens actively to the mouse movements or scroll events.
As a result, change detection is called multiple times and makes everything slow.

To omit that problem, we can make use of the `NgZone` class.
By default, Angular works together with [zone.js](https://github.com/angular/zone.js/) that introduces a concept of zones.
Within a zone, all async APIs are patched and therefore it is possible to run code whenever the asynchronous code finishes.
As long as we use the default change detection strategy (`ChangeDetectionStrategy.Default`), everything that happens within the zone of Angular triggers a change detection run.
If we are not interested in triggering CD, because our third party library does not interact at all with Angular, we can move our code execution into our own zone.

```ts
import { Component, ViewChild, AfterViewInit, ElementRef, NgZone
} from '@angular/core';

@Component({
  // [...]
})
export class KendoUiJqueryExampleComponent implements AfterViewInit {

  // [...]

  constructor(private ngZone: NgZone) { }

  public ngAfterViewInit()
  {
    this.ngZone.runOutsideAngular(() => { 
      const myDivEl = this.myDiv.nativeElement;
      jQuery(myDivEl).kendoScheduler(options);
    });
  }
}
```

 We can return back to the angular zone anytime via `this.ngZone.run(() => { })`.

## Don't reinvent the wheel

It happens to us developers quite often that we reinvent the wheel.
In the case of plotly.js, there is already a wrapper that has the same technical foundation as described in our article (see [here](https://github.com/plotly/angular-plotly.js/blob/78b9385da1a9a56fe2c9b3b914fce1e63707ae02/src/app/shared/plot/plot.component.ts#L37)):

```bash
npm install angular-plotly.js
npm install plotly.js
```

A large number of inputs and outputs have already been implemented, so it is better to have a look at this solution twice.

So we should add the `PlotlyModule` into the main app module of your project:

```typescript
import { PlotlyModule } from 'angular-plotly.js';

@NgModule({
    imports: [
      // ...
      PlotlyModule
    ],  
    // ...
})
export class AppModule { }
```

Then use the `<plotly-plot>` component to display the same chart as before:

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-angular-plotlyjs-example',
  template: `<plotly-plot [data]="data" [layout]="layout"></plotly-plot>`,
})
export class AngularPlotlyjsExampleComponent {

  public data = [{
    values: [66, 22, 12],
    labels: ['Angular', 'React', 'Vue'],
    type: 'pie'
  }];

  public layout = {
    title: 'Top 3 Most Popular SPA Frameworks in 2019*',
    height: 400,
    width: 500
  }
}
```

But note: it's still just a wrapper around that large library!

**[👉 Code on Stackblitz](
https://stackblitz.com/edit/angular-3rd-party-libraries-and-widgets?file=src%2Fapp%2Fangular-plotlyjs-example%2Fangular-plotlyjs-example.component.ts)**

## Conclusion

We have seen some ways to use existing (legacy) code in a modern Angular applications.
Unless there is a true Angular based solution, this is a legitimate approach.
If there is a wrapper around, it is always a good idea to evaluate it first!
And if something important is not implemented for that wrapper, just make a pull-request! 😉

For your reference, this is the full example on Stackblitz:

<iframe style="width: 98%; height: 800px;" title="Stackblitz-Demo" src="https://stackblitz.com/edit/angular-3rd-party-libraries-and-widgets?embed=1&view=preview&ctl=1"></iframe>

