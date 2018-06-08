---
title: "Breaking: Swagger Codegen is now OpenAPI Generator"
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

As [William Cheng](https://github.com/wing328) (top contributor to Swagger Codegen)
recently informed us about a big change for the swagger community.

[![](tweet.png)](https://twitter.com/oas_generator/status/1002742730567512064)
 
William and other top contributors (40+) of [Swagger Codegen](https://swagger.io/tools/swagger-codegen/) have decided to fork
the project to maintain a community-driven version called ["OpenAPI Generator"](https://openapi-generator.tech),
which supports both OpenAPI spec v2 and v3.

For the reasons behind the fork, please refer to the official
[Q&A](https://github.com/OpenAPITools/openapi-generator/blob/master/docs/qna.md).


The new team already released our first stable version 3.0.0 of OpenAPI Generator:
https://github.com/OpenAPITools/openapi-generator/releases/tag/v3.0.0
Please give it a try and let them know if you have any [feedback](https://github.com/OpenAPITools/openapi-generator/issues).

Also, everybody is invited to join the public chatroom:
https://gitter.im/OpenAPITools/openapi-generator
   

## What we think about this

This is a great opportunity for the community.
As you see in the [Q&A](https://github.com/OpenAPITools/openapi-generator/blob/master/docs/qna.md)
there was a lot of frustration.
The fork will allow all contributors to fix those technical issues and concentrate on new ideas.

Right now everybody is busy making enhancements to opeanpi-generator.
For example some big work has started on the [gradle plugin](https://github.com/OpenAPITools/openapi-generator/pull/201).
Later a full switch of the build tool from maven to gradle could be possible, as it's building a lot faster than maven.

Of course, We are focused on the sagger-codegen for `angular-typescript`.
Another plan of the new team is to consolidate all TypeScript generators into one.
This would be very helpful, too. Those TypeScript generators share a lot in common and
it was hard keep them in sync for general enhancements and bug fixes.

## What you should do now

You should migrate from Swagger Codegen to OpenAPI Generator.
Please refer to the [migration guide](https://github.com/OpenAPITools/openapi-generator/blob/master/docs/migration-from-swagger-codegen.md) for this.
Right now it can be used as drop-in replacement.
You don't need to look back, William Cheng and all the other 40+ top contributors
won't work on swagger-codegen any more (no PR or reply to issues).
Since the big community-power is lost, we shouldn't expect any progress on swagger-codegen any more.
It's going to be more or less dead.
