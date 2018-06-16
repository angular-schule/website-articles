---
title: Unsere Vorträge zur enterJS und DWX
author: Angular.Schule Team
mail: team@angular.schule
published: 2018-06-16
last-change: 2018-06-16
keywords:
  - Angular
  - TypeScript
  - SSR
  - Swagger
  - GraphQL
  - Chrome Dev Tools
language: de
thumbnail: banner.jpg
sticky: true
---

Im Juni 2018 haben wir eine ganze Reihe von Talks im Programm.
Dies ist eine Liste aller Vorträge und des Workshops.


## API-Clients für TypeScript generieren mit Swagger & GraphQL<br><small>von Johannes Hoppe</small>

Welch ein Dilemma: Da baut man im Backend eine geniale REST-API und dann wird sie im Frontend nicht korrekt genutzt. Oder die neuesten Änderungen werden nicht übernommen. Oder die falschen Typen werden verwendet. Die Lösung liegt auf der Hand: Menschen machen Fehler, Maschinen nicht. 

In diesem Vortrag zeige ich Ihnen, wie Sie Ihre API mithilfe von Swagger oder GraphQL beschreiben können. 

Als Beispiel wird ein Backend auf Basis von express verwendet. Im Client kommt Angular zum Einsatz. Doch die Prinzipien lassen sich auf alle Programmiersprachen anwenden. Anschließend generieren wir automatisch einen passenden typsicheren Client per Code-Generator (swagger-codegen bzw. apollo-codegen). 

In der abschließenden FAQ-Session besprechen wir die Unterschiede zwischen Swagger und GraphQL und klären, für welchen Anwendungsfall welches Framework besser geeignet ist. 

__Vorkenntnisse:__
* Grundlagen Client/Server
* JavaScript im Frontend 

__Lernziele:__
* Programmierfehler vermeiden 
* Code-Generatoren einsetzen

__Wo/Wann:__
* [enterJS, Mittwoch, 13:50 Uhr](https://www.enterjs.de/single?id=6764&api-clients-f%C3%BCr-typescript-generieren-mit-swagger-%26-graphql)

__Material:__
* [Slides (Google Docs)](https://docs.google.com/presentation/d/1qbQwF5YyONDmlRhrb_1QZYJviOw--AHch9KcNzHrTso/edit?usp=sharing)
* [Demo code (Github)](https://github.com/angular-schule/demo-api-codegen)
* weiterführender Artikel: [Generating Angular API clients with Swagger](https://angular.schule/blog/2018-04-swagger-codegen)
* weiterführender Artikel: [Swagger Codegen is now OpenAPI Generator](https://angular.schule/blog/2018-06-swagger-codegen-is-now-openapi-generator)
* weiterführender Artikel: [Generating Angular API clients with Apollo and GraphQL code generator](https://angular.schule/blog/2018-06-apollo-graphql-code-generator)


---


## Chrome Devtools Deep Dive<br><small>von Ferdinand Malcher und Johannes Hoppe</small>

"Ist nicht wahr, Chrome kann das?" Wer diesen Satz schon einmal gesagt hat, ist in unserem Talk genau richtig. Denn wir beleuchten die Chrome Developer Tools von allen Seiten. Wir demonstrieren bekannte Features wie das Debugging von JavaScript/TypeScript und HTML, das Emulieren von mobilen Geräten, Inspektion von HTTP-Traffic und die Optimierung der Performance.

Wir wollen uns aber auch die Zeit nehmen, weniger bekannte Features zu zeigen. Wussten Sie, dass await jetzt in der Console unterstützt wird? Oder dass Chrome ohne Extensions Volltext-Screenshots macht? Oder dass man sich das nicht verwendete CSS und JavaScript anzeigen lassen kann? Oder… ist nicht wahr, Chrome kann das? 

__Vorkenntnisse:__
* Kein Vorwissen nötig, Grundlagen 
* JavaScript/HTML/CSS hilfreich 

__Lernziele:__
Versteckte und unbekannte Funktionen der Chrome DevTools verstehen und anwenden können.

__Wo/Wann:__
* [enterJS, Donnerstag, 09:55 Uhr](https://www.enterjs.de/single?id=6759&chrome-devtools-deep-dive)


---


## Server Side Rendering (SSR) und Pre-Rendering mit Angular<br><small>von Ferdinand Malcher und Johannes Hoppe</small>

Single-Page-Anwendungen haben ein Problem: Der Code wird in einer leeren HTML-Seite ausgeführt. Suchmaschinen ignorieren JavaScript und sehen lediglich diese weiße Seite! Dazu kommt: Bevor der Nutzer die App sieht, muss der Code heruntergeladen und gerendert werden. Das verlängert die Ladezeit und frustriert. Zum Glück gibt es Strategien, um das Problem zu meistern:

* Pre-Rendering mit Headless Browser 
* Server Side Rendering 
* Statisches Pre-Rendering

In diesem Talk stellen wir Ihnen die Konzepte des Server Side Rendering mit Angular vor. Lernen Sie anhand praktischer Beispiele, wie die Serverplattform von Angular arbeitet und wie Sie selbst eine servergerenderte Anwendung aufsetzen. 

__Lernziele:__
Strategien für SSR und Pre-Rendering kennenlernen, um SEO und verbesserte UX auch in Single-Page-Anwendungen zu ermöglichen.

__Wo/Wann:__
* [enterJS, Donnerstag, 16:00 Uhr](https://www.enterjs.de/single?id=6760&server-side-rendering-%28ssr%29-und-pre-rendering-mit-angular)


---



## Workshop: Reaktive Programmierung mit RxJS<br><small>von Ferdinand Malcher und Johannes Hoppe</small>

Die Reactive Extensions für JavaScript (RxJS) sind ein mächtiges Framework, um Datenströme abzufragen, zu transformieren und neu zusammenzusetzen. Mithilfe der komfortablen Abfragesprache lassen sich asynchrone und eventbasierte Aufgaben stark vereinfachen. Seit der vollständigen Integration mit Angular lohnt es sich, einen genaueren Blick auf das Framework und die zugrundeliegenden Prinzipien zu werfen.

In diesem Tagesworkshop bringen Johannes Hoppe und Ferdinand Malcher (Angular.Schule) Licht ins Dunkel der reaktiven Programmierung. An ausführlichen Beispielen lernen Sie die Konzepte und Techniken von RxJS und Observables kennen. Dabei betrachten wir vor allem den Unterschied zu Promises und meistern die vielen Operatoren, die RxJS mitbringt. Sie werden sehen, wie sich alltägliche Aufgabenstellungen zu reaktiven Datenströmen vereinfachen lassen. Auch wenn es sich manchmal wie Magie anfühlt – RxJS ist einfacher als Sie denken!

Der Workshop wird aus vielen einzelnen praktischen Übungen bestehen. Als Arbeitsumgebung verwenden wir Webpack 4 und TypeScript. So lassen sich alle gelernten Aspekte auf die großen SPA-Frameworks wie Angular, React und Vue.js übertragen.


__Agenda__
* ab 08.30 Uhr: Registrierung und Begrüßungskaffee
* 09.30 Uhr: Beginn
* 10.45 Uhr - 11.00 Uhr: Kaffeepause
* 12.30 Uhr - 13.30 Uhr: Mittagspause
* 14.45 - 15.15: Kaffeepause
* ca. 17 Uhr: Ende

__Technische Anforderungen:__
Bitte bringen Sie einen eigenen Laptop mit, auf dem Node.js, Google Chrome und eine Entwicklungsumgebung (Visual Studio Code) installiert sind

Eine ausführliche Installationsanleitung steht auf folgender Seite bereit:  
https://github.com/angular-schule/2018-06-rxjs-workshop-enterjs

Falls Sie ein Gerät Ihrer Firma verwenden, überprüfen Sie vorher bitte, ob eines der folgenden, gelegentlich vorkommenden Probleme bei Ihnen auftreten könnte:

* Workshop-Teilnehmer hat keine Administrator-Rechte.
* Corporate Laptops mit übermäßig penibler Sicherheitssoftware
* Gesetzte Corporate-Proxies, über die man in der Firma kommunizieren muss, die aber in einer anderen Umgebung entsprechend nicht erreicht werden.

__Vorkenntnisse:__
Die Teilnehmer sollten über Grundlagenwissen zu modernem JavaScript (ECMAScript 2015) verfügen. Erste Kontakte mit RxJS sind von Vorteil, aber nicht erforderlich. 

__Lernziele:__
* Das Konzept der reaktiven Programmierung verstehen und für reale Problemstellungen anwenden können
* Observables gezielt einsetzen
* RxJS-Operatoren und ihre Besonderheiten kennen und richtig anwenden können
* Unit-Tests für RxJS-Code beherrschen

__Wo/Wann:__
* [enterJS, Dienstag, 09:30 Uhr](https://www.enterjs.de/single?id=6998&reaktive-programmierung-mit-rxjs)

