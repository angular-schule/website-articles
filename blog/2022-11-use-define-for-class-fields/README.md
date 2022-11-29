---
title: 'TypeScript: useDefineForClassFields – zukünftige Breaking Changes vermeiden'
author: Johannes Hoppe und Ferdinand Malcher
mail: team@angular.schule
published: 2022-11-25
lastModified: 2022-11-25
keywords:
  - Angular
  - JavaScript
  - ECMAScript
  - TypeScript
  - ES2022
  - Klassen-Propertys
  - useDefineForClassFields
language: de
thumbnail: usedefineforclassfields.jpg
sticky: false
---


Wussten Sie bereits, dass Propertys in JavaScript und TypeScript leicht unterschiedlich implementiert sind und es ein inkompatibles Verhalten gibt?
In Projekten mit Angular 15 wird deshalb in der TypeScript-Konfiguration die Option `useDefineForClassFields` gesetzt.
Wir zeigen Ihnen, was es damit auf sich hat und wie Sie Ihren Code schreiben müssen, damit er zukunftssicher in beiden Programmiersprachen gleich funktioniert.


## Inhalt

* [Propertys initialisieren mit TypeScript](/blog/2022-11-use-define-for-class-fields#propertys-initialisieren-mit-typescript)
* [Das proprietäre Verhalten von TypeScript](/blog/2022-11-use-define-for-class-fields#das-proprietäre-verhalten-von-typescript)
* [Propertys zukunftssicher initialisieren](/blog/2022-11-use-define-for-class-fields#propertys-zukunftssicher-initialisieren)
* [Auswirkungen auf bestehenden Angular-Code](/blog/2022-11-use-define-for-class-fields#auswirkungen-auf-bestehenden-angular-code)


## Propertys initialisieren mit TypeScript

Bei der Arbeit mit Angular initialisieren wir regelmäßig Propertys in unseren Klassen.
Ein Klassen-Property kann z. B. direkt bei der Deklaration mit einem Wert initialisiert werden.
Außerdem gibt es eine Kurzschreibweise, mit der wir Propertys über den Konstruktor automatisch deklarieren können. 
Diese Kurzform verwendet man in Angular, um Abhängigkeiten mittels Dependency Injection anzufordern.

```ts
class User {
  // direkte Initialisierung
  age = 25;

  // Kurzform
  constructor(private currentYear: number) {}
}
```

## Das proprietäre Verhalten von TypeScript


Diese beiden zuvor gezeigten Schreibweisen sind proprietäre Features von TypeScript und existieren schon seit den frühesten Versionen der Sprache.
Die Programmiersprache JavaScript bzw. der Standard ECMAScript unterstützte damals solche Klassen-Propertys nicht vollständig, da die Standardisierung noch nicht abgeschlossen war.
Beim Design der Propertys von TypeScript ging man nach bestem Wissen und Gewissen davon aus, dass die gewählte Implementierung exakt das Verhalten einer zukünftigen Version von JavaScript nachahmen würde.
Das hat leider nicht ganz funktioniert – die Standardisierung in ECMAScript ist über die Jahre einen anderen Weg gegangen.

Die originalen Klassen-Propertys von TypeScript sind so implementiert, dass die Initialisierung mit Werten immer als erste Anweisung im Konstruktor durchgeführt wird.
Die beiden folgenden Schreibweisen waren bislang im Ergebnis absolut identisch:

```ts
class User {
  age = 25;
}

// ist in TypeScript exakt das gleiche wie:
class User {
  age: number;

  constructor() {
    this.age = 25;
  }
}
```

In JavaScript verhalten sich die nativen Klassen-Propertys leider etwas anders:
Es ist möglich, zunächst die Propertys zu initialisieren und erst *danach* den Konstruktor auszuführen.
Es handelt sich in JavaScript also um zwei voneinander unabhängige Schritte – bei der proprietären Implementierung von TypeScript geschieht die Initialisierung der Propertys hingegen immer zusammen mit dem Aufruf des Konstruktors.

Diese Diskrepanz zwischen TypeScript und JavaScript ist sehr unschön, da TypeScript als Obermenge so weit wie möglich mit JavaScript kompatibel bleiben sollte.
Um die beiden Programmiersprachen wieder einander anzugleichen, hat das TypeScript-Team den Schalter `useDefineForClassFields` eingeführt.
Sobald das Target von TypeScript auf `ES2022` gesetzt wird, steht diese Option standardmäßig auf `true`.
Es wird dadurch im Kompilat die native Implementierung von JavaScript verwendet, und die Propertys verhalten sich im Detail leicht anders als zuvor.
Der folgende Code hat – je nach Einstellung – zwei unterschiedliche Ausgaben:

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

Mit dem alten proprietären Verhalten von TypeScript (`useDefineForClassFields: false`) wird ein Alter von `25` berechnet, sofern man den Konstruktor der Klasse mit dem Wert `2023` aufruft.
Der Code hat den folgenden Ablauf:

1. Der Konstruktor wird mit dem aktuellen Jahr aufgerufen.
2. Der Wert für das aktuelle Jahr wird dem Property `currentYear` zugewiesen.
3. Anschließend wird das Property `age` initialisiert, wobei zur Berechnung alle Werte zur Verfügung stehen.
4. Auf der Konsole erscheint: `Current age: 25`.

Setzen wir die Option `useDefineForClassFields` in der Datei `tsconfig.json` hingegen auf `true`, erhalten wir als Ergebnis `NaN`, was für `Not a Number` steht.
Der Code folgt dann einem anderen Ablauf:

1. Das Property `age` wird als Erstes initialisiert, wobei zur Berechnung nicht alle Werte zur Verfügung stehen: Zu diesem Zeitpunkt ist das Property `currentYear` noch `undefined`, sodass die Subtraktion kein gültiges Ergebnis liefern kann.
2. Anschließend wird der Konstruktor mit dem aktuellen Jahr aufgerufen.
3. Der Wert wird dem Property `currentYear` zugewiesen.
4. Auf der Konsole erscheint: `Current age: NaN`.

Sie können das unterschiedliche Verhalten in diesem Stackblitz-Beispiel gerne selbst nachvollziehen:  
**[👉 Demo auf Stackblitz: useDefineForClassFields](https://stackblitz.com/edit/angular-buch-usedefineforclassfields?file=src%2Fapp%2Fapp.component.ts,tsconfig.json)**


## Propertys zukunftssicher initialisieren

Den zuvor gezeigten Quelltext wollen wir verbessern, sodass er unabhängig von der jeweiligen Einstellung funktioniert.
Dazu führen wir die Initialisierung des Propertys explizit als erste Zeile im Konstruktor durch:

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

Durch diese Schreibweise ist es egal, ob das proprietäre Verhalten von TypeScript oder das standardisierte Verhalten von JavaScript aktiv ist.
Es wird immer das korrekte Ergebnis angezeigt.

Natürlich führt man in realen Projekten eher selten Arithmetik über Propertys durch.
Im Entwicklungsalltag mit Angular ist vor allem dann Vorsicht geboten, wenn wir einen Service innerhalb der Property-Initialisierung verwenden wollen.
Diese Schreibweise birgt die Gefahr, zukünftig nicht mehr zu funktionieren:


```ts
// ⚠️ ACHTUNG: Dieser Code ist nicht zukunftssicher! ⚠️

@Component({ /* ... */ })
export class MyComponent {
  // this.myService könnte undefined sein!
  data = this.myService.getData();

  constructor(private myService: MyDataService) { }
}
```

Um das Problem zu umgehen, sollten wir die Initialisierung grundsätzlich im Konstruktor durchführen.
So ist unser Code zukunftssicher:

```ts
@Component({ /* ... */ })
export class MyComponent {
  data: Data;

  constructor(private myService: MyDataService) {
    this.data = this.myService.getData();
  }
}
```

Alternativ ist es möglich, die Abhängigkeit gar nicht über den Konstruktor anzufordern, sondern die Funktion `inject()` einzusetzen, mit der man ebenso Dependency Injection durchführen kann.
Benötigen wir die Serviceinstanz mehrfach, können wir die angeforderte Abhängigkeit in einem Property ablegen und von überall in der Klasse aus verwenden.


```ts
import { inject } from '@angular/core';

@Component({ /* ... */ })
export class MyComponent {
  data = inject(MyDataService).getData();
  otherService = inject(MyOtherService);
}
```

> **Tipp:** Wenn wir bei der direkten Initialisierung von Propertys auf injizierte Services zugreifen wollen, sollten wir
>* die Initialisierung im Konstruktor durchführen oder
>* die Funktion `inject()` verwenden.


## Auswirkungen auf bestehenden Angular-Code


Die gewählte Einstellung für `useDefineForClassFields` hat eine große Tragweite.
Würde man den Schalter bei bestehenden Angular-Projekten in der Standardeinstellung belassen, so würde es mit sehr hoher Wahrscheinlichkeit an vielen Stellen zu Fehlern kommen.
Daher hat das Angular-Team sowohl für bestehende als auch für neue Projekte die Einstellung mit Angular 15 explizit deaktiviert.
In der Datei `tsconfig.json` finden wir dazu die folgenden Angaben:

```json
{
  "compilerOptions": {
    // ...
    "useDefineForClassFields": false,
    "target": "ES2022"
  }
}
```
Das seit vielen Jahren bekannte proprietäre Verhalten bleibt also vorerst bestehen.

Üblicherweise folgt Angular aber den Empfehlungen und Vorgaben von TypeScript.
So wurden z. B. in der Vergangenheit die strikten Typprüfungen für neue Projekte standardmäßig aktiviert.
Es ist davon auszugehen, dass in Angular irgendwann einmal die Einstellung `useDefineForClassFields` auf den Standardwert `true` gesetzt wird.
Wir empfehlen Ihnen also, Ihren Code jetzt schon möglichst robust zu entwickeln und bereits heute die Einstellung von `useDefineForClassFields` auf `true` zu setzen.
Sollte in Zukunft die Standardeinstellung für geändert werden, so sind Sie dann von keinem Breaking Change betroffen!

## Neue Auflage des Angular-Buchs

Wir haben in den letzten Monaten intensiv an einer Neuauflage des deutschsprachigen Angular-Buchs gearbeitet!
Natürlich haben wir vorsorglich alle Quelltexte im Angular-Buch so geschrieben, dass sie bereits zukunftssicher funktionieren. 
Die Inhalte dieses Blogposts haben wir aus unserem Buch übernommen.
Wenn Sie diesen Text hilfreich fanden, dann sollten Sie unbedingt das neue [Angular-Buch vorbestellen](https://amzn.eu/d/8fgTIWL).

<div style="text-align: center">
<img src="https://angular-buch.com/assets/img/book-cover-multiple-v4.png" alt="Buchcover 4. Auflage" style="max-width:500px">
</div>



<hr>

<small>**Titelbild:** Mols Bjerge Nationalpark, Dänemark, 2022. Foto von Ferdinand Malcher</small>
