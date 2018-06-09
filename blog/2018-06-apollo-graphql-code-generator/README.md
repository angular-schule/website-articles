---
title: "Generate Angular API clients with Apollo and GraphQL code generator"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2018-06-10
keywords:
  - Graphql
  - Codegen
  - Code Generator
  - Apollo
  - Angular
  - TypeScript
language: en
thumbnail: bg-graph.svg
hidden: true
---

**In this article, we will take a look at Apollo Angular and the GraphQL code generator. We will combine the flexibility of Graphql with the safety of strongly typed TypeScript code that is consistent between server and client.**

<hr>

Last time we talked about my preferred way of doing REST:  
via the OpenAPI description format (known as Swagger).
[We generated an REST api client for Angular](/blog/2018-04-swagger-codegen) with the help of swagger-codegen / openapi-generator. But there are drawbacks to REST - and GraphQL can address some of them.

Depending of the use-case, I favour a different approach to read and change in my Angular application. Let's see what GraphQL is all about and then we should look at my preferred toolset.

# 

## Related Articles

* 2018-04-12 - [Generate Angular API clients with Swagger](/blog/2018-04-swagger-codegen)
* 2018-06-08 - [Swagger Codegen is now OpenAPI Generator](/blog/2018-06-swagger-codegen-is-now-openapi-generator)