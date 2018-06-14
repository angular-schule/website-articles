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
thumbnail: graphql-header.png
---

![graphql-header.png](graphql-header.png)

**In this article, I will give a short introduction to GraphQL. We will then take a look at Apollo Angular and the GraphQL code generator. We will combine the flexibility of Graphql with the safety of strongly typed TypeScript code that is consistent between server and client.**

<hr>

Last time we talked about my preferred way of doing REST:  
via the OpenAPI description format (known as Swagger).
[We generated a REST api client for Angular](/blog/2018-04-swagger-codegen) with the help of swagger-codegen / openapi-generator.
But there are drawbacks to REST - and GraphQL can address some of them.

Depending on the use-case, I favour a different approach to read and change in my Angular application. Let's see what GraphQL is all about and then we should look at my preferred toolset.

## Hello GraphQL

<!--![Logo graphql](logo-graphql.svg?sanitize=true)-->
<img src="https://angular-schule.github.io/website-articles/blog/2018-06-apollo-graphql-code-generator/logo-graphql.svg?sanitize=true" width="75%">

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

__Heureka!__

For your convenience, just click [this link](http://bit.ly/2t4dzTw) to place your first GraphQL query.
Go ahead!
Play with the API and request also a `description` and a `rating`.
That's neat, isn't it?

Up until now, we have been using a shorthand syntax where we omit both the query keyword and the query name.
We shouldn't do this in a real-live app.
On the one hand it is generally a bad practice make the code ambiguous.
On the other hand we will also get in concrete tooling-trouble later on, because without a name it is hard to generate a type for that anonymous query (see [#372](https://github.com/dotansimha/graphql-code-generator/issues/372)).

Let's fix the snipped to the full syntax version:

```
query BooksAndAuthors {
  books {
    title
    isbn
    authors {
      name
    },
    description,
    rating
  }
}
```

As you have seen, the query has exactly the same shape as the result.
This is essential to GraphQL, because you always get back what you expect.
But how do we deterministically know that the authors return as an array?
That is another crucial aspect of GraphQL: __schemas__.
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
[click here](http://bit.ly/2JGDmZl)

This is all we need to know to start with GraphQL.
You can learn more about the query language in [the official documentation](https://graphql.org/learn/queries/). 

## Querying data with Apollo Angular

<!--![Logo Apollo](logo-apollo.svg?sanitize=true)-->
<img src="https://angular-schule.github.io/website-articles/blog/2018-06-apollo-graphql-code-generator/logo-apollo.svg?sanitize=true" width="75%">

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

The simplest way of preparing a query in TypeScript/JavaScript is to define it in a special notation.
We are using the `gql` tag that is provided by the `graphql-tag` library.


```typescript
import gql from 'graphql-tag';

booksQuery = gql`
  query BookList {
    books {
      isbn
      title
      description,
      rating
      thumbnails {
        url
      }
    }
  }
`;
```

For a quick start I recommend `Apollo.query`.
It returns an `Observable` that emits a result, just once.
Knowing this, we do not have to unsubscribe — which makes the code a bit shorter compared to `Apollo.watchQuery `.
For advanced scenarios we can leverage `Apollo.watchQuery`, this method returns an object of type `QueryRef` that contains many useful methods to manipulate the watched query.
Just to make you curious:

* `querRef.startPolling`
* `querRef.stopPolling`
* `querRef.refetch`

You get your Observable via `querRef.valueChanges`. But keep in mind that you have to properly unsubscribe here.

This is how we use `Apollo.query`:

```typescript
import { Apollo } from 'apollo-angular';


export class MyComponent implements OnInit  {

  books: any[] = [];  // <-- any❗️

  constructor(private apollo: Apollo) { }

  ngOnInit() {
    this.store
      .getAllViaGraphQL()
      .subscribe(books => this.books = books);
  }

  getAllViaGraphQL() {

    return this.apollo.query<any>({  // <-- any❗️
      query: booksQuery,
    })
    .pipe(
      map(({ data }) => data.books)
    );
  }
}
```

Works like a charm, but you see two times the usage of `any`.
This is bad❗️
Obviously there are no TypeScript types out of the box.
We would have to define them on our own.
This is manual work where humans can make errors and where we can get out of sync with the model on the server very easily!
So we should generate the types by "robots" instead with the help of the already known GraphQL schema.
Of course, other people have already done the hard work for us. 


## Generating types with GraphQL code generator

<!--![Logo GraphQL code generator](logo-graphql-code-generator.svg?sanitize=true)-->
<img src="https://angular-schule.github.io/website-articles/blog/2018-06-apollo-graphql-code-generator/logo-graphql-code-generator.svg?sanitize=true" width="50%">

All information we need is already in the GraphQL schema. We are not going to use the [__Apollo__ GraphQL code generator](https://github.com/apollographql/apollo-codegen) here.
On a first glance it seems to be a perfect fit, since it is hosted under the same umbrella as Apollo Angular.
But after some evaluation I came to the conclusion that another code-generator ([__GraphQL Code Generator__](https://github.com/dotansimha/graphql-code-generator)) is more suitable.
I had two reasons for this decision:

1. The generated code (TypeScript interfaces) is better readable and organised (grouped via namespaces).
1. There is some flexible support for custom templates (with Handlebars) - This is a killer feature compared to "Apollo GraphQL code generator". You can simply create you template and then compile it with your GraphQL schema and GraphQL operations and get a more customised result.

If are used to `swagger-codegen`, then you will experience a lot of similarities.
And this is clearly the case.
The author wrote the code generator based on his experience with other robust code generators.
I'm going to repeat myself, but the most important point behind a solid code generator is the ability to change and extend the results.
I was really wondering that his wasn't implemented for `apollo-codegen`.
Read more about the story behind [at medium](https://medium.com/@dotansimha/graphql-code-generator-a34e3785e6fb).

First we have to install the generator inside our existing Angular project:

```bash
npm install --save-dev graphql-code-generator graphql-codegen-typescript-template
npm install graphql
```

In our case we can skip the dependency `graphql`, we already installed it together with Apollo.
I added the installation of `graphql ` in a separate line of code, since it is a "devDependency" like `graphql-code-generator`.
But it also has to be a dependency for `graphql-tag` (read above).
Anyway, both options will work. 

No we have a new command line tool with the name `gql-gen`.
We can either start it with `npx gql-gen [options] [documents ...]`...

```bash
# command line usage
npx gql-gen --schema https://api.angular.schule/graphql --template graphql-codegen-typescript-template --out ./src/app/graphql-types.ts "./src/**/*.ts"
```

... or execute it inside a run-script in the `package.json`:


```json
// via package.json
{
  "scripts": {
    "start": "ng serve",
    "graphql-codegen": "gql-gen --schema https://api.angular.schule/graphql --template graphql-codegen-typescript-template --out ./src/app/graphql-types.ts \"./src/**/*.ts\""
  }
}
```

For reusability I always prefer the last option.
Please pay an extra amount of attention to the double quotes for the file selector (`"./src/**/*.ts"`).
If you forget them, you won't notice an error but the codegen won't find your files.
It happens because the pattern `**` (for recursive lookup) gets resolved before [glob](https://www.npmjs.com/package/glob) receives it. (see more [here](https://github.com/dotansimha/graphql-code-generator/issues/180#issuecomment-397086490))

And this is the generated `Book` interface:

```typescript
export interface Book {
  isbn: string;
  title?: string | null;
  subtitle?: string | null;
  rating?: number | null;
  description?: string | null;
  thumbnails?: (Thumbnail | null)[] | null;
  authors?: (Author | null)[] | null;
}
```

__...but wait!__  

This is a full book, as described by the schema!
Looking at the query, we are only interested in some of the properties and this interface is offering to much.
Properties like `subtitle` are never delivered from the server and will evaluate to `undefined`.

If we look at the generated file `graphql-types.ts` we will see that there are not only the types from the schema, but also types for the query `BookList`.
This is what we really want to use:

```typescripts
export namespace BookList {
  export type Variables = {};

  export type Query = {
    __typename?: "Query";
    books?: (Books | null)[] | null;
  };

  export type Books = {
    __typename?: "Book";
    isbn: string;
    title?: string | null;
    description?: string | null;
    rating?: number | null;
    thumbnails?: (Thumbnails | null)[] | null;
  };

  export type Thumbnails = {
    __typename?: "Thumbnail";
    url?: string | null;
  };
}
```

The namespace `BookList` contains everything to rewrite the Apollo query with strong types.

```typescript
import { BookList } from '../graphql-types';

getAllViaGraphQL(): Observable<BookList.Books[]> { 

  return this.apollo.query<BookList.Query>({
    query: booksQuery,
  })
  .pipe(
    map(({ data }) => data.books)
  );
}
```

The return type `Observable<BookList.Books[]>` is not necessary here, but I wanted to show that the types perfectly fit.
This is nearly perfect, but I do not like the plural-S which is derived from the name of the query.
For this purpose we can use an [alias](https://graphql.org/learn/queries/#aliases).
The GraphQL query should look now like this: 

```typescript
const booksQuery = gql`
  query BookList {
    book: books {
      isbn
      title
      description,
      rating
      thumbnails {
        url
      }
    }
  }
`;
```

We finally have the perfect output for our Apollo client!

```typescript
getAllViaGraphQL(): Observable<BookList.Book[]> {

  return this.apollo.query<BookList.Query>({
    query: booksQuery,
  })
  .pipe(
    map(({ data }) => data.book)
  );
}
```

## Conclusion

:tada: Congratulations!
We have mastered another journey for automatically generated api code.
We first learned the basics of GraphQL, got an introduction the Apollo GraphQL and we finally used GraphQL code generator to plump everything together. 
Your project will benefit from less errors and more productivity.
Let robots generate types for you and concentrate on more exciting work.

But the possibilities do not end here.
__Next time we could generate also the service layer via the codegen.
Just retweet this article if you are interested in this topic!__

The following Angular demo app showcases the shown setup:

* [demo-api-codegen](https://github.com/angular-schule/demo-api-codegen)

Have fun doing awesome Angular stuff! :smile:

## Related Articles

* 2018-04-12 - [Generate Angular API clients with Swagger](/blog/2018-04-swagger-codegen)
* 2018-06-08 - [Swagger Codegen is now OpenAPI Generator](/blog/2018-06-swagger-codegen-is-now-openapi-generator)
