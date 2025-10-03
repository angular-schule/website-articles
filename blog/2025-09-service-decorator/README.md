---
title: 'My experimental @Service() decorator for Angular'
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2025-09-30
lastModified: 2025-09-30
keywords:
  - Angular
  - Angular 20
  - Component Suffix
  - Decorator
  - inject
  - Ivy
  - ɵɵdefineInjectable
  - ɵɵinject
language: en
header: service.jpg
---

With Angular 20, the service suffix has been removed from the new style guide.
While this leads to shorter filenames, it also makes the role of classes less obvious.
This article presents a **thought experiment** that introduces a custom `@Service` decorator to solve this issue elegantly.


## Angular 20: The service suffix is gone

The new major version of Angular brings some significant changes.
The new [Angular coding style guide](https://angular.dev/style-guide) for v20 has been greatly revised and condensed.
It is *no longer* recommended to suffix components, services, and directives.

The command `ng generate service book-store` no longer creates a class named `BookStoreService`, but instead just `BookStore`.
Accordingly, `book-store.service.ts` is now simply `book-store.ts`.

That's generally a great idea.
We get shorter filenames and more emphasis on deliberate naming.
But there is one small downside:
We no longer immediately recognize that a class is intended to be used as a service.

**until Angular 19:**

```ts
// book-store.service.ts

@Injectable({
  providedIn: 'root'
})
export class BookStoreService { }
````

**starting from Angular 20:**

```ts
// book-store.ts

@Injectable({
  providedIn: 'root'
})
export class BookStore { }
```

Anyone who has used Angular for a while knows that the `@Injectable` decorator almost always indicates a service.
Nevertheless, in my opinion, the intended use of this decorator could be communicated even more clearly.

In the well-known Java framework Spring Boot, `@Service` is a common annotation that indicates that a class contains service logic:

```java
import org.springframework.stereotype.Service;

@Service
public class BookStoreService {
    // ...
}
```

Additionally, there are other annotations like `@Repository`.
In Spring, `@Repository` has exactly the same functionality as `@Service`.
The only difference is that `@Repository` also signals that this class implements the repository pattern.
Personally, I find it very elegant when the purpose of a class is as clearly identifiable as possible.


## The motivation – My `@Service()` decorator for Angular

So what do we do if we want to drop the familiar `Service` suffix but still make it obvious that a class is a service?

My idea: Why don't we just introduce a custom decorator named `@Service()`?
Then the decorator itself would make it clear that the class is a service.
And while we're at it, let's also remove the repetitive `providedIn: 'root'`.

If I could wish for a change in the Angular framework, it might look like this:

```ts
// book-store.ts

@Service()
export class BookStore { }
```

Here's what I specifically envision as improvements:

1. We continue to omit the `Service` suffix.
2. We no longer have to write `providedIn: 'root'` for every service. That's always annoyed me.

## The goal: more compact, clearer, and less boilerplate code

So, my goal is a more elegant decorator that:

* clearly signals that the class is a service,
* automatically registers it in the root injector (`providedIn: 'root'`),
* is fully compatible with the AOT compiler and Ivy.

In short: a decorator that has a compact syntax and brings me personal joy. 😇

## What options do we have?

Developing such a custom decorator isn't completely trivial, especially since Angular tightly controls how DI works internally.
Let's look at a few possible approaches:


### Idea 1: Inheriting from `@Injectable`

A logical idea would be to annotate a base class with `@Injectable()` and extend it:

```ts
@Injectable({ 
  providedIn: 'root' 
})
export class BaseService {}

export class BookStore extends BaseService {}
```

Unfortunately, this doesn't work because Angular stores metadata at compile time directly on the target class.
This metadata is not inherited.
The framework simply doesn't find the service, and we get the following error at runtime:

> **❌ Error:** NullInjectorError: No provider for BookStore!

Aside from the technical issue, this also doesn't meet our goal of creating a real decorator.


## Idea 2: Custom decorator that wraps `@Injectable`

A second idea would be to create a simple wrapper:

```ts
export function Service(): ClassDecorator {
  return Injectable({ providedIn: 'root' });
}
```

This code also compiles, but as soon as we try to inject the decorated service via DI, we get the following runtime error:

> **❌ Error:** The injectable 'BookStore2' needs to be compiled using the JIT compiler, but '@angular/compiler' is not available.
> JIT compilation is discouraged for production use-cases! Consider using AOT mode instead.
> Alternatively, the JIT compiler should be loaded by bootstrapping using '@angular/platform-browser-dynamic' or '@angular/platform-server',
  or manually provide the compiler with 'import "@angular/compiler";' before bootstrapping.

To better understand this error message, we need some background knowledge about the terms 'AOT' and 'JIT', which can be quickly explained:
Angular supports two types of compilation: the **JIT mode (Just-in-Time)** and the **AOT mode (Ahead-of-Time)**.
In JIT mode, Angular compiles components and decorators at runtime directly in the browser.
While flexible, this approach is relatively slow and therefore not recommended in production.
In contrast, AOT mode performs the compilation during the build process.
This results in significantly better performance and smaller bundle sizes.
Since the introduction of the Ivy engine (since Angular 9), AOT is the default mode, and as developers we normally don't need to worry about this topic anymore.
Therefore, it's important that our decorators are fully AOT-compatible, which unfortunately is not the case here.

Conclusion: This variant only works in JIT mode and is unfortunately not supported by the AOT compiler.


## Idea 3: Using internal Angular Ivy APIs

The previous approaches didn't work. Now let's look at internal Ivy APIs.
These are mechanisms Angular itself uses to provide services.
**Important: We are consciously venturing into experimental territory!**
We're using an internal but undocumented Angular API.
This approach is more suitable as an experiment than a recommendation for production.

The central internal API of interest is [`ɵɵdefineInjectable`](https://github.com/angular/angular/blob/a40abf09f1abcabda3752ed915bb90e4eafe078d/packages/core/src/di/interface/defs.ts#L167).
This function creates the necessary metadata so Angular can inject the class automatically.
The linked code also includes usage hints: (**This should be assigned to a static `ɵprov` field on a type, which will then be an `InjectableType`.**)

### Minimal version without constructor injection

Let's start with a minimal approach that's simple but has a clear limitation:

```ts
import { ɵɵdefineInjectable } from '@angular/core';

export function Service(): ClassDecorator {
  return (target: any) => {
    Object.defineProperty(target, 'ɵprov', {
      value: ɵɵdefineInjectable({
        token: target,
        providedIn: 'root',
        factory: () => new target()
      })
    });
  };
}
```

What does this code do?

* It uses `ɵɵdefineInjectable` to create an "injectable definition" and assigns it as a new property to `target`.
* `providedIn: 'root'` ensures the service is globally available without repeating that setting.
* The factory function simply creates a new instance of the class – **but without constructor dependencies**.

The big advantage of this approach is its simplicity.
However, at runtime, we don't know what dependencies the constructor expects.
So we're forced to call it without arguments.
The major downside is that generic constructor injection isn't possible.

This example demonstrates this issue.
We expect the `BookRating` service to be injected via the constructor.
Instead, we just get `undefined`.

```ts
@Service()
export class BookStore {

  constructor(br: BookRating) {
    console.log(br) // undefined
  }
}
```

So this version is only suitable for services without constructor dependencies.
However, Angular now provides a new function that also helps us in such cases.
We will take a closer look at exactly how this works very soon!


### Gregor's version: Constructor injection with explicit dependencies

While researching, I discovered that my fellow GDE Gregor Woiwode explored this topic 5 years ago.
He presented [his solution](https://stackoverflow.com/a/59759381) on StackOverflow.
His decorator is called `@InjectableEnhanced` and shares the same goal as this article.

Gregor already demonstrated how to simulate constructor injection.
He uses the same API but explicitly defines dependencies in the factory function:

```ts
// Gregor's code, slightly modified:

export function InjectableEnhanced() {
  return <T extends new (...args: any[]) => InstanceType<T>>(target: T) => {
    (target as any).ɵfac = function() {
      throw new Error("cannot create directly");
    };

    (target as any).ɵprov = ɵɵdefineInjectable({
      token: target,
      providedIn: "root",
      factory() {
        // ɵɵinject can be used to get dependency being already registered
        const dependency = ɵɵinject(BookRating);
        return new target(dependency);
      }
    });
    return target;
  };
}

@InjectableEnhanced()
export class BookStore {

  constructor(br: BookRating) {
    console.log(br) // works! 🥳
  }
}
```

What's happening here?

* Gregor's code defines not only `ɵprov` but also explicitly `ɵfac` (the factory), which is usually created automatically by the Angular compiler.
  The code also prevents direct instantiation of the class with an early exception.
  If you're concerned about manual instantiation, keep this check.
* Within the factory, the code injects each dependency explicitly using `ɵɵinject`.
  In this case, it's our `BookRating` service.
  This supports direct constructor injection.
* But caution: We have to list each dependency manually in the factory!
  This is error-prone and tedious if the constructor parameters change.

The code can also be rewritten to match the previous example.
Instead of assigning `((target as any).ɵprov)`, I'd rather use `Object.defineProperty()`.
This style is a bit more verbose, but avoids bypassing the type system using a type assertion to `any`.
I've also left out the error message:

```ts
// Gregor's code, shortened and adapted:

export function Service(): ClassDecorator {
  return (target: any) => {
    Object.defineProperty(target, 'ɵprov', {
      value: ɵɵdefineInjectable({
        token: target,
        providedIn: 'root',
        factory: () => {
          // ɵɵinject can be used to get dependency being already registered
          const dependency = ɵɵinject(BookRating);
          return new target(dependency);
        }
      })
    });
  };
}

@Service()
export class BookStore {

  constructor(br: BookRating) {
    console.log(br) // still works 🥳
  }
}
```

This approach is a clever technical solution, but it has one clear limitation:
It isn't generic enough for all cases.
Each service must list dependencies manually.
Gregor's old solution still works perfectly for special cases with few or always the same dependencies.


## Idea 4: Automatic dependency resolution with reflect-metadata

To enable constructor injection without manually listing dependencies,
we could use the library [reflect-metadata](https://www.npmjs.com/package/reflect-metadata).
This requires enabling `emitDecoratorMetadata: true` in `tsconfig.json` and adding `reflect-metadata` as a dependency.

In older Angular versions, `reflect-metadata` was often required because the JIT compiler evaluated metadata at runtime.
With Ivy (since Angular 9) and AOT compilation, Angular generates static metadata at build time,
so `reflect-metadata` is usually unnecessary in production.

Using this library increases bundle size, which modern Angular projects aim to avoid.
I therefore didn't pursue this further and don't want to reintroduce `reflect-metadata` to my projects.

### Idea 5: The final idea: Dependency injection with `inject()`

Can we make it even simpler, without manually listing constructor dependencies?
This is where Angular's new `inject()` function comes in (which didn't exist in 2020).

With `inject()`, we can obtain dependencies directly within the class definition, no need for constructor injection.
That solves all our previous problems:

```ts
// same code again, from previous Idea 3 example
import { ɵɵdefineInjectable } from '@angular/core';

export function Service(): ClassDecorator {
  return (target: any) => {
    Object.defineProperty(target, 'ɵprov', {
      value: ɵɵdefineInjectable({
        token: target,
        providedIn: 'root',
        factory: () => new target(), // keine Parameter nötig!
      }),
    });
  };
}
```

Here's how to use it:

```ts

@Service()
export class BookStore {

  #service = inject(BookRating); // dependency directly injected
}
```

Here's another example:

```ts
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Service } from './service';

@Service()
export class BookStore {
  #http = inject(HttpClient); // yay! 🥳

  getAll() {
    return this.#http.get('/api/books');
  }
}
```

Sounds elegant, at least for our little experiment!

### Conclusion and final thoughts

We've now explored several versions of a custom `@Service()` decorator and seen:

1. **Minimal version without constructor injection:**
   Simple, but too limited for most real-world use.

2. **Gregor's 2020 version with explicit constructor injection:**
   Technically interesting and gives insight into how DI works under Ivy.
   In practice, suitable only for specific cases due to the need to list dependencies manually.
   Less maintainable.

3. **Automatic dependency resolution via `reflect-metadata`:**
   Convenient and generic, but the extra dependency increases bundle size and doesn't fit modern Ivy-based Angular.

4. **Modern approach: Dependency injection with `inject()`:**
   Leverages Angular's new `inject()` API.
   Constructor injection isn't used, but also no longer necessary.
   This final idea with `inject()` appeals to me personally.

But should we really use this decorator?

Ultimately, as mentioned in the intro, this decorator is a **thought experiment**.
Exploring Angular's internal APIs like this is fun and educational, but in production we should be cautious:

* **Use of internal APIs:**
  The Ivy APIs (`ɵɵdefineInjectable`, `ɵɵinject`) are undocumented and could change in future Angular versions.
  This poses a risk that the code may break or need major updates.

* **Maintainability and team understanding:**
  A custom decorator may seem elegant, but every new team member must learn why it exists and how it works.

* **Low benefit vs. risk:**
  The only gain is slightly better readability and a bit less boilerplate.
  But the risks and maintenance cost may outweigh this.

For these reasons, I'd probably continue using the reliable `@Injectable()` decorator in production Angular code.
The official API gives us stability, maintainability, and future-proofing.

**What do you think?**

How do you like this experimental `@Service()` decorator?
Would you try it anyway, or do you prefer to stick with good old `@Injectable()` like I do? …or should I switch everything to `@Service()`? 😅

I'd love to hear your feedback on X or BlueSky! 😊

<hr>

<small>Thanks to Danny Koppenhagen for the review and valuable feedback!</small>
