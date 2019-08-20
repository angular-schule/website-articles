---
title: "All you need to know about `ng deploy`"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2019-08-23
keywords:
  - Angular
  - Angular CLI
  - deployment
  - ng deploy
  - ng-deploy
language: en
thumbnail: space-shuttle.jpg
hidden: true
---

With version 8.3 of the Angular CLI a new command has been released which has the potential to be a game changer.

<hr>

Table of contents:

TODO

# Command Line Call

Let's take we look at the semantics. How is a deploy builder called?

Without any further arguments, the CLI will try to execute the deploy builder for the default project:

```bash
ng d
```

Which is the same as:

```bash
ng deploy
```

As you might know, you can manage several Angular Apps (projects) in one workspace. The CLI accepts an optional project name, as specified in the `angular.json` configuration file.

```bash
ng run [PROJECT_NAME]:deploy
```

So if you have created a project by calling `ng new your-angular-project`, the complete command would have to be:

```bash
ng run your-angular-project:deploy
```

Surprisingly, there are no other standardized options – but we will come back to that in a moment. 


<hr>

_Picture: STS-126 Space Shuttle Endeavour Launch. This NASA still image is in the public domain._
<!-- https://publicdomainclip-art.blogspot.com/2008/11/sts-126-space-shuttle-endeavour-launch.html -->