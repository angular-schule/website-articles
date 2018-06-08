---
title: "Swagger Codegen is now OpenAPI Generator"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2018-06-21
keywords:
  - Angular
  - NgModule
  - Modules
language: en
thumbnail: logo_header.png
---

**
[William Cheng](https://github.com/wing328), top contributor to Swagger Codegen,
recently informed us about a big change for the swagger community.
William and other top contributors (40+) of [Swagger Codegen](https://swagger.io/tools/swagger-codegen/) have decided to fork
the project to maintain a community-driven version called ["OpenAPI Generator"](https://openapi-generator.tech),
which supports both OpenAPI spec v2 and v3.**

<hr>

<a href="https://angular-schule.github.io/website-articles/blog/2018-06-swagger-codegen-is-now-openapi-generator/tweet.png"><img src="https://angular-schule.github.io/website-articles/blog/2018-06-swagger-codegen-is-now-openapi-generator/tweet.png" width="50%"></a>


For the reasons behind the fork, please refer to the official
[Q&A](https://github.com/OpenAPITools/openapi-generator/blob/master/docs/qna.md).

Here are the most important points:

1. The founding members came to the conclusion that Swagger Codegen 3.0.0 beta contains too many breaking changes while they strongly believe 3.0.0 release should only focus on one thing: OpenAPI specification 3.0 support.
1. Swagger Codegen 3.0.0 beta was evaluated as unstable. Changes made directly to 3.0.0 branch without reviews or tests, were breaking the builds from time to time.
1. Reviews of code changes in the 3.0.0 branch highlighted a lot of code block removal without any reason. This might produce regressions for edge cases discovered previously.
1. Most of the test cases in the generators have been commented out as part of the migration to support OpenAPI 3.0. Test cases are the most valuable assets of the project and should be maintained to ensure a good quality.
1. According to SmartBear, [Swagger Codegen 2.x and 3.x should be supported in parallel for a while](https://github.com/swagger-api/swagger-codegen/issues/7754#issuecomment-375039048) without the possibility to work with git branches to merge the fixes from one branch to the next. Having to implement everything twice is not a good idea and the best use of the Swagger Codegen community resources.
1. Having a community-driven version can bring the project to the next level.

There was several conversations with SmartBear via emails, gitter, Skype call and GitHub issues.
But there was no consensus on the next steps and on the direction for Swagger Codegen 3.0.0.

## About the new fork

Swagger Codegen is driven by SmartBear while OpenAPI Generator is driven by the community.
More than 40 top contributors and template creators of Swagger Codegen have joined OpenAPI Generator as the founding team members.

The new team already released the [first stable version 3.0.0 of OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator/releases/tag/v3.0.0).  
Please give it a try and let them know if you have any [feedback](https://github.com/OpenAPITools/openapi-generator/issues).

Also, everybody is invited to join the public chatroom:
https://gitter.im/OpenAPITools/openapi-generator
   

## What we think about this

This is a great opportunity for the community in general.
As you see in the [Q&A](https://github.com/OpenAPITools/openapi-generator/blob/master/docs/qna.md)
there was a lot of frustration.
The fork will allow all contributors to fix those technical issues and concentrate on new ideas.

Right now everybody is busy making enhancements to opeanpi-generator.
For example some big work has started on the [gradle plugin](https://github.com/OpenAPITools/openapi-generator/pull/201).
Later a full switch of the build tool from maven to gradle could be possible, as it's building a lot faster than maven.

Of course, we are focused on the sagger-codegen for `angular-typescript`.
Another plan of the new team is to consolidate all TypeScript generators into one.
This would be very helpful, too. Those TypeScript generators share a lot in common and
it was hard keep them in sync for general enhancements and bug fixes.
We are waiting in eager! :smile:

## What you should do now

If you are new to code generation in general, you might want to read our article "[Generate Angular API clients with Swagger
](https://angular.schule/blog/2018-04-swagger-codegen)" and start with the new OpenAPI Generator. 

If you already use swagger-codegen then you should migrate from Swagger Codegen to OpenAPI Generator sooner than later.
Please refer to the [migration guide](https://github.com/OpenAPITools/openapi-generator/blob/master/docs/migration-from-swagger-codegen.md) for this.
Right now it can be used as drop-in replacement.
You don't need to look back, William Cheng and all the other 40+ top contributors
won't work on swagger-codegen any more (no PR or reply to issues).
Since the big community-power is lost, we shouldn't expect any progress on swagger-codegen any more.
