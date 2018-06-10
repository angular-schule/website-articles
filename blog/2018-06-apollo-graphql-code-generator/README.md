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
[We generated a REST api client for Angular](/blog/2018-04-swagger-codegen) with the help of swagger-codegen / openapi-generator. But there are drawbacks to REST - and GraphQL can address some of them.

Depending of the use-case, I favour a different approach to read and change in my Angular application. Let's see what GraphQL is all about and then we should look at my preferred toolset.

## Hello GraphQL

One fundamental problem of a classical REST api is the amount of received data. Sometimes we are fetching too much data, so there is data in the response we don't use. Or we have the opposite, we do not have enough data with one call, which forces us to call a second resource for more. This is called "over-fetching" and "under-fetching". In a perfect world, we would have exactly the right resources to serve the right data to our apps. In a complex scenario this will lead to a huge and unmaintainable API, because we would have to have to offer our data in various shapes via different endpoints.

See this RESTful resource, which is explorable [via swagger-ui](https://api.angular.schule/swagger-ui/):

* __https://api.angular.schule/books__

All right, a lot of books. Let's assume we are not interested in the thumbnail nor the subtitle. But we want to have the authors - but only their names! That's tricky! How to adjust this?

Soon we would define which objects and which fields of those objects we want to receive. Books and authors in our case. And this is basically a graphql query in nutshell. Take a look at the following api, which is supposed to return some books:

* __https://api.angular.schule/graphql/__

What you see is [GraphiQL](https://github.com/graphql/graphiql). GraphiQL is an in-browser tool for exploring GraphQL queries and mutations. The following query will read the same books:

```json
{
  books {
    title
    isbn
    authors {
      name
    }
  }
}
```


Just play with the API and request also a `description` and a `rating`. That's neat, isn't it?

 

## Related Articles

* 2018-04-12 - [Generate Angular API clients with Swagger](/blog/2018-04-swagger-codegen)
* 2018-06-08 - [Swagger Codegen is now OpenAPI Generator](/blog/2018-06-swagger-codegen-is-now-openapi-generator)