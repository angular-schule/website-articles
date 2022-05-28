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
  - Standalone Pipes
  - Standalone Directives
language: de
thumbnail: ./standalone.jpg
---

Das wohl am heißesten diskutierte Feature von Angular 14 sind die *Standalone Components*.
Komponenten, Pipes und Direktiven müssen damit nicht mehr in einem NgModule deklariert werden, sondern können eigenständig genutzt werden.
In diesem Artikel geben wir einen Überblick und zeigen, wie Sie das neue Feature praktisch verwenden.

> Wichtig: Die Standalone Features sind derzeit in *Developer Preview*. Die Schnittstelle kann sich also noch ändern, bevor sie als stable veröffentlicht wird.

## NgModule und Standalone Components

Angular-Module mit NgModule sind ein fester Bestandteil des Frameworks, um Anwendungen zu strukturieren. Mithilfe von Modulen können wir vor allem fachliche Features und andere zusammenhängende Teile von Apps strukturieren.
Damit eine Komponente verwendet werden kann, muss sie immer in einem Modul deklariert werden – aber nur in genau einem.
Diese Bündelung birgt immer wieder praktische Probleme, wenn es um Wiederverwendbarkeit von Komponenten, Pipes und Direktiven geht.
Häufig steckt man diese Dinge in ein globales `SharedModule`, das überall dort importiert wird, wo eine wiederverwendbare Komponente benötigt wird.
Dadurch entsteht ein schwerfälliges und allwissendes Modul, das eine entkoppelte Struktur der Anwendung eher verhindert.
Außerdem macht der mentale Overhead der Module es komplizierter, das Angular-Framework zu erlernen.
Einige Entwicklerinnen und Entwickler setzen deshalb in der Praxis darauf, für jede Komponente ein eigenes Modul zu erstellen. Dadurch wird die Idee von Modulen fast vollständig verabschiedet: Eine Komponente muss in ihr Modul genau die Dinge importieren, die sie verwenden möchte – nicht mehr und nicht weniger.
(Dieses Konzept ist auch als *SCAM (Single-Component Angular Module)* bekannt.)

Nun wurde die Problematik der NgModules direkt vom Angular-Team angegangen: Seit Angular 14 sind die sogenannten *Standalone Features* als Developer Preview verfügbar!
Eine Komponente, Pipe oder Direktive, die als Standalone markiert ist, wird nicht in einem Modul deklariert, sondern wird alleinstehend verwendet.
Dadurch werden NgModules optional: Die Komponenten importieren selbst die Dinge, die sie in ihren Templates benötigen. Eine Bündelung in Modulen entfällt, und die Struktur der Anwendung wird vereinfacht.


## Standalone Components verwenden

> Die neuen Standalone Features funktionieren gleichermaßen für Komponenten, Pipes und Direktiven.
> Der Einfachheit halber gehen wir im Folgenden aber nur auf Komponenten ein.

Um eine Komponente, Pipe oder Direktive alleinstehend zu verwenden, setzen wir das passende Flag `standalone` im Decorator der Klasse:

```ts
@Component({
  selector: 'app-dashboard',
  standalone: true,
  // ...
})
export class DashboardComponent {}
```

Dadurch wird die Komponente unabhängig von einem Angular-Modul und kann alleinstehend genutzt werden.
Diese Einstellung können wir auch sofort beim Generieren der Komponente mit der Angular CLI angeben:

```bash
ng g component dashboard --standalone
```

Damit die Komponente nun tatsächlich genutzt werden kann, müssen wir sie dort importieren, wo sie benötigt wird.
Eine andere Standalone Component kann dafür in ihren Metadaten Imports definieren. Auf diese Weise erklärt die Komponente selbst, welche anderen Teile der Anwendung sie in ihrem Template verwenden möchte:

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
Außerdem entfällt die Deklaration in einem Modul.


## Kombination mit NgModules

Beim Design von Standalone Components wurde sehr viel Wert auf die Abwärtskompatibilität gelegt.
Standalone Components und NgModules können deshalb in Kombination genutzt werden.
Eine Standalone Component kann dafür auch unter `imports` in einem NgModule eingetragen, so als wäre sie ein eigenes Modul. (Tatsächlich besitzt die Komponente natürlich kein Modul, denn sie ist ja standalone.)
Sie ist dann in dem gesamten NgModule sichtbar und verwendbar:

```ts
@NgModule({
  imports: [
    // andere Module
    BrowserModule,
    AppRoutingModule,

    // Standalone Components
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
  // ...
  standalone: true,
  imports: [
    CommonModule,
    BooksSharedModule
  ]
})
export class DashboardComponent {}
```

Um mehrere Komponenten, Pipes und Direktiven gemeinsam einzubinden, können diese als Array exportiert und importiert werden.
Zum Beispiel kann eine Bibliothek all jene Direktiven zusammen exportieren, die auch gemeinsam genutzt werden sollen.
Auf diese Weise erhält man einen ähnlichen Komfort wie mit einem NgModule, das mehrere Dinge zur Nutzung bereitstellt.

```ts
export SHARED_THINGS = [BookComponent, IsbnPipe, ConfirmDirective];
```

```ts
@Component({
  // ...
  standalone: true,
  imports: [CommonModule, SHARED_THINGS]
})
export class DashboardComponent {}
```

## AppComponent direkt bootstrappen

Besteht die gesamte Anwendung nur aus Standalone Components ohne Module, können wir auch das globale `AppModule` entfernen.
Stattdessen wird direkt die Wurzelkomponente gebootstrappt, in der Regel die `AppComponent`.
In der Datei `main.ts` nutzen wir dazu die neue Funktion `bootstrapApplication()`:

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent)
  .catch(err => console.error(err));
```


## Providers in Modulen

> Für Services in der Anwendung werden in der Regel *Tree-Shakable Providers* verwendet, indem die Klasse mit `providedIn` markiert wird. Die folgenden Infos treffen nur auf Providers zu, die bisher direkt im `AppModule` unter `providers` angegeben wurden.

Neben Komponenten, Pipes und Direktiven können Module verschiedene Providers für die Dependency Injection bereitstellen.
Importiert man das Modul, sind die Provider mit an Bord.

An dieser Stelle wird es etwas komplizierter, denn auch Providers werden nun eigenständig behandelt.
Dafür können wir in der Funktion `bootstrapApplication()` ein Array von Providers angeben.
Das Ergebnis ist das gleiche, als hätten wir die Providers im `AppModule` hinterlegt.

```ts
bootstrapApplication(AppComponent, {
  providers: [
    { provide: MY_SETTING, useValue: 'my value' }
  ]
}).catch(err => console.error(err));
```

Importieren wir über den Decorator einer Komponente ein Modul, das Providers beinhaltet, so werden diese für die aktuelle und alle darunterliegenden Komponenten bereitgestellt.
Auch die Eigenschaft `providers` im `Component`-Decorator funktioniert weiterhin ohne Veränderungen, sollte aber bewusst eingesetzt werden.

Möchte man nur die Providers eines Moduls extrahieren und global bereitstellen, kann die neue Funktion `importProvidersFrom()` genutzt werden.
Die im Modul enthaltenen Komponenten, Pipes und Direktiven werden dabei ignoriert.
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
Auch bisher empfehlen wir, abgrenzbare fachliche Features in eigenen Modulen (oder sogar eigenen Bibliotheken) zu strukturieren, die im Dateisystem sauber voneinander getrennt sind.

Ohne Module ist diese Architekturidee weiterhin anwendbar:
Teile der Anwendung, die ein zusammenhängendes fachliches Feature sind, sollten in einem gemeinsamen Ordner untergebracht werden.
Diese Feature-Ordner oder -Bibliotheken sollten möglichst "flach" im Dateisystem strukturiert werden, also ohne eine tiefe Verschachtelung.

Für gemeinsam genutzte Teile war bisher immer ein `SharedModule` notwendig, das Komponenten, Pipes und Direktiven bereitstellt.
Werden diese Teile nun als Standalone deklariert, ist der tatsächliche Ort im Dateisystem unerheblich.
Entscheidend ist, wer welche Teile importiert.
Die gemeinsam genutzten Komponenten, Pipes und Direktiven sollten deshalb z. B. nach fachlichen Belangen in Unterordner gruppiert werden.

**Kurz: Die Ideen zur Ordnerstruktur der Anwendung bleiben erhalten, auch wenn Standalone Components genutzt werden.**


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

Wenn wir im Template einer Standalone-Komponente die Direktiven des Routers nutzen wollen, z. B. `RouterLink` oder `RouterOutlet`, müssen wir das `RouterModule` dort importieren.

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
Mit Modulen kann die Basisroute für Lazy loading wie folgt definiert werden. `loadChildren` verweist auf ein Feature-Modul:

```ts
// mit NgModule: loadChildren lädt ein Modul
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

// mit Standalone Components:
// loadChildren lädt ein Array von Routen
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

Prinzipiell funktioniert es also so, als würden wir die Komponente über `component` direkt in der Route angeben.
Trotzdem ist das Lazy Loading aktiv, sodass die Komponente erst beim Aktivieren der Route geladen wird.


## Fazit

Die neuen Standalone Features von Angular beseitigen den Overhead, der durch NgModules verursacht wurde.
Jede Komponente importiert genau die Dinge, die sie selbst in ihrem Template nutzen möchte.
Die Sichtbarkeit wird also nicht über die Zugehörigkeit zu einem Modul geregelt, sondern durch den Import.
Die Struktur der Anwendung wird dadurch leichter verständlich, weil das gesamte Wissen über die Abhängigkeiten in der Komponente liegt.

Das Angular-Team hat das Design der Standalone Features sehr sorgfältig abgewägt und diskutiert.
Dadurch integrieren sich Standalone Components nahtlos in eine bestehende Anwendung.
Es handelt sich weiterhin um normale Komponenten, Pipes und Direktiven – sie sind jetzt aber keinem Modul mehr zugeordnet.

Die neue Herangehensweise an die Angular-Entwicklung ist ein großer Bruch. Es wird einige Zeit dauern, bis sich die neuen Patterns und Architekturen etabliert haben.
NgModules werden noch so lange bestehen bleiben, bis die Standalone Features sicher in der Community angekommen sind.
Wir empfehlen Ihnen daher, nicht sofort alle bestehenden Anwendungen zu migrieren, sondern auch weiterhin auf NgModules zu setzen.
Für wiederverwendbare Komponenten lohnt es sich ggf., die Standalone Components auch jetzt schon auszuprobieren.


<hr>


<small>**Titelbild:** Photo by <a href="https://unsplash.com/@mourimoto">Mourizal Zativa</a> on <a href="https://unsplash.com">Unsplash</a> (edited)</small>
