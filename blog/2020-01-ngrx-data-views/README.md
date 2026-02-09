---
title: "NgRx Data Views: How to de-normalize entities for large enterprise applications"
author: Danilo Hoffmann
mail: dhhyi@aol.com
bio: Danilo works as a Software Developer for the e-commerce company Intershop in Thuringia, located in the green heart of Germany. Just as he started working there, the decision was made to launch the development for a new storefront based on Angular. Even though he never worked with Angular before (his background is mainly Java and some C++), it turned into one of the best love stories of the current decade. Nowadays, whenever he is not working on the project, he likes spending time improving his cooking skills or chilling at local pubs while reading about psychology. 
published: 2020-01-08
lastModified: 2020-01-08
keywords:
  - Angular
  - RxJS
  - Reactive Programming
  - Observables
  - Redux
  - NgRx
  - NgRx Entities
  - Memoization
language: en
header: data-views-header.jpg

---

**As soon as a NgRx project gets bigger, we have to ask ourselves how we should ideally arrange the entities in the store. In this article we are going to have a look at inter-connected data and its implications when trying to elevate store output to old fashioned business objects, ready to use in all components. By tackling normalized APIs we will show you some of the most common pitfalls you might encounter along the way.**

[[toc]]

<hr>

Dealing with data supplied by enterprise systems can be quite tedious.
Most of the time, data for a single entity has to be retrieved with multiple calls, because it is handled in a normalized way on the server.
However, this is not bad since normalization does a good job minimizing the space used up in any database by preventing duplication and with that also inconsistencies.
Have a look at the [Wikipedia Article on Database Normalization](https://en.wikipedia.org/wiki/Database_normalization) for more information.

If the API giving us access to the data is just a simple REST API exposing all entities via separate endpoints, we have to accumulate the necessary data in the front-end ourselves.

## Data Clustering in Enterprise Applications

Too abstract? Have a look at the [WordPress API Reference](https://developer.wordpress.org/rest-api/reference/) for an example.
Individual Posts can be retrieved quite typically via `/posts/<id>`.
However, the returned data just contains IDs for the author, tags and categories of the post.
To display a post properly with all the names and titles of depending entities, this additional data has to be retrieved with subsequent calls to other endpoints.

If you were to use WordPress as a system for content management, wouldn't you want to improve the display of a single post by pre-fetching all data related to tags and authors first with list calls, whenever the application is starting up?
This data could then be cached and referenced whenever needed.
If you have been around the block, you know that `@ngrx/entity` provides a perfect API for handling multiple entities in Angular applications.
If you haven't heard about it you should [read this blog post by the NgRx team](https://medium.com/ngrx/introducing-ngrx-entity-598176456e15) or consult the [official documentation](https://ngrx.io/guide/entity).
Believe me, it's the best thing that can happen to you when working with NgRx.
The data can be stored with normalized entity collections exactly the way it is retrieved via the API.

Maybe even this is too theoretical. Let's build our own example the other way around.

## Clustered data for Books

Consider the following example:

- We have entities for Authors:

```ts
export interface Author {
  id: string;
  firstName: string;
  lastName: string;
}
```

- We have entities for Tags:

```ts
export interface Tag {
  id: string;
  name: string;
}
```

- We have entities for Books referencing authors and tags only via ID:

```ts
export interface Book {
  id: string;
  title: string;
  authorIds: string[];
  description: string;
  tagIds: string[];
}
```

With this we can easily set up `@ngrx/store` with three individual states using `@ngrx/entity`, each of them keeping track of its specific objects.
Have a look at the [official documentation](https://ngrx.io/guide/entity) on how to do this.

## Using parameterized selectors

Now fast-forward to the display layer; when implementing the book detail page for your application, you will most likely have multiple selectors for all the data needed to display a single book.
When using [parameterized selectors](https://ngrx.io/guide/store/selectors#using-selectors-with-props), the book selector looks like this:

```ts
export const getBook = createSelector(
  getBookEntities,
  (books, bookId: string): Book => books[bookId]
)
```

You can see here that we rely on the `getBookEntities` selector as an input to this selector.
`getBookEntities` was created with entity selectors provided by `@ngrx/entity` and it will give us a dictionary object containing all books.
Our projector function then uses these entities and an additional parameter to look up the right book from the state.

The selector can be used in the component like this:

```ts
book$ = this.store.pipe(select(getBook, this.bookId));
```

(Note: The parameter `bookId` can come from a route parameter, be injected into the component or be a static reference.
For this example it doesn't really matter.
Have a look at the later following StackBlitz examples to see how we did it.)

As the `getBook` selector only provides access to IDs of authors and tags, we have to compose additional selectors for the display of these entities.
The one for the authors would look like this:

```ts
export const getAuthorsOfBook = createSelector(
  getBook,
  getAuthorEntities,
  (book, authors): Author[] =>
    book
      ? book.authorIds.map(authorId => authors[authorId])
      : []
)
```

Have a look at how we used the previous selector `getBook` in the new selector.
When using a parameterized selector in another selector, the new one also becomes a parameterized selector.
Furthermore if you have multiple parameters, they get merged in combination.
Read up on this awesome feature in the [official documentation](https://ngrx.io/guide/store/selectors#using-selectors-with-props).

The `getAuthorsOfBook` selector will be used in the component like this:

```ts
authors$ = this.store.pipe(select(getAuthorsOfBook, this.bookId));
```

Similarly a selector to retrieve the tags of the current book has to be composed.
In the end we will have the following properties in our component file:

```ts
book$ = this.store.pipe(select(getBook, this.bookId));
authors$ = this.store.pipe(select(getAuthorsOfBook, this.bookId));
tags$ = this.store.pipe(select(getTagsOfBook, this.bookId));
```

And we will use them in the template like this:

```html
<div *ngIf="book$ | async as book">
  <div>{{ book.title }}</div>
  <div><span *ngFor="let a of (authors$ | async)">{{ a.lastName }}</span></div>
  <div>{{ book.description }}</div>
  <div><span *ngFor="let t of (tags$ | async)">{{ t.name }}</span></div>
</div>
```

## The Problem

You can probably see what this will lead to in the long run: Code duplication.
Every component displaying books will have to select the normalized data from the store and accumulate it in the template.
Now imagine an API change.
With this amount of duplication it could mean that every component's typescript file as well as all Angular templates would have to be touched.
But how can we solve this?

Abstractly speaking: Currently we retrieve the data normalized via the API (1) and put it normalized into the state (2).
Then we use selectors (3) to retrieve the data normalized in each component and only then de-normalize it on each and every template (4) that displays it.

![Normalization points](normalization_points.svg)

It seems there are three points where we could intervene and do the de-normalization instead:

1. **Retrieve the data ready for display:**
  
   This can only be done by changing from a simple REST based API to an API that provides access to all data with one call.
   GraphQL would be an answer, but most often this API is not provided.

2. **Put the data de-normalized into the store:**
  
   For example, if we have an HTTP service that fetches the data normalized, we use this service to build complex objects from fetched data, e.g. nested books and authors.
   Then we put this nested data into the store after fetching it from the API.
   This obviously leads to data duplication and problems when updating the data since we have the same data at multiple places in our store.
   It's simply not what we want.

3. **Select the data ready-for-display from the store:**

   This way the data is still handled in a normalized way within the store and updates can be done in an efficient way as they mirror the API.
   This approach however needs crafting of special selectors that simplify selecting all accumulated data. – Let's build one of those!

## Using Data-Views for De-Normalization

Considering our current example, what we really want to select from the store is the following entity:

```ts
export interface BookView {
  title: string;
  description: string;
  authors: Author[];
  tags: Tag[];
}
```

It contains all data that is available on the book entity as well as de-normalized data for authors and tags which we can easily access and iterate over in the template.

To achieve this, we can build a new selector that implements this composition by re-using all previous mentioned selectors:

```ts
export const getBookView = createSelector(
  getBook,
  getAuthorsOfBook,
  getTagsOfBook,
  (book, authors, tags): BookView =>
    book && {
      title: book.title,
      description: book.description,
      authors,
      tags,
    }
)
```

And it will be used in the component and template like this:

```ts
book$ = this.store.pipe(select(getBookView, this.bookId));
```

```html
<div *ngIf="book$ | async as book">
  <div>{{ book.title }}</div>
  <div><span *ngFor="let a of book.authors">{{ a.lastName }}</span></div>
  <div>{{ book.description }}</div>
  <div><span *ngFor="let t of book.tags">{{ t.name }}</span></div>
</div>
```

This implementation provides a good balance of advantages and disadvantages.
We push the de-normalization further back so that it doesn't have to be handled in components and templates every time, That way code duplication is prevented.
Also, the state still effectively mirrors the API and this simplifies managing and updating entities.
This seems to be the perfect spot!
Normalization in the data layer also makes it quite easy to later compose selectors for specific tasks, like:

- search for books of a specific author
- find books with a specific tag

The composition of selectors can however affect memoization, because composed selectors fire every time their input changes.
If those inputs are not correctly memoized, the resulting selector will also not be properly memoized.
Since this is not the easiest topic to deal with, we will dig deeper into this in the next section.

You can see the current behavior in the [StackBlitz Example](https://stackblitz.com/github/dhhyi/ngrx-data-views/tree/basic-example?file=src%2Fapp%2Fstore%2Fbook-view%2Findex.ts).
Whenever a Tag, Author or Book is updated, all Books will be subject to a view update. Not really something we are looking for...

## The new problem with Memoization

> In computing, memoization [...] is an optimization technique used primarily to speed up computer programs by storing the results of expensive function calls and returning the cached result when the same inputs occur again.
[[Wikipedia]](https://en.wikipedia.org/wiki/Memoization)

When using NgRx Store with Angular, selectors provide data with Observable streams.
If data is changing in the background, the view also has to be updated.
As the state in NgRx is basically kept as one big structured object, every modification in reducers potentially triggers an update.
That's why memoization is used to prevent pushing an update onto the Observable streams, when effectively nothing has changed.
Keeping data in selectors properly memoized is the bread and butter of optimization.
Any selector firing unnecessarily initiates a needless and expensive view update.

The ideas of the implementation are rather simple:
Every selector keeps track of its inputs and outputs and decides when the current state is "good enough" to prevent firing.
It can however memoize only exactly one data stream.
So if you potentially use a selector like `getSelectedBook` on a detail page of your application, the memoization will track changes and only trigger view updates if the data of the current book changes.
Keep in mind that parameterized selectors, which we are currently promoting, also can only keep track of one value stream (one set of parameters) at a time.
If you are displaying many books on the current page in a listing, you must not reuse the same instance of that selector all over again.
This will nullify the effects of memoization.

Digging into this, let's have a look in the [official sources](https://github.com/ngrx/platform/blob/master/modules/store/src/selector.ts) of NgRx to find out how memoization works in the `createSelector()` function.
Every selector is created with `createSelectorFactory()` and the argument for memoization, by default using `defaultMemoize()`, which returns a `MemoizedProjection` for every selector doing the following:

1. It checks if the incoming arguments have changed. If they didn't change (and this is not the first call), the memoized result is returned.
2. If the arguments changed (or it is the first call), the projector function is applied.
3. If the result didn't change, the memoized result is returned. If not, the new result is memoized and returned.

This all might sound pretty straight forward, but pay attention to the fact, that the check for change is by default an object identity check and not a check for equality.
With this, a selector might fire more often than you think:

```ts
export function isEqualCheck(a: any, b: any): boolean {
  return a === b;
}
```

When updating a slice of state managed by `@ngrx/entity` the first check for input identity will always detect a change in selectors using that slice of state.
So the projector function is most often applied and only the result identity check can then prevent the selector from firing.

Let's check our example selectors and see how we are doing:

- `getBook`:
  
  The projector of this selector references a single value of the entities state of `@ngrx/entity`.
  Updates to the state are handled by entity adapters and the object referenced will only change if the book with the same ID selected is updated or deleted.
  Other book updates will modify a different reference, so we are safe here.
  The third check in `defaultMemoize()` will detect object identity for updates to other objects and thus the selector is properly memoized.

- `getAuthorsOfBook`:

  The fatal flaw lies within the projector of this selector:

  ```ts
  book ? book.authorIds.map(authorId => authors[authorId])` : []
  ```
  
  This is a function that will always create a new array upon every call.
  So the third check for output identity will most certainly always fail and the selector will fire every time its input changes.
  In this case every change to the authors state – be it related to the currently selected book or not – will trigger a change.

- the same applies to the `getTagsOfBook` selector: every change to the tags state will trigger view update.

- Our data view selector `getBookView` consumes all these changes and it also has a projector function that creates a new object every time it is called.
  The issue hereby multiplies as all dependant selectors trigger changes.

Another thing we didn't pay attention to is the fact that our parameterized selectors share a memoization cache if they are statically instantiated.
If we use them multiple times on the same page or chain them in other selectors they will eventually always fire because the same selector is invoked with different parameters all the time.
We would have to find a way to separate the memoization caches.

All in all, our resulting data view is not properly memoized and hence quite useless.

## Tackling Memoization

What we need to do to fix this is to assure that `getBookView` returns a correctly memoized result.
We can do this directly by adding memoization to `getBookView`, but better yet: we can just assure that the inputs of that selector only trigger a change, when they really change.
Our goal must be to fix `getAuthorsOfBook` and `getTagsOfBook`.
So let's have another look at `defaultMemoize()` first:

```ts
export function defaultMemoize(
  projectionFn: AnyFn,
  isArgumentsEqual = isEqualCheck,
  isResultEqual = isEqualCheck
): MemoizedProjection
```

What we can do is setting up the memoization ourselves.
We will now use `createSelectorFactory()` for creating the selector directly and reference `defaultMemoize()` applied with some overrides.
Additionally we do not create a static instance of the selector but instead supply a factory method for our parameterized selectors so each instance has its own memoization cache (recall, we will be using the selector multiple times, so we have to assure that each instance has its own cache):

```ts
import { createSelectorFactory, defaultMemoize } from '@ngrx/store';

export const getAuthorsOfBook = () =>
  createSelectorFactory(
    projector => defaultMemoize(projector, undefined, checkEqual)
  )(
    getBook,
    getAuthorEntities,
    (book, authors): Author[] =>
      book
        ? book.authorIds.map(authorId => authors[authorId])
        : []
)
```

`createSelectorFactory()` expects a `MemoizedProjection` as an argument for which we can re-use `defaultMemoize()`.
The first argument to it is the projector function of the selector which we just tunnel through.
The second argument is the function for input equality check which we are not interested in changing, so we supply `undefined` to fall back onto the default value (identity check).
The third and last argument is the function checking the equality of the projector result.

Here we want to butt in and provide a function that can detect equality instead of identity.
With the knowledge that only arrays are the input we could implement it ourselves:

```ts
export function checkEqual(a, b) {
  return a && b && a.length === b.length && a.every((val, idx) => val === b[idx]);
}
```

Nonetheless we can also fall back to a deep-equality check provided by one of those numerous libraries on the market or use one that is most certainly already available in our project's `node_modules`.

Correspondingly we do the same to the `getTagsOfBook` selector and in succession we also fixed the `getBookView` selector.
All its inputs are now properly memoized and consequently the projector function creating a new view is only applied when the inputs *really* have changed.

Our `getBookView` now uses the factories of parameterized selectors and looks like this:

```ts
export const getBookView = () =>
  createSelector(
    getBook,
    getAuthorsOfBook(),
    getTagsOfBook(),
    (book, authors, tags): BookView =>
      book && {
        title: book.title,
        description: book.description,
        authors,
        tags
      }
  );
```

And it now works as expected as you can see in the [StackBlitz Example](https://stackblitz.com/github/dhhyi/ngrx-data-views/tree/memoized-data-views?file=src%2Fapp%2Fstore%2Fbook-view%2Findex.ts).

> **Update 2021**   
>
> I found out later, that NgRx also supports overriding just the result memoization if you use [´resultMemoize()´](https://ngrx.io/api/store/resultMemoize) instead of `defaultMemoize()`.


## Enriched Data Views

All the time you might have been asking: Why are we even doing this?

Let's start with some theory again: NgRx basically forces you to keep your data objects in an [Anemic Domain Model](https://en.wikipedia.org/wiki/Anemic_domain_model) which means that only pure data is kept here.
All management logic (helpers, modifiers, validators, ...) has to be implemented in different places.
The reason for NgRx forcing this is that only serializable objects can be pushed into the store.
The new [runtime checks](https://ngrx.io/guide/store/configuration/runtime-checks) will remind you of these practices when you enable them.
It is not a bad approach per se as it further enforces immutability and this – as we all now – [changes everything](https://img.sauf.ca/pictures/2016-01-22/fd232c4b1ffdc0f0ef66400bf7fa64f8.pdf).

If you are however used to having business objects around (enterprise developer?!) and you want to have at least some kind of logic on your objects, data views can be a perfect place to implement it.
As those objects basically spawn off the selectors, just outside of the store, you can add methods to them or even derive or elevate simple properties to unserializable objects here.

Let's consider the following scenario: You want to keep the publishing date on the `Book` objects and you also want to have some accessor that tells you if the book is new, because it was published this year.
In the book model in the NgRx store you would have to keep the published date as a `number` because instances of the `Date` class are not serializable.
Concerning the "new" property, you don't want to put it into the store at all, as it is derived from the publishing date of the book and keeping it in the store would be redundant and therefore contradicting normalization.
Also, you cannot add it as a method to the model because functions are not serializable either.

With data views, you would just solve all this in the `BookView` interface and the corresponding selector:

```ts
export interface Book {
  ...
  published: number;
}

export interface BookView {
  ...
  published: Date;
  isNew(): boolean;
}

export const calculateNew = (book: Book) => {
  return new Date().getFullYear() === new Date(book.published).getFullYear();
};

export const getBookView = () =>
  createSelector(
    ...
    (book, authors, tags): BookView =>
      book && {
        ...
        published: new Date(book.published),
        isNew: () => calculateNew(book),
      }
  );
```

The result can be observed in the next [StackBlitz Example](https://stackblitz.com/github/dhhyi/ngrx-data-views/tree/data-views-as-business-objects?file=src%2Fapp%2Fstore%2Fbook-view%2Findex.ts&devtoolsheight=50).
As you can see in the console, solving it this way leads to many calls to the "new" method provided by the data view.
The reason lies within the Angular change detection.

## Memoized Data View Methods

When developing, you are composing all components living in an Angular application into a tree for rendering.
Likewise Angular keeps a tree of corresponding change detectors for optimizing view updates.
All bindings in templates referencing component properties are re-evaluated in every change detector cycle.
So when binding a template value to a call expression like `book.isNew()`, we have to make sure that this evaluation is not too expensive.

There are multiple ways of tackling this issue:

1. Cache the results of call expressions:

   In this easy example you could just calculate the result once and keep it as a simple property on the `BookView` instance instead.
   Everything in the store will stay properly normalized, it is just the data view supplying derived data for easy access:

   ```ts
   export interface BookView {
     ...
     isNew: boolean;
   }

   export const getBookView = () =>
     createSelector(
       ...
       (book, authors, tags): BookView =>
         book && {
           ...
           isNew: calculateNew(book),
         }
     );
   ```

   In other cases the `ngOnChanges()` in component classes could be used to cache expensive calculations to fields.
   And then those fields could be bound to in the templates.

2. Restricting Change Detection:

   By choosing `OnPush` [change detection](https://angular.io/api/core/ChangeDetectionStrategy), the standard change detection is limited to changes to `@Input` bindings in the component and event bindings in the template.
   This is a great way of optimizing Angular applications which use NgRx.

3. Make repeated calls inexpensive:

   If no other of those approaches works (like in our case) we have to follow a different path.
   We want to memoize the result ourselves and by that assure that the expensive calculation is lazily evaluated and cached for further references.

One way of implementing this is by using the `lodash` helper method [`once()`](https://lodash.com/docs/#once), wrapping it around the method in the `getBookView` selector:

```ts
import { once } from 'lodash-es';

export const getBookView = () =>
  createSelector(
    ...
    (book, authors, tags): BookView =>
      book && {
        ...
        isNew: once(() => calculateNew(book)),
      }
  );
```

Lodash imports should always be made by tree-shakeable libraries like [`lodash-es`](https://www.npmjs.com/package/lodash-es) or [`lodash.X`](https://www.npmjs.com/package/lodash.once) to reduce the bundle size.
For the memoization of methods with parameters the helper [`memoize()`](https://lodash.com/docs/#memoize) can be used in a similar fashion.

The final result can be studied in the last [StackBlitz Example](https://stackblitz.com/github/dhhyi/ngrx-data-views/tree/memoized-business-objects?file=src%2Fapp%2Fstore%2Fbook-view%2Findex.ts&devtoolsheight=50).

## Conclusion

We covered quite a lot here.
Identifying the original problem with normalized data in many enterprise scenarios, we proposed an approach of easily handling it in our front-ends with data views and NgRx.
We discussed de-normalization and where it actually should happen to make our projects maintainable over a long time.
We dug into the theory of memoization after identifying further challenges with the way we implemented de-normalization in NgRx selectors.
After that we topped it all off with additional optimization to elevate our data views to something else, something our colleagues developing the server-side might identify as business objects.

If you want to see all of this in a real project context, have a look at the [Intershop PWA](https://www.intershop.com/de/progressive-web-app) where these ideas were developed.
Intershop recently [open sourced](https://www.intershop.com/en/press-release/open-source-the-intershop-progressive-web-app-is-free-for-community-development) the product at [GitHub](https://github.com/intershop/intershop-pwa).
Feel free to have a look at the source code and demo applications.
A big thank you goes to [Ferdinand Malcher](https://twitter.com/fmalcher01) from Angular.Schule for guiding us and our project over the last two years, helping us build up our Angular knowledge and keeping us up to date with the latest changes of the Angular framework.

I hope you had fun reading this and that I found the right approach in displaying this rather complex topic.
Always keep an open mind and let me remind you: if it is Open Source you are using, you can typically look behind the curtains and peek into the dirty details.
It helps!
