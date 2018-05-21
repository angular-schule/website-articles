---
title: "One app per customer"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2018-05-21
keywords:
  - Angular
  - NgModule
  - Modules
language: en
thumbnail: ../angular6.png
hidden: true
---

**In this article, I will discuss some ideas how to produce individual angular apps. How do we get one app per customer, if we have 100+ customers?**

<hr>

Recently, I was asked during a workshop how to produce customer-specific angular apps.
My first answer was: "That's easy: `NgModules`!". Isn't it? 🤔

## Explanation

I asked a little bit more and got the following explanation from the attendee.

* The attendee was asking this question for his current project at his company.
* The company is a leader in its corner on the market.
* There is nice a REST-API backend with swagger in place. Hooray!
* There is a (technically outdated) web-application to provide the UI. They are doing the hosting. 
* Everything should be re-implemented with Angular, of course.
* There are more than, let's say, 100 customers.
* Every customer expects a slightly different solution.

One of the current unique selling points are the specific-apps.
Every customer can purchase a different set of features for different fields of applications. For example, main feature X as well as customer management, debt collection and reports. Bigger customers might also want a full HR solution, and so on. You get the point.

This should be easy to archive, no matter which technical solution is chosen. But it gets a bit more challenging, because some forms are very specific for each customer. For example the 	order acceptance form might have specific controls based on the customers individual demands for an order.

Right now the customer combines Silverlight and MEF. The technology is outdated, but it had some great strengths. It is possible to create a specific app just buy adjusting a configuration file and by throwing the required libraries (DLL) into the right folder. A library is missing, the feature is not shown. A more specific screen overrides the standard screen (.NET reflection involved as far as I know). And it works flawlessly. 

## Requirements

The future product/solution should be

1. fast, and not bloated with unused code because of conditional statements
2. maintainable, if possible a dedicated build for each customer should be avoided
3. compatible with Cordova, to provide a hybrid app 

## Ideas

How could we do the same? Let's collect some ideas:


### 1. One big monolith

The simplest approach. One single software project must be maintained. 
We could use feature toggles (for example [ngx-feature-toggle](https://github.com/willmendesneto/ngx-feature-toggle)) to enable / disable smaller or bigger parts of the application:

```html
<feature-toggle [featureName]="'reports'">
  <p>condition is true and reports are shown here.</p>
</feature-toggle>
```

We could also use `*ngIf` directly, but we would need to add some own boilerplate code around.

PROS:

* dead simple
* one build to maintain

CONS:

* spaghetti code to maintain
* unused code everywhere (bigger filesize, possible interferences everywhere)
* hard/impossible to deliver different versions to different customers (one update for one customer effects all other customers, too)
* just no



### 2. Extract everything to packages

I'm a big fan of Angular-Modules that are compiled and delivered via NPM.
NPM packages have versions and can demand dependencies.
The great thing: the can be hosted privately on [NPM](https://docs.npmjs.com/private-modules/intro), on [myget](https://www.myget.org/), on your on-premise or cloud [TFS](https://docs.microsoft.com/en-us/vsts/package/?view=vsts), on [Nexus](https://www.sonatype.com/nexus-repository-oss) and many more!

Before Angular-CLI 6 I was used to [`ng-packagr`](https://github.com/dherges/ng-packagr). It took me some time, to configure an existing product to work as in the demo [`ng-packaged`](https://github.com/dherges/ng-packaged). But it the end, the work has paid off.

Now the Angular CLI workspace file (`angular.json`) supports multiple projects in one folder. A project can be either an  application or a library (see [here](https://github.com/angular/angular-cli/wiki/angular-workspace)). The library support works on top of `ng-packagr `.