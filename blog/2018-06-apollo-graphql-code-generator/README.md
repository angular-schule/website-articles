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
[We generated a REST api client for Angular](/blog/2018-04-swagger-codegen) with the help of swagger-codegen / openapi-generator.
But there are drawbacks to REST - and GraphQL can address some of them.

Depending on the use-case, I favour a different approach to read and change in my Angular application. Let's see what GraphQL is all about and then we should look at my preferred toolset.

## Hello GraphQL

![Logo graphql](logo-graphql.svg?sanitize=true)

One fundamental problem of a classical REST api is the amount of received data.
Sometimes we are fetching too much data, so there is data in the response we don't use.
Or we have the opposite, we do not have enough data with one call,
which forces us to call a second resource for more.
This is called "over-fetching" and "under-fetching".
In a perfect world, we would have exactly the right resources to serve the right data to our apps.
In a complex scenario this will lead to a huge and unmaintainable API,
because we would have to have to offer our data in various shapes via different endpoints.

See this RESTful resource, which is explorable [via swagger-ui](https://api.angular.schule/swagger-ui/):

* __https://api.angular.schule/books__

All right, a lot of books.
Let's assume we are not interested in the thumbnail nor the subtitle.
But we want to have the authors — but only their names!
That's tricky! How to adjust this?
Actually, we haven't implemented such a feature in our RESTful API. There is no way 

Soon we would define which objects and which fields of those objects we want to receive.
Books and authors in our case.
And this is basically a GraphQL query in nutshell.
Take a look at the following api, which is supposed to return some books:

* __https://api.angular.schule/graphql/__

What you see is [GraphiQL](https://github.com/graphql/graphiql).
GraphiQL is an in-browser tool for exploring GraphQL queries and mutations.
The following query will read the same books:

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
The server will return a result like this:

```json
{
  "data": {
    "books": [
      {
        "title": "Angular",
        "isbn": "9783864903571",
        "authors": [
          {
            "name": "Johannes Hoppe"
          },
          {
            "name": "Ferdinand Malcher"
          },
          {
            "name": "Danny Koppenhagen"
          }
        ]
      }
    ]
  }
}
```

For your convenience, just click <a href="https://api.angular.schule/graphql/?query={%0A%20%20books%20{%0A%20%20%20%20title%0A%20%20%20%20isbn%0A%20%20%20%20authors%20{%0A%20%20%20%20%20%20name%0A%20%20%20%20}%0A%20%20}%0A}">this link</a> to place your first GraphQL query.
Go ahead!
Play with the API and request also a `description` and a `rating`.
That's neat, isn't it?

As you see, the query has exactly the same shape as the result.
This is essential to GraphQL, because you always get back what you expect.
But how do we deterministically know that the authors return as an array?
That is another crucial aspect of GraphQL: schemas.
Schemas are determined on the server.
He defines the objects that can be queried, as well as their exact types.
Of course, we can query all aspects of the schema, too:

```json
{
  __type(name: "Book") {
    kind
    name
    fields {
      name
      type {
        kind
        name
        description  # TODO: we should add descriptions! ;-)
      }
    }
  }
}
```
<a href="https://api.angular.schule/graphql/?query=%7B%0A%20%20__type(name%3A%20%22Book%22)%20%7B%0A%20%20%20%20kind%0A%20%20%20%20name%0A%20%20%20%20fields%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%20%20type%20%7B%0A%20%20%20%20%20%20%20%20kind%0A%20%20%20%20%20%20%20%20name%0A%20%20%20%20%20%20%20%20description%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A">click here</a>


## Querying data with Apollo Angular

![Logo Apollo](logo-apollo.svg?sanitize=true)

This is all we need to know to start with GraphQL.
GraphQL became very popular in recent times and there are a lot of implementations for various programming languages and frameworks.
In Angular world, the [Apollo](https://www.apollographql.com/) library is quite popular. 

The [documentation](https://www.apollographql.com/docs/angular/) is well done, so we can keep the installation instructions short.
To get started with Apollo Angular, we first want to install the required packages from npm (multiple installs, for better readability).

```bash
npm install apollo-angular
npm install apollo-angular-link-http
npm install apollo-client
npm install apollo-cache-inmemory
npm install graphql-tag
npm install graphql
```

* `apollo-angular` is the Angular integration for the Apollo Client.
* `apollo-angular-link-http` provides a network layer (Apollo Link).
  It can be replaced with other link modules (e.g. GraphQL over WebSocket, read more in [this article](https://www.apollographql.com/docs/angular/basics/network-layer.html)).
  Here we configure the application-wide HTTP thingies like the URL to the endpoint. 
* `apollo-client` is the underlying GraphQL client.
  We are going to use the integration for Angular but there are also different integration layers for React, Vue.js and more.
* `apollo-cache-inmemory` is the recommended cache implementation for Apollo Client.
* `graphql-tag` contains a parser to convert human-written GraphQL query strings into the standard GraphQL AST. We will use it for the `gql` tags later on.
* `graphql` is the JavaScript reference implementation for GraphQL. `graphql-tag` requires this as a peer dependency.

Quite a lot packages, but the usage itself is straightforward.
It's time to add three Modules to our application.
We need `HttpClientModule` (as always), `HttpLinkModule` (our API speaks simple HTTP) and the `ApolloModule` itself.
The necessary configuration can be done at the constructor of the `AppModule`, too.

```typescript
import { ApolloModule, Apollo } from 'apollo-angular';
import { HttpLinkModule, HttpLink } from 'apollo-angular-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';

@NgModule({
  imports: [
    HttpClientModule,
    HttpLinkModule,
    ApolloModule
  ],
})
class AppModule {
  constructor(apollo: Apollo, httpLink: HttpLink) {
    apollo.create({
      link: httpLink.create({uri: 'https://api.angular.schule/graphql'}),
      cache: new InMemoryCache()
    });
  }
}
```

## Generating types with GraphQL code generator

![Logo GraphQL code generator](logo-graphql-code-generator.svg?sanitize=true)

We are not going to use the [__Apollo__ GraphQL code generator](https://github.com/apollographql/apollo-codegen) here.
On the first look it seems to be a perfect fit, since it is hosted under the same umbrella as Apollo Angular.
But after some evaluation I came to the conclusion that another generator ([GraphQL Code Generator](https://github.com/dotansimha/graphql-code-generator)) is more suitable.
I had two reasons for this decision:

1. the generated interfaces are better organised (grouped via namespaces)
2. there is some flexible support for custom templates (with Handlebars) - This is a killer feature compared to "Apollo GraphQL code generator".  you can simply create you template and then compile it with your GraphQL schema and GraphQL operations and get a more customized result.

.. TODO ..

## Related Articles

* 2018-04-12 - [Generate Angular API clients with Swagger](/blog/2018-04-swagger-codegen)
* 2018-06-08 - [Swagger Codegen is now OpenAPI Generator](/blog/2018-06-swagger-codegen-is-now-openapi-generator)