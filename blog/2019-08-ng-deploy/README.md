---
title: "All you need to know about `ng deploy`"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2019-08-22
keywords:
  - Angular
  - Angular CLI
  - Deployment
  - ng deploy
  - ng-deploy
language: en
thumbnail: space-shuttle.jpg
hidden: false
---

**With version 8.3 of the Angular CLI a new command will be released which has the potential to be a game changer. Now, deployments to any target (Firebase, Azure, GitHub pages...) are potentially only one CLI command away. In this article we will show you everything you need to know.** 

<hr>

Table of contents:

- [Introduction](/blog/2019-08-ng-deploy#introduction)
- [Background](/blog/2019-08-ng-deploy#background)
- [Command Line Call](/blog/2019-08-ng-deploy#command-line-call)
- [Existing providers](/blog/2019-08-ng-deploy#existing-providers)
- [Deploy to multiple targets](/blog/2019-08-ng-deploy#deploy-to-multiple-targets)
- [How to make your own deployment builder](/blog/2019-08-ng-deploy#how-to-make-your-own-deployment-builder)
- [Summary](/blog/2019-08-ng-deploy#summary)



## Introduction

In Angular CLI version 8.3 the Angular team [added a CLI command](https://github.com/angular/angular-cli/pull/15105) which invokes a so-called __deployment builder__ for a project.
This enables us to deploy the application to any potential provider or target with just one command: `ng deploy`.
The amount of code added is relatively small, because builders have already been around for a longer time.
Another reason is that the CLI itself does not have much to do, but passes the work on to other third-party code instead.
So it's up to the community to breathe life into the command.
And that's the reason for this article!


## Background

In fact, the CLI already had this ability for a while.
Angular CLI allows us to extend the set of functionality by implementing builders and invoking them with `ng run [builder-name]`.
There is a very detailed [guide about builders](https://angular.io/guide/cli-builder) provided in the official docs.


However, until now deploy commands were not made on top of CLI builders.
Those commands were usually hidden in their own CLI (e.g. `firebase deploy`) and had nothing to do with the Angular CLI.
Our own deploy command ([angular-cli-ghpages](https://github.com/angular-schule/angular-cli-ghpages/)) was one of them.
There was simply no requirement for us to implement a deeper integration into the CLI.

Up to now, builders have not yet achieved the necessary attention they deserve.
The new command `ng deploy` is designed to change that!
* It runs in the Angular CLI, so it's clear that an Angular App should be deployed and reasonable defaults can be set accordingly.
* It is called `ng deploy` instead of the usual `ng run [builder-name]` which might be confusing otherwise.
* It throws a meaningful message in case there is no deployment builder installed (`Cannot find "deploy" target for the specified project. You should add a package that implements deployment capabilities for your favorite platform.`).
* It has a very short syntax, because by default it will deploy the default project in the workspace.
* **And the most important point:**
  It is an invitation to the community to standardise deployments under the umbrella of the Angular CLI!


## Command Line Call

Let's take a look at the semantics. How can a deploy builder be triggered?
All this is hidden behind the new command which – of course – also has a shorter alias:

```bash
ng deploy [options]
ng d [options]
```

Without any further arguments, the CLI will try to execute the deploy builder for the default project of the workspace.

Since you can also manage several Angular applications (projects) in one workspace, the CLI accepts an optional project name to deploy.
The name is used as specified in the `angular.json` configuration file.

```bash
ng deploy [PROJECT_NAME] [options]
```

So if you have created a project by calling `ng new your-angular-project`, the complete command could be:

```bash
ng deploy your-angular-project 
```

No other options are necessary here for a simple deployment.
However, all supplied command line options will automatically be passed to the deploy builder for the selected project.
Thus, the builder itself can be further configured.


## Existing providers

As for now, there is already a good adaptation for `ng deploy`.
The following providers are currently available:

* `@angular/fire` (Deployment to [Firebase hosting](https://firebase.google.com/docs/hosting))
* `@azure/ng-deploy` (Deployment to [Azure](https://azure.microsoft.com/en-us/))
* `@netlify-builder/deploy` (Deployment to [Netlify](https://www.netlify.com/))
* `@zeit/ng-deploy` (Deployment to [Now](https://zeit.co/now))
* `angular-cli-ghpages` (Deployment to [GitHub pages](https://pages.github.com/))

In the future you should be able to find more providers via the following search:  
https://www.npmjs.com/search?q=ng%20deploy

You can try out those providers by executing the following commands.

1. Install the latest version of the Angular CLI.

   ```sh
   npm install -g @angular/cli
   ```

2. Run `ng version` to make sure you have installed Angular CLI v8.3.0 or greater.

3. If your existing project doesn't run on Angular CLI v8.3.0 yet, update it using the command:

   ```sh
   ng update @angular/cli @angular/core
   ```

4. Add one of the listed providers to your project.

   ```sh
   ng add [provider]
   ```

5. Deploy your project via:

   ```sh
   ng deploy
   ```

One example:

![angular-cli-ghpages-deploy](angular-cli-ghpages-deploy.gif)


## Deploy to multiple targets

Right now, `ng deploy` only supports a single deploy target for a project.
If we want to deploy a project to more than one provider, it is necessary to rewrite the `angular.json` file and step back to the old syntax to execute the builder.

Let's assume you want to use `@angular/fire` and `angular-cli-ghpages` together for one project.
First, you need to install both packages via `ng add @angular/fire` and `ng add angular-cli-ghpages`.
The last one will override the configuration of the first one.

Now open the `angular.json` file and locate the section `projects > you-angular-project > architect > deploy`.
The trick is to create two sections with different names:

```json
{
  "projects": {
    "your-angular-project": {
      "architect": {
        "deploy-ghpages": {
          "builder": "angular-cli-ghpages:deploy",
          "options": {}
        },
        "deploy-firebase": {
          "builder": "@angular/fire:deploy",
          "options": {}
        }
      }
    }
  },
  "defaultProject": "your-angular-project"
}
```

You can now call the two builders via the classic approach again with `ng run`:

```bash
ng run your-angular-project:deploy-ghpages
ng run your-angular-project:deploy-firebase
```


## How to make your own deployment builder

As a cloud platform provider (or as a fan of that service), you should consider to implement a dedicated deployment builder, too.
The spectrum of possibilities is wide: Let's think about a deployment via FTP, to AWS, to Heroku, to Rackspace etc. – it's up to YOU to launch the next rocket! 🚀

To make the start a bit smoother, we started a sample project to help on that way.
The groundwork of this starter was provided by Minko Gechev's [ngx-gh project](https://github.com/mgechev/ngx-gh).

The starter project has the following purposes:

1. Promote the adoption of `ng deploy`
2. Clarify various questions and standardise the experience of the various builders

**Learn more at
https://github.com/angular-schule/ngx-deploy-starter**

You are free to customise this project according to your needs.
Please keep the spirit of Open Source alive and use the MIT or a compatible license.


## Summary

With the new deployment command of the Angular CLI, it will be even easier to manage the complete lifecycle of an Angular application with one single tool.
In addition to code generation, build, testing and much more, we can now also conveniently deploy to any target like Azure, Firebase or Netlify.
More providers should come soon. 🚀 If you developed another deployment builder: Please let us know and we're happy to add it to our list!

<hr>

## Thank you

Special thanks go to

- [Minko Gechev](https://twitter.com/mgechev) for guiding me through the new Angular CLI Architect API.
- [Ferdinand Malcher](https://twitter.com/fmalcher01) for revising this article and discussing things.

<small>**Header image:** [STS-126 Space Shuttle Endeavour Launch](https://publicdomainclip-art.blogspot.com/2008/11/sts-126-space-shuttle-endeavour-launch.html). This NASA still image is in the public domain.</small>