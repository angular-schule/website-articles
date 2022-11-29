---
title: 'TypeScript: useDefineForClassFields – How to avoid future Breaking Changes'
author: Johannes Hoppe and Ferdinand Malcher
mail: team@angular.schule
published: 2022-11-29
lastModified: 2022-11-29
keywords:
  - Angular
  - JavaScript
  - ECMAScript
  - TypeScript
  - ES2022
  - Class Properties
  - useDefineForClassFields
language: en
thumbnail: usedefineforclassfields.jpg
sticky: false
---


Did you know that properties are implemented slightly differently in JavaScript and TypeScript and that there is an incompatible behaviour?
That's why projects with Angular 15 have the option `useDefineForClassFields` set in their TypeScript configuration.
We will show you in detail what the problem is and how you should write your code so that it is future-proof for both programming languages.


## Contents

* [Property initialisation in TypeScript](/blog/2022-11-use-define-for-class-fields#property-initialisation-in-typescript)
* [The proprietary behaviour of TypeScript](/blog/2022-11-use-define-for-class-fields#the-proprietary-behaviour-of-typescript)
* [Future-proof property initialisation](/blog/2022-11-use-define-for-class-fields#future-proof-property-initialisation)
* [Implications for existing Angular code](/blog/2022-11-use-define-for-class-fields#implications-for-existing-angular-code)

> **🇩🇪 This article is available in German language here: [TypeScript: useDefineForClassFields – zukünftige Breaking Changes vermeiden](https://angular-buch.com/blog/2022-11-use-define-for-class-fields)**

## Property initialisation in TypeScript

When working with Angular, we regularly initialise properties in our classes.
For example, a class property can be initialised with a value directly when it is declared.
There is also a shorthand notation that allows us to declare properties automatically via the constructor. 
We normally use this short form in Angular to request dependencies through DI (Dependency Injection).

```ts
class User {
  // direct initialisation
  age = 25;

  // short form
  constructor(private currentYear: number) {}
}
```

## The proprietary behaviour of TypeScript


These two notations shown before are proprietary features of TypeScript and have existed since the earliest versions of the language.
The JavaScript programming language (or more correctly, the ECMAScript standard) did not fully support class properties at that time, since the standardisation was still in progress.
During the design of TypeScript's properties, the TS team assumed that the chosen implementation would accurately match the behaviour of a future version of JavaScript on the basis of their best knowledge and belief.
Unfortunately, that didn't quite work out – standardisation in ECMAScript has gone a different way over the years.

The original class properties of TypeScript are implemented in such a way that initialisation with values is always performed as the first statement in the constructor.
The results of the two following notations have so far been absolutely identical:

```ts
class User {
  age = 25;
}

// is exactly the same in TypeScript as:
class User {
  age: number;

  constructor() {
    this.age = 25;
  }
}
```

Unfortunately, in JavaScript, native class properties behave a little differently:
It is possible to initialise properties first and execute the constructor *afterwards*.
These are two independent steps in JavaScript.
In contrast, in the proprietary implementation of TypeScript, the initialisation of the properties always occurs together with the constructor call.

This discrepancy between TypeScript and JavaScript is very inconvenient, since TypeScript is supposed to be a superset and should remain compatible with JavaScript as far as possible.
To align the two programming languages again, the TypeScript team has introduced a new switch called `useDefineForClassFields`.
As soon as the target of TypeScript is set to `ES2022`, the default value for this option is `true`.
This means that the native implementation of JavaScript will be used and that the properties will behave in a different way than before.
Depending on the setting, the following code has two different outputs:

```ts
class User {
  age = this.currentYear - 1998;

  constructor(private currentYear: number) {
    // useDefineForClassFields: false --> Current age: 25
    // useDefineForClassFields: true --> Current age: NaN
    console.log('Current age:', this.age);
  }
}

const user = new User(2023);
```

By using the old proprietary behaviour of TypeScript (`useDefineForClassFields: false`), an age of `25` is calculated when the constructor of the class is called with the value `2023`.
The shown code has the following step-by-step flow:

1. The constructor is called with the current year.
2. The value for the current year is assigned to the property `currentYear`.
3. The property `age` is initialised, and all values are available for calculation. 
4. The following message is displayed in the console: `Current age: 25`.

However, if we set the option `useDefineForClassFields` to `true` in the `tsconfig.json` file, we get `NaN` as a result, which stands for `Not a Number`.
The code now runs in a different order:

1. The property `age` is initialised first, but not all values are available for calculation: At this point, the property `currentYear` is still `undefined`, so that the subtraction cannot produce a valid result.
2. The constructor is then called with the current year. 
3. The value is assigned to the property `currentYear`. 
4. The following message is displayed in the console: `Current age: NaN`.

You are invited to explore the different behaviour by yourself in this Stackblitz example:
**[👉 Demo on Stackblitz: useDefineForClassFields](https://stackblitz.com/edit/angular-buch-usedefineforclassfields?file=src%2Fapp%2Fapp.component.ts,tsconfig.json)**


## Future-proof property initialisation

We want to improve the previously described source code so that it works independently of the current setting.
In order to achieve this, we can explicitly initialise the property as the first command in the constructor:

```ts
class User  {
  age: number;

  constructor(private currentYear: number) {
    this.age = this.currentYear - 1998;
    console.log('Current age:', this.age);
  }
}

const user = new User(2023);
```

With this notation, it doesn't matter whether the proprietary behaviour of TypeScript or the standardised behaviour of JavaScript is active.
Both implementations produce the same result.

Of course, in a real project, we rarely use properties to perform arithmetic.
However, we have to be very careful when using Dependency Injection in Angular, especially when we want to use a service within the property initialisation.
In the future, the following notation has the potential to break with an error:


```ts
// ⚠️ ATTENTION: This code is not future-proof! ⚠️

@Component({ /* ... */ })
export class MyComponent {
  // this.myService could be undefined!
  data = this.myService.getData();

  constructor(private myService: MyDataService) { }
}
```

To work around the problem, we should always do the initialisation in the constructor.
This way our code is future-proof:

```ts
@Component({ /* ... */ })
export class MyComponent {
  data: Data;

  constructor(private myService: MyDataService) {
    this.data = this.myService.getData();
  }
}
```

Another option is to not request the dependency via the constructor at all, but to use the `inject()` funciton, instead. This function also offers Dependency Injection but without the constructor.
Even further, if we need the service instance more than once, we can store the requested dependency in a property and use it from anywhere in the class, as shown below:


```ts
import { inject } from '@angular/core';

@Component({ /* ... */ })
export class MyComponent {
  data = inject(MyDataService).getData();
  otherService = inject(MyOtherService);
}
```

> **Hint:** If we want to access injected dependencies at direct property initialisation, we should …
>* perform the initialisation in the constructor or
>* use the `inject()` function.


## Implications for existing Angular code

As we have seen, the setting of `useDefineForClassFields` has a huge impact.
If the switch would have been left in the default setting for existing Angular projects, there would be a lot of unexpected bugs in all projects.
Therefore, the Angular team has explicitly disabled the setting for both existing and new projects with Angular 15.
In the `tsconfig.json` file we can find the following settings for that:

```json
{
  "compilerOptions": {
    // ...
    "useDefineForClassFields": false,
    "target": "ES2022"
  }
}
```
The well-known proprietary behaviour will therefore remain in place for now.

However, Angular usually follows the recommendations and defaults of TypeScript.
For example, in the past the strict type checks were enabled for new projects.
We asssume that one day the setting `useDefineForClassFields` will be turned to the default value `true` for new Angular projects.
We therefore recommend to already develop your code as solid as possible now and set the `useDefineForClassFields` setting to `true` before Angular does it by default.
If the default setting will be changed in future, you will not be affected by any breaking change!


## Workshops for your team

The two authors of this article offer Angular training courses in German. 
All our lessons are always up to date, of course. We only teach examples that are compatible with JavaScript behaviour.
Learn Angular and best practices together with us and **[ask now for an offer](https://angular.schule/#anfrage)**.



<hr>

<small>**Cover image:** Mols Bjerge National Park, Denmark, 2022. Photo by Ferdinand Malcher</small>
