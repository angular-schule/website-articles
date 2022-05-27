---
title: 'Standalone Features – neu ab Angular 14'
author: Ferdinand Malcher
mail: mail@fmalcher.de
published: 2022-05-28
last-change: 2022-05-27
keywords:
  - Angular
  - Angular 14
  - NgModule
  Standalone Components
language: de
thumbnail: ./standalone.jpg
---

Das wohl am heißesten diskutierte Feature von Angular 14 sind die *Standalone Components*. Komponenten, Pipes und Direktiven müssen damit nicht mehr in einem NgModule deklariert werden, sondern können eigenständig genutzt werden.
In diesem Artikel geben wir einen Überblick und zeigen, wie Sie das neue Feature praktisch verwenden.

> Wichtig: Die Standalone Features sind derzeit in *Developer Preview*. Die Schnittstelle kann sich also noch ändern, bevor das Feature als stable veröffentlicht wird.

## NgModule und Standalone Components

Angular-Module mit NgModule sind ein fester Bestandteil des Frameworks, um Anwendungen zu strukturieren. Mithilfe von Modulen können wir vor allem Features und andere zusammenhängende Teile von Apps strukturieren. Damit eine Komponente verwendet werden kann, muss sie immer in einem Modul deklariert werden – aber nur in genau einem.
Diese Bündelung birgt aber immer wieder praktische Probleme, wenn es um Wiederverwendbarkeit von Komponenten, Pipes und Direktiven geht. Häufig steckt man diese Dinge in ein globales SharedModule, das überall dort importiert wird, wo eine Wiederverwendbarkeit Komponente benötigt wird. Dadurch entsteht ein schwerfälliges und allwissendes Modul, das eine entkoppelte Struktur der Anwendung eher verhindert. Außerdem macht der mentale Overhead der Module es komplizierter, das Angular-Framework zu erlernen.
In der Praxis setzen viele deshalb bereits darauf, pro Komponente ein eigenes Modul zu erstellen. Dieses Konzept ist auch als SCAM bekannt: Single-Component Angular Module.
Dadurch wird die Idee von Modulen fast vollständig verabschiedet: Eine Komponente muss in ihr Modul genau die Dinge importieren, die sie verwenden möchte – nicht mehr und nicht weniger.

Nun wurde dieses Thema direkt vom Angular-Team angegangen: Seit Angular 14 sind die sogenannten Standalone Components als Developer Preview verfügbar!
Eine Komponente, Pipe oder Direktive, die als Standalone markiert ist, muss nicht in einem Modul deklariert werden, sondern kann alleinstehend verwendet werden.
Dadurch werden Module mit NgModule optional: Die Komponenten importieren selbst die Dinge, die sie in ihren Templates benötigen. Eine Bündelung in Modulen entfällt, und die Struktur der Anwendung wird vereinfacht.

Wir beschäftigen uns im Folgenden vor allem mit Komponenten. Die Standalone Features funktionieren genauso auch für Pipes und Direktiven.

## Standalone Components verwenden

Um eine Komponente, Pipe oder Direktive alleinstehend zu verwenden, setzen wir das passende Flag `standalone` im Decorator der Klasse:

```ts
@Component({
  selector: 'br-dashboard',
  standalone: true,
  // ...
})
export class DashboardComponent {}
```

Diese Einstellung können wir auch sofort beim Generieren der Komponente mit der Angular CLI angeben:

```bash
ng g component dashboard --standalone
```

Damit die Komponente nun tatsächlich genutzt werden kann, müssen wir sie importieren. Eine andere Standalone Component kann dafür in ihren Metadaten Imports definieren. Auf diese Weise erklären die Komponenten selbst, welche anderen Teile der Anwendung sie in ihrem Template verwenden möchten.

```ts
@Component({
  selector: 'br-root',
  standalone: true,
  imports: [DashboardComponent]
  // ...
})
export class AppComponent {}
```

Das sieht zunächst etwas aufwendiger aus, allerdings profitiert die Struktur der Anwendung stark davon: Die tatsächlichen Beziehungen zwischen Komponenten sind so noch klarer auf den ersten Blick erkennbar.

## Kombination mit NgModules

Beim Design von Standalone Components wurde sehr viel Wert auf die Abwärtskompatibilität gelegt.
Standalone Components und NgModule können deshalb in Kombination genutzt werden.
Eine Standalone Component wird dafür in das Modul importiert, so als wäre sie ein eigenes Modul. Sie ist dann in dem gesamten NgModule sichtbar und verwendbar:

```ts
@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,

    DashboardComponent
  ],
  // ...
})
export class AppModule {}
```

Genauso kann eine Standalone Component selbst Module importieren, deren Bestandteile sie in ihrem Template nutzen möchte.
Das ist insbesondere für das `CommonModule` wichtig, das die eingebauten Pipes und Direktiven wie `ngIf` mitbringt:

```ts
@Component({
  selector: 'br-dashboard',
  standalone: true,
  imports: [CommonModule, BooksSharedModule]
  // ...
})
export class DashboardComponent {}
```

Um mehrere Komponenten, Pipes und Direktiven gemeinsam einzubinden, können diese als Array exportiert und importiert werden.
So kann z. B. eine Bibliothek all jene Direktiven zusammen exportieren, die auch gemeinsam genutzt werden müssen. So erhält man einen ähnlichen Komfort wie mit einem NgModule, das mehrere Dinge exportiert.

```ts
export SHARED_THINGS = [BookComponent, IsbnPipe, ConfirmDirective];
```

```ts
@Component({
  selector: 'br-dashboard',
  standalone: true,
  imports: [SHARED_THINGS]
  // ...
})
export class DashboardComponent {}
```

## AppComponent direkt bootstrappen

Besteht die gesamte Anwendung nur aus Standalone Components ohne Module, können wir auch das globale AppModule entfernen. Dafür wird direkt die erste Komponente gebootstrappt (in der Regel die `AppComponent`), anstatt ein ganzes Modul zu laden. In der Datei `main.ts` nutzen wir dazu die neue Funktion bootstrapApplication:

```ts
import { bootstrapApplication } from '@angular/core';
import { AppComponent } from './app/app.component';

// main.ts
bootstrapApplication(AppComponent)
  .catch(e => console.error(e));
```


## Providers in Modulen

Neben Komponenten, Pipes und Direktiven können Module verschiedene Providers für die Dependency Injection bereitstellen.
An dieser Stelle wird es etwas komplizierter, denn Providers sind nicht mehr an Module gekoppelt, sondern werden eigenständig bereitgestellt.
Dafür können wir in der Funktion bootstrapApplication() die Provider angeben, z. B. um den Router zu konfigurieren.

```ts
CODE providers
```


Auch für Lazy Loading ergeben sich Änderungen, denn die zu ladenden Komponenten sind nun nicht mehr in einem Modul gebündelt. Stattdessen verweisen wir bei der Definition der Basisroute für das Lazy Loading direkt auf eine zu ladende Standalone Component.

```ts
TODO
CODE Lazy Loading
```

Für existierende Module mit Providers gibt es die neue Funktion importProvidersFrom(), mit der wir die Providers aus dem Modul extrahieren können.

```ts
CODE importProvidersFrom 
```



<hr>

Die Standalone Features von Angular werden derzeit als Developer Preview angeboten. Das heißt, dass sich die Schnittstelle später noch ändern kann.
Die neue Herangehensweise an die Angular-Entwicklung ist ein großer Bruch. Es wird einige Zeit dauern, bis sich die neuen Patterns und Architekturen etabliert haben.
NgModules werden noch so lange bestehen bleiben, bis die Standalone Features sicher in der Community angekommen sind.
Wir empfehlen Ihnen daher, auch weiterhin auf NgModules zu setzen.
Für wiederverwendbare Komponenten lohnt es sich ggf., die Standalone Components auch jetzt schon auszuprobieren.




<hr>


<small>**Titelbild:** TODO</small>
