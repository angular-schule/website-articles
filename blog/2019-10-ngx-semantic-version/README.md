---
title: 'Enhance your git and release workflow using `ngx-semantic-version`'
author: Danny Koppenhagen
mail: mail@d-koppenhagen.de
published: 2019-10-24
keywords:
  - Angular
  - Angular CLI
  - Angular Schematics
  - release
  - commit
  - commitlint
  - husky
  - commitizen
  - standard-version
language: en
thumbnail: space-shuttle.jpg
hidden: false
---

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

We all have seen pretty unclear git histories like this one:

```text
* 65f597a (HEAD -> master) adjust readme
* f874d16 forgot to bump up version
* 3fa9f1e release
* d09e4ee now it's fixed!
* 70c7a9b this should really fix the build
* 5f91dab let the build work (hopefully)
* 44c45b7 adds some file
* 7ac82d3 lot's of stuff
* 1e34db6 initial commit
```

When checking this history you know almost nothig: neither what features has been integrated nor if there was a bugfix or at least some other meaningful context.

Wouldn’t it be nice to have a cleaner git messages that will follow a de factor standard which is commonly used?

But more than this: having a clean and good formatted git history can help us releasing new software versions respecting semantic versioning and generating a changelog that includes all the changes we made and references to the commits.

No more struggle with with forgetting increasing the version in your `package.json`. No more manual changes in the `CHANGELOG.md` and forgetting to reference a git commit. Wouldn‘t it be nice to automate the release process and generate the changelog and the package version by just checking and building it from a clean git history?

And wouldn’t it be nice to add all this stuff with one very simple command to your Angular project?

Using [_ngx-semantic-version_](https://www.npmjs.com/package/ngx-semantic-version) will give you all that.

## What does it do?

_ngx-semantic-version_ will add and configure the following packages for you, that I‘ll explain you in a second:

- [commitlint](https://commitlint.js.org)
- [husky](https://www.npmjs.com/package/husky)
- [commitizen](https://www.npmjs.com/package/commitizen)
- [standard-version](https://www.npmjs.com/package/standard-version)

### commitlint

Commitlint will give you the ability to check your commit messages for a common pattern: the [_conventional-commit_](https://www.conventionalcommits.org) pattern that will basically follow this syntax:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

- `type` can be one of the following:
  - `build`
  - `ci`
  - `chore`-
  - `docs`
  - `feat`-
  - `fix`
  - `perf`
  - `refactor`
  - `revert`
  - `style`
  - `test`
- `scope` is optional and can be used to reference to a specific part of your application, e.g. `fix(dashboard): foo bar`
- The `description` is mandatatory and it describes the commit in a very short form
- If necessary a `body` and a `footer` with further information can be added which may contain:
  - The keyword `BREAKING CHANGES` followed by a description of the breaking changes
  - A reference to an Github issue (or an other referencs, e.g. JIRA ticket number, etc.)

Following this pattern allows us later to extract from the git history what version part will be increased and to generated the changelog and bundle feature, fixes and so on.

```bash
~/foo/bar ᐅ echo 'baz' | commitlint
⧗   input: baz
✖   Please add rules to your `commitlint.config.js`
    - Getting started guide: https://git.io/fhHij
    - Example config: https://git.io/fhHip [empty-rules]

✖   found 1 problems, 0 warnings
ⓘ   Get help: https://github.com/conventional-changelog/commitlint/#what-is-commitlint
```

### husky

Husky allows us to hook into the git lifecycle using nodejs. It is used by _ngx-semantic-version_ to check a commit message right before storing it by using _commitlint_.

### commitizen

As commitizen introduced a lot's of restrichtions for our commit messages, defining the message text can be be quite hard when you are not already used to the _conventional-changelog_ style.
Commitizen will help you to build a commit message always in the appropriate format by letting you configure the final message via an interactive cli.

![commitizen cli](./commitizen.png)

If you are using vscode ad your IDE, you can also use the plugin [Visual Studio Code Commitizen Support](https://marketplace.visualstudio.com/items?itemName=KnisterPeter.vscode-commitizen) which will let you build the commit message directly via vscode:

![commitizen vscode plugin](./commitizen-vscode.png)

### standard-version

Standard-version is the cherry on the cake and takes advantage from well formed git history.
It will extract the commit message information like `fix`, `feature` and `BREAKING CHANGES` and use this for creating a well formated `CHANGELOG.md` as well as to determine the new version for our project respecting the [rules of semantic versioning](https://semver.org/).

Whenever you will release a version, you can use _standard-version_ and it will keep your versioning clean and your `CHANGELOG.md` up-to-date.
Furthermore it will link all commits in your `CHANGELOG.md` and references to the closes issues from your trouble ticket system, so that it's easy to understand what has been done in the release.

## How to use

Now we know what all the tools are doing but we havent implemented them yet. At this time _ngx-semantic-version_ come into the play. It is an Angular schematic that will add and configure all the tools for you.

You simply need to run the following command on your terminal:

```bash
ng add ngx-semantic-version
```

It will adjust your `package.json` file and adds the `commitlint.config.js` which includes the basic ruleset for conventional commit. You can [adjust the configuration](https://commitlint.js.org/#/reference-rules) to satisfy your needs even more.

Try out to make some changes at your project. Commitlint will now check the commit message and tell you if it is valid or not. It prevents you from adding bad commit messages to your project.
_Commitizen_ will support you by building the message in the right format and it even explicitly asks you for issue references and Breaking Changes, it's really helpful.

Lust but not least, you can use _standard-version_ not to release your project.
Therefore you just need to run the following command:

```bash
npm run release
```

you should also consider using one of the following commands instead:

```
npm run release -- --first-release    # create the initial release and create the `CHANGELOG.md`
npm run release -- --prerelease       # create a pre-release instead of a regular one
```

Check out also the [official documentation](https://www.npmjs.com/package/standard-version#release-as-a-pre-release) for further information.

Happy code, commit and release!

<hr>

## Thank you

Special thanks go to

- [Ferdinand Malcher](https://twitter.com/fmalcher01) for revising this article and discussing things.
- [Johannes Hoppe](https://twitter.com/fmalcher01) for revising this article and discussing things.
