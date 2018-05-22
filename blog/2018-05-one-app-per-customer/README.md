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
My first answer was: "That's easy: `NgModules`!". But how exactly? 🤔

## Explanation

I asked a little bit more and got the following explanation from the attendee.

* The attendee was asking this question for his current project at his company.
* There is nice a REST-API backend with swagger in place. No work here. Hooray!
* There is a (technically outdated) web-application to provide the UI. They are doing the hosting. 
* Everything should be re-implemented with Angular, of course.
* There are more than, let's say, 100 customers.
* Every customer expects a slightly different application.

One of the current unique selling points are the specific-apps.
Every customer can purchase a different set of features for different fields of applications. For example, main feature X as well as customer management, debt collection and reports. Bigger customers might also want a full HR solution, and so on. You get the point.

This should be easy to archive, no matter which technical solution is chosen. But it gets a bit more challenging, because some forms are very specific for each customer. For example the 	order acceptance form might have specific controls based on the customers individual demands for an order.

Right now the customer combines Silverlight and MEF. The technology is outdated, but it had some great strengths. It is possible to create a specific app just buy adjusting a configuration file and by throwing the required libraries (DLL) into the right folder. A library is missing, the feature is not shown. A more specific screen overrides the standard screen (.NET reflection involved as far as I know). And it works flawlessly. 

## Requirements

The future product/solution should be...

1. fast, and not bloated with unused code because of conditional statements
2. maintainable, if possible a dedicated build for each customer should be avoided


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

**PROS:**

* dead simple
* one workspace* to maintain
* one build to maintain

**CONS:**

* spaghetti code to maintain
* unused code everywhere (bigger bundle sizes, possible interferences everywhere)
* hard/impossible to deliver different versions to different customers (one update for one customer effects all other customers, too)
* just no

_`*` In this article I will use the word "workspace" to describe one angular cli project in one physical folder. I don't want to confuse this with the word "project" in the context of the new multi application/libarry support (see below)._



### 2. One fat application, multiple small ones<br>(Extracting everything to NPM packages)

I'm a big fan of Angular-Modules that are compiled and delivered via NPM.
NPM packages have versions and can demand dependencies.
The great thing: the can be hosted privately on [NPM](https://docs.npmjs.com/private-modules/intro), on [myget](https://www.myget.org/), on your on-premise or cloud [TFS](https://docs.microsoft.com/en-us/vsts/package/?view=vsts), on [Nexus](https://www.sonatype.com/nexus-repository-oss), [verdaccio](https://github.com/verdaccio/verdaccio) (a fork of good-old sinopia) and many more!

Before angular cli 6 I was used to [`ng-packagr`](https://github.com/dherges/ng-packagr). It took me some time, to configure an existing product to work as in the demo [`ng-packaged`](https://github.com/dherges/ng-packaged). But it the end, the work has paid off (e.g. [here](https://github.com/angular-schule/homepage-tools)). You get a npm package with an angular-library in the [Angular Package Format](https://docs.google.com/document/d/1CZC2rcpxffTDfRDs6p1cfbmKNLA6x5O-NtkJglDaBVs/edit) which is relatively easy to setup but also extremely configurable.

With version 6 of the Angular CLI we finally "official" support for multiple projects in one folder — which is great! Take a look at the new workspace file (`angular.json`) for that. A project can be either an  application or a library (see [here](https://github.com/angular/angular-cli/wiki/angular-workspace)). The library support works on top of `ng-packagr `, too.

You can create a library in an existing workspace by running the following commands:

```bash
ng generate library my-lib
```

You should now have a library inside `projects/my-lib`. It contains a component and a service inside a NgModule. Read more about library creation [here](https://github.com/angular/angular-cli/wiki/stories-create-library).

We could create one (or more) projects that would contain the ultimate, full-blown app. Every feature would be organised in one NgNodule and would be delivered as one NPM package. Consequently, we would need 100 smaller workspaces that compose those NPM packages. We would have one big app and for each customer his own angular cli solution.

**PROS:**

* easy to setup, since there is direct support via angular cli now
* every single workspace would be highly customisable 
* the dedicated apps would only contain the code they need, this should lead to small bundle sizes
* **USP:** we could utilise semver **versioning** to deliver features/patches only to selected applications (and therefore customers)


**CONS:**

* multiple workspaces to maintain (in the worst case it would be 100+1 workspaces)
* multiple builds to maintain
* possible version conflicts in complex scenaries
* historically, angular cli and `npm link` were never real friends (see [here](https://github.com/angular/angular-cli/issues/3854#issuecomment-274344771), or [here](https://github.com/angular/angular-cli/issues/6195))


### 3. Monorepo: One fat application with multi application support<br>(No NPM packages involved)

This idea is pretty similar to #2. But this time we would utilise multiple apps via `angular.json`. Angular CLI now supports multiple individual applications within one workspace, each with separate configurations and defaults. To create another app you can use the following command:

```bash
ng generate application my-other-app
```

The new application will be generated inside `projects/my-other-app`. Now we can build each application by passing the project name with the command:

```bash
ng build my-other-app
```

Approach #2 was based on the idea of multiple libraries. Now we have multiple apps which derive from the big-fat application. We reduce complexity, since we don't need to publish a big amount of NPM packages around. The first application could be the "big fat application" that contains all feature modules and shared modules to have the full picture. All other applications could only use the required NgModules - and not more.

**PROS:**

* easy to setup, since there is direct support via angular cli
* small bundle sizes, too
* one workspace to maintain
* one build to maintain (if we build multiple apps in one big build)
* no versioning (this can be good point, everything is in sync with each other)


**CONS:**

* the build will have a very long runtime if we choose to build all apps
* no versioning: we can not utilise semver versioning to deliver features/patches only to selected applications


## Conclusion

I see pretty few disadvantages for the last approach. So I would definitely recommend #3. If this doesn't scale, we could always extract parts of the monorepo into separate npm packages.

One way to start is [Nx from Nrwl](https://github.com/nrwl/nx-examples):

```bash
npm install -g @angular/cli @nrwl/schematics 
create-nx-workspace one-app-per-customer
cd one-app-per-customer
ng generate app big-fat-app --routing
ng generate app company1 --routing
ng generate lib shared-lib
```

All commands are explained [here](https://github.com/nrwl/nx-examples). This gives you the quickest possible out-of the box solution available.

#### DIY

But we have to keep in mind, that `@nrwl/schematics` adds yet another dependency and a layer of abstraction into the solution. We can archive almost the same with pure angular cli.

```bash
ng new one-app-per-customer --routing
cd one-app-per-customer
ng generate application company1 --routing --prefix=company1
ng generate application company2 --routing --prefix=company2
ng generate library shared-lib --prefix=shared-lib
```

Feel free to tweak the folder structure a bit. Nx creates a folder called `/apps` and another called `libs`. This is for sure cleaner than the default folder structure of the cli.
We can now start each application with:

```bash
ng start -o
ng start company1 -o
ng start company2 -o
```

Let's add a new component to the library:

```bash
cd projects/shared-lib/src/lib
ng g component awesome-button --flat --export
```

This will create a new component at the right place and also tweaks the libraries module so that the component can be imported from other places. 