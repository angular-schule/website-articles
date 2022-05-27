---
title: 'Standalone Components – neu ab Angular 14'
author: Ferdinand Malcher
mail: mail@fmalcher.de
published: 2022-05-28
last-change: 2022-05-27
keywords:
  - Angular
  - Angular 14
  - NgModule
  - Standalone Components
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
  selector: 'app-dashboard',
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
  selector: 'app-root',
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
Das ist insbesondere für das `CommonModule` wichtig, das die eingebauten Pipes und Direktiven wie `ngIf` mitbringt.
Beim Generieren einer Komponente mit der Angular CLI wird deshalb immer schon das `CommonModule` standardmäßig importiert.

```ts
@Component({
  selector: 'app-dashboard',
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
  selector: 'app-dashboard',
  standalone: true,
  imports: [SHARED_THINGS]
  // ...
})
export class DashboardComponent {}
```

## AppComponent direkt bootstrappen

Besteht die gesamte Anwendung nur aus Standalone Components ohne Module, können wir auch das globale `AppModule` entfernen.
Stattdessen wird direkt die erste Komponente gebootstrappt (in der Regel die `AppComponent`).
In der Datei `main.ts` nutzen wir dazu die neue Funktion `bootstrapApplication()`:

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent)
  .catch(err => console.error(err));
```


## Providers in Modulen

Neben Komponenten, Pipes und Direktiven können Module verschiedene Providers für die Dependency Injection bereitstellen.

> Für Services in der Anwendung werden in der Regel *Tree-Shakable Providers*  verwendet, indem die Klasse mit `providedIn` markiert wird. Die folgenden Infos treffen nur auf Providers zu, die zuvor direkt im `AppModule` unter `providers` angegeben wurden.

An dieser Stelle wird es etwas komplizierter, denn auch Providers werden eigenständig bereitgestellt.
Dafür können wir in der Funktion `bootstrapApplication()` ein Array von Providers angeben.
Das Ergebnis ist das gleiche, als hätten wir die Providers im `AppModule` hinterlegt.

```ts
bootstrapApplication(AppComponent, {
  providers: [
    { provide: MY_SETTING, useValue: 'my value' }
  ]
}).catch(err => console.error(err));
```

Importieren wir über den Decorator einer Komponente ein Modul, das Providers beinhaltet, so werden diese für die Komponente und den darunterliegenden Baum bereitgestellt.
Auch die Eigenschaft `providers` im `Component`-Decorator funktioniert weiterhin ohne Veränderungen.

Möchte man nur die Providers eines Moduls extrahieren und bereitstellen, kann die neue Funktion `importProvidersFrom()` genutzt werden.
Die im Modul enthaltenen Komponenten, Pipes und Direktiven werden ignoriert.
Das ist besonders praktisch, wenn Module angefordert werden sollen, die ausschließlich Providers beinhalten, z. B. das `HttpClientModule` oder das `EffectsModule` von NgRx.

```ts
import { importProvidersFrom } from '@angular/core';
// ...

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(HttpClientModule)
  ]
}).catch(err => console.error(err));
```

## Projektstruktur

Strukturieren wir die Anwendung mit NgModules, so wird jedes Modul in einem eigenen Unterordner generiert.
Auch bisher empfehlen wir, abgrenzbare Features in eigenen Modulen (oder sogar eigenen Bibliotheken) zu strukturieren, die im Dateisystem sauber voneinander getrennt sind.

Auch ohne Module ist diese Architekturidee weiterhin anwendbar:
Teile der Anwendung, die ein zusammenhängendes fachliches Feature sind, sollten in einem gemeinsamen Ordner untergebracht werden.
Diese Feature-Ordner oder -Bibliotheken sollten möglichst "flach" im Dateisystem strukturiert werden, also ohne eine tiefe Verschachtelung.

Für gemeinsam genutzte Teile war bisher immer ein `SharedModule` notwendig, das Komponenten, Pipes und Direktiven bereitstellt.
Werden diese Teile nun als Standalone deklariert, ist der tatsächliche Ort im Dateisystem unerheblich.
Entscheidend ist, wer welche Teile importiert.

Kurz: Die Ideen zur Ordnerstruktur der Anwendung bleiben erhalten, auch wenn Standalone Components genutzt werden.


## Routing

Um den Router zu konfigurieren, musste bisher das `RouterModule` importiert werden.
Neben den Direktiven wie `RouterLink` stellt das Modul auch Services bereit, z. B. `Router` oder `ActivatedRoute`.
Diese beiden Bestandteile müssen nun getrennt behandelt werden.


### Routen bereitstellen

Zunächst müssen wir in der Datei `main.ts` das `RouterModule` mit der Methode `forRoot()` importieren.
Dadurch werden die Providers und Root-Routen bereitgestellt.
Wir empfehlen, die Routendefinitionen weiterhin in einer separaten Datei unterhalb des Ordners `src/app` aufzubewahren:

```ts
// app.routes.ts
export const appRoutes: Routes = [
  { path: 'books', component: DashboardComponent },
  { path: 'books/:isbn', component: BookDetailsComponent },
];
```

```ts
// main.ts
// ...
import { appRoutes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(RouterModule.forRoot(appRoutes)),
  ]
}).catch(err => console.error(err));
```


## Direktiven des Routers nutzen

Wenn wir im Template einer Standalone-Komponente die Direktiven des Routers nutzen wollen, z. B. `RouterLink` oder `RouterOutlet`, müssen wir das `RouterModule` importieren.

```ts
@Component({
  // ...
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AppComponent {}
```


## Lazy Loading

Beim Lazy Loading mit dem Router werden für eine definierte Basisroute die Kindrouten aus einem anderen Modul nachgeladen.
Dieses zu ladende Kindmodul wird in ein eigenes Bundle verpackt, das erst zur Laufzeit asynchron nachgeladen wird.
Mit Modulen kann die Basisroute für Lazy loading wie folgt definiert werden:

```ts
// mit NgModule
{
  path: 'books',
  loadChildren: () => import('./books/books.module').then(m => m.BooksModule)
}
```


Mit Standalone Components funktioniert dieses Konzept sehr ähnlich – nur ohne Module.
Wir definieren ebenfalls in den App-Routen eine Basisroute.
Die Eigenschaft `loadChildren` gibt nun allerdings nur ein Array von Routen zurück:


```ts
// books/books.routes.ts
export const booksRoutes: Routes = [
  { path: '', component: DashboardComponent },
  { path: ':isbn', component: BookDetailsComponent },
];
```

```ts
// app.routes.ts
// ...
{
  path: 'books',
  loadChildren: () => import('./books/books.routes').then(m => m.booksRoutes)
}
```

Neu ist außerdem die Möglichkeit, eine einzelne Komponente mittels Lazy Loading direkt zu laden.
Das ist besonders praktisch, wenn es sich bei der gerouteten Komponente gar nicht um ein komplexes Feature mit mehreren Kind-Routen handelt, sondern nur um eine einzelne Ansicht.
Um eine Komponente zu laden, nutzen wir `loadComponent`:

```ts
{
  path: 'dashboard',
  loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
}
```

Prinzipiell funktioniert es also so, als würden wir die Komponente über `component` direkt in der Route angeben. Trotzdem ist das Lazy Loading aktiv, sodass die Komponente erst beim Aktivieren der Route geladen wird.


<hr>

Die neuen Standalone Features von Angular beseitigen den Overhead, der durch NgModules verursacht wurde.
Jede Komponente importiert genau die Dinge, die sie selbst in ihrem Template nutzen möchte.
Die Sichtbarkeit wird also nicht über die Zugehörigkeit zu einem Modul geregelt, sondern durch den Import.
Die Struktur von Anwendungen wird dadurch leichter verständlich, weil das gesamte Wissen über die Abhängigkeiten in der Komponente liegt.

Die neue Herangehensweise an die Angular-Entwicklung ist ein großer Bruch. Es wird einige Zeit dauern, bis sich die neuen Patterns und Architekturen etabliert haben.
NgModules werden noch so lange bestehen bleiben, bis die Standalone Features sicher in der Community angekommen sind.
Wir empfehlen Ihnen daher, auch weiterhin auf NgModules zu setzen.
Für wiederverwendbare Komponenten lohnt es sich ggf., die Standalone Components auch jetzt schon auszuprobieren.


<hr>


<small>**Titelbild:** Photo by <a href="https://unsplash.com/@mourimoto">Mourizal Zativa</a> on <a href="https://unsplash.com">Unsplash</a> (edited)</small>
