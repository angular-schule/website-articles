---
title: "Generate Angular API clients with Swagger Codegen"
author: Johannes Hoppe
mail: johannes.hoppe@haushoppe-its.de
published: 2018-04-05
keywords:
  - Swagger
  - Codegen
  - TypeScript
language: en
thumbnail: swagger-logo-white.png
hidden: true
---

**In this article, we will take a look at swagger codegen. It will save you a ton of work and pain by generating HTTP services automatically from your swagger API description.**

<hr>

TODO...


# Building the codegen from the sources

You might want to use the very latest version directly from Github.
This isn't much complicated, since everything is nicely prepared with Maven.

```
git clone https://github.com/swagger-api/swagger-codegen.git
cd swagger-codegen
mvn clean install
```

We are using the master branch, some unit test might be broken.
Or you just want to save some time. Anyway, `mvn clean package -Dmaven.test.skip` will skip the tests. ;-)

Maven will create the necessary Java archive at the location `modules/swagger-codegen-cli/target/swagger-codegen-cli.jar`
It's important to know that you have to use Java 7 or 8. [It won't compile with Java 9](https://github.com/swagger-api/swagger-codegen/issues/7976). 

