---
title: 'Mein experimenteller @Service()-Decorator für Angular'
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
language: de
header: service.jpg
---

Mit Angular 20 entfällt der Service-Suffix im neuen Style Guide.
Das sorgt zwar für kürzere Dateinamen, macht aber die Rolle der Klassen weniger offensichtlich.
Dieser Artikel zeigt ein **Gedankenexperiment**, bei dem ein eigener `@Service`-Decorator dieses Problem elegant löst.


## Angular 20: Der Service-Suffix ist weg

Die neue Major-Version von Angular bringt einige tiefgreifende Veränderungen mit sich.
So wurde der neue [Angular coding style guide](https://angular.dev/style-guide) für v20 stark überarbeitet und verschlankt.
Es wird *nicht* mehr empfohlen, Komponenten, Services und Direktiven mit einem Suffix zu versehen.

Der Befehl `ng generate service book-store` generiert demnach nicht mehr eine Klasse mit dem Namen `BookStoreService`, sondern vergibt nur noch den Namen `BookStore`.
Folgerichtig wird aus `book-store.service.ts` nun einfach nur `book-store.ts`.

Das ist prinzipiell eine tolle Sache.
Wir erhalten kürzere Dateinamen und mehr Fokus auf bewusste Benennung.
Aber einen kleinen Nachteil hat das Ganze:
Wir erkennen nicht mehr auf den ersten Blick, dass eine Klasse als Service genutzt werden soll.

**bis Angular 19:**

```ts
// book-store.service.ts

@Injectable({
  providedIn: 'root'
})
export class BookStoreService { }
```

**ab Angular 20:**

```ts
// book-store.ts

@Injectable({
  providedIn: 'root'
})
export class BookStore { }
```

Wer Angular bereits länger nutzt, weiß, dass der `@Injectable`-Decorator fast immer einen Service kennzeichnet.
Dennoch könnte der Einsatzzweck dieses Decorators sicherlich klarer kommuniziert werden.

In Spring beispielsweise ist `@Service` eine gängige Annotation, welche verdeutlicht, dass eine Klasse Service-Logik enthält.

```java
import org.springframework.stereotype.Service;

@Service
public class BookStoreService {
    // ...
}
```

Zusätzlich gibt es noch weitere Annotationen wie `@Repository`, `@Controller` oder `@Component`.
Ich finde es weiterhin sehr charmant, dass der Einsatzzweck schon am Anfang der Klasse eindeutig erkennbar ist.


## Die Motivation – Mein `@Service()`-Decorator für Angular

Was tun wir also, wenn wir auf das altbekannte `Service`-Suffix verzichten wollen
und trotzdem noch deutlich machen möchten, dass eine Klasse ein Service ist?

Mein Gedanke dazu: Warum führen wir nicht einfach einen eigenen Decorator namens `@Service()` ein?
Dann wäre direkt durch den Decorator ersichtlich, dass es sich bei der Klasse um einen Service handelt.
Und weil wir schon mal dabei sind, sparen wir uns auch gleich noch das immer gleiche `providedIn: 'root'`.

Wenn ich mir also eine Änderung am Angular-Framework wünschen könnte,
dann wäre es vielleicht folgende neue Syntax:

```ts
// book-store.ts

@Service()
export class BookStore { }
```

Folgende Verbesserungen stelle ich mir konkret vor:

1. Wir verzichten weiterhin auf das Suffix `Service`.
2. Wir müssen nicht mehr bei jedem Service erneut `providedIn: 'root'` schreiben. Das hat mich schon immer gestört.


## Das Ziel: Kompakter, klarer und weniger Boilerplate-Code

Mein Ziel ist demnach ein eleganterer Decorator, der:

* auf einen Blick klarstellt, dass es sich bei der Klasse um einen Service handelt,
* automatisch die Bereitstellung im Root-Injector übernimmt (`providedIn: 'root'`),
* vollständig kompatibel mit dem AOT-Compiler und Ivy ist.

Um es kurz zu sagen: Ein Decorator, der eine möglichst kompakte Syntax hat mir persönlich Freude bereitet. 😇


## Welche Ansätze gibt es überhaupt?

Die Entwicklung eines solchen eigenen Decorators ist leider nicht komplett trivial, vor allem, da Angular intern sehr genau festlegt, wie DI funktioniert.
Schauen wir uns ein paar mögliche Ansätze gemeinsam an:


### Idee 1: Vererbung von `@Injectable`

Ein logischer Gedanke wäre, eine Basisklasse mit `@Injectable()` zu annotieren und Services daraus abzuleiten:

```ts
@Injectable({ 
  providedIn: 'root' 
})
export class BaseService {}

export class BookStore extends BaseService {}
```

Das funktioniert allerdings nicht, da Angular die Metadaten zur Compile-Zeit direkt an der Zielklasse speichert.
Diese Metadaten werden leider nicht vererbt.
Das Framework findet den Service einfach nicht, und wir erhalten die folgende Fehlermeldung:

> **❌ Fehlermeldung:** NullInjectorError: No provider for BookStore!

Abgesehen davon, dass diese Lösung technisch nicht funktioniert, erfüllt sie auch nicht unser Ziel, einen echten Decorator zu erstellen.
Ziel verfehlt!


## Idee 2: Eigener Decorator, der `@Injectable` wrappt

Eine zweite Idee wäre es, einen einfachen Wrapper zu erstellen:

```ts
export function Service(): ClassDecorator {
  return Injectable({ providedIn: 'root' });
}
```

Diese Variante funktioniert nur im JIT-Modus (Just-in-Time). 
Angulars AOT-Compiler unterstützt dieses dynamische Vorgehen leider nicht.

> **❌ Fehlermeldung:** The injectable 'BookStore2' needs to be compiled using the JIT compiler, but '@angular/compiler' is not available.
> JIT compilation is discouraged for production use-cases! Consider using AOT mode instead.
> Alternatively, the JIT compiler should be loaded by bootstrapping using '@angular/platform-browser-dynamic' or '@angular/platform-server',
  or manually provide the compiler with 'import "@angular/compiler";' before bootstrapping.



## Idee 3: Nutzung interner Angular-Ivy-APIs

Die bisherigen Ansätze haben nicht funktioniert. Jetzt schauen wir uns die internen Ivy-APIs an.
Das sind Mechanismen, die Angular selbst zur Bereitstellung von Services nutzt. 
**Wichtig: An dieser Stelle bewegen wir uns bewusst auf experimentelles Terrain!** 
Wir greifen auf eine intern genutzte, aber nicht offiziell bereitgestellte Angular-API zurück.
Dieser Ansatz eignet sich daher eher als Experiment denn als Empfehlung für produktiven Code.

Die zentrale interne API, die für uns interessant ist, heißt [`ɵɵdefineInjectable`](https://github.com/angular/angular/blob/a40abf09f1abcabda3752ed915bb90e4eafe078d/packages/core/src/di/interface/defs.ts#L167).
Diese Funktion erstellt für eine Klasse die nötigen Metadaten, sodass Angular sie automatisch injizieren kann.
Im verlinkten Code finden sich auch Hinweise zur Verwendung: (**This should be assigned to a static `ɵprov` field on a type, which will then be an `InjectableType`.**)

### Minimalversion ohne Konstruktor-Injection

Beginnen wir mit einem minimalistischen Ansatz, der sehr einfach ist, aber auch eine klare Einschränkung mit sich bringt:

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

Was macht dieser Code?

* Wir erzeugen mit `ɵɵdefineInjectable` eine "injectable definition" und setzen diese direkt als neues Property an das `target`.
* Die Einstellung `providedIn: 'root'` sorgt dafür, dass der Service global verfügbar ist, ohne dass wir das immer wiederholen müssen.
* Die Factory-Funktion erzeugt einfach eine neue Instanz der Klasse – **aber ohne Konstruktor-Abhängigkeiten**.

Der große Vorteil dieses Ansatzes ist seine Einfachheit. 
Allerdings wissen wir zur Laufzeit schlicht nicht, welche Abhängigkeiten der Konstruktor erwartet. 
Wir haben den Konstruktor daher notgedrungen ohne Argumente aufgerufen.
Der große Nachteil besteht somit darin, dass generische Konstruktor-Injection nicht möglich ist.

Das folgende Beispiel macht dies deutlich.
Wir erwarten, das der Service `BookRating` per Konstruktor-Injection verfügbar gemacht wird.
Stattdessen ist der Wert aber einfach nur `undefined`.

```ts
@Service()
export class BookStore {

  constructor(br: BookRating) {
    console.log(br) // undefined
  }
}
```

Diese Variante eignet sich also ausschließlich für Services ohne Konstruktor-Abhängigkeiten.


### Gregors Variante: Konstruktor-Injection mit expliziten Abhängigkeiten

An dieser Stelle habe ich bei meinen Recherchen festgestellt, dass mein geschätzter GDE-Kollege Gregor Woiwode sich bereits vor 5 Jahren mit dem Thema beschäftigt hat.
[Seine Lösung](https://stackoverflow.com/a/59759381) hat er auf StackOverflow vorgestellt.
Sein Decorator heißt `@InjectableEnhanced` und hat prinzipiell die gleiche Zielsetzung wie dieser Artikel.

Gregor hat bereits damals demonstriert, wie man die fehlende Konstruktor-Injection nachbilden kann. 
Dabei nutzt er ebenfalls dieselbe API wie zuvor, definiert aber explizit alle Abhängigkeiten innerhalb der Factory-Funktion:

```ts
// Gregor's Code, minimal abgewandelt:

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

Was passiert hier genau?

* Gregor definiert nicht nur `ɵprov`, sondern explizit auch `ɵfac` (die Factory), die normalerweise automatisch vom Angular-Compiler erzeugt wird. 
  Er verhindert zudem, dass jemand die Klasse direkt instanziieren kann. Der Code verhindert dies mit einer frühen Exception.
  Wer Bedenken hat, dass jemand die dekorierten Service manuell instanziiert, kann diese Prüfung gerne beibehalten.
* Innerhalb der Factory-Funktion injiziert der Code explizit jede Abhängigkeit einzeln mittels `ɵɵinject`. 
  In diesem Fall handelt es sich um unseren Service `BookRating`.
  Dadurch unterstützt er direkte Konstruktor-Injection.
* Aber Achtung: Wir müssen jede Abhängigkeit einzeln und explizit in der Factory-Funktion angeben!
  Das ist aufwändig und anfällig für Fehler, falls sich die Konstruktorparameter ändern.

Der Code lässt sich auch so umschreiben, sodass er dem vorherigen Beispiel entspricht.
Statt der direkten Zuweisung `((target as any).ɵprov)`, würde ich eher `Object.defineProperty() ` verwenden.
Dieser Stil ist zwar etwas ausführlicher, dafür umgehen wir aber nicht mehr das Typsystem per Cast auf `any`.
Die Fehlermeldung habe ich dabei auch weggelassen:

```ts
// Gregors Code, gekürzt und angepasst:

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

Dieser Ansatz ist technisch geschickt gelöst, hat aber eine klare Einschränkung: 
Er ist nicht generisch genug für alle Fälle.
Für jeden einzelnen Service müssen wir manuell die Abhängigkeiten auflisten.
Gregors Lösung funktioniert somit perfekt für spezielle Fälle mit wenigen oder immer denselben Abhängigkeiten.


## Idee 4: Automatische Dependency-Auflösung mit reflect-metadata

Um Konstruktor-Injectionen ohne manuelle Angabe von Abhängigkeiten zu ermöglichen, 
könnten wir die Bibliothek [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) nutzen. 
Dies erfordert die Aktivierung von `emitDecoratorMetadata: true` in der `tsconfig.json` und die Einbindung von `reflect-metadata` als zusätzliche Abhängigkeit.

In früheren Angular-Versionen war `reflect-metadata` oft notwendig, da der JIT-Compiler Metadaten zur Laufzeit auswertete. 
Mit Ivy (ab Angular 9) und AOT-Compilation generiert Angular statische Metadaten während der Build-Zeit, 
wodurch `reflect-metadata` in Produktionsumgebungen meist überflüssig ist. 

Die Verwendung dieser Bibliothek erhöht unnötig die Bundle-Größe, was moderne Angular-Projekte vermeiden sollten.
Ich habe diesen Ansatz daher nicht weiter verfolgt, `reflect-metadata` möchte ich nicht wieder als Abhängigkeit in meinem Projekt sehen. 


### Idee 5: Die finale Idee: Dependency Injection mit `inject()`

Können wir es nicht einfacher haben, und zwar ohne jegliche manuelle Angabe der Konstruktor-Abhängigkeiten?
Genau an dieser Stelle kommt die neue Angular-Funktion `inject()` ins Spiel (die es 2020 noch nicht gab).

Mit `inject()` lassen sich Abhängigkeiten direkt innerhalb der Klassendefinition beziehen, ohne sie über den Konstruktor zu injizieren. 
Dadurch entfallen all unsere bisherigen Probleme:

```ts
// derselbe Code erneut, aus dem vorherigen Beispiel von Idee 3
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

So sieht die Verwendung dann aus:

```ts

@Service()
export class BookStore {

  #service = inject(BookRating); // Abhängigkeit direkt injiziert
}
```

Hier ein weiteres Beispiel:

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

Klingt doch elegant – zumindest für unser kleines Experiment!


### Fazit und abschließende Gedanken

Wir haben nun mehrere Varianten für einen eigenen `@Service()`-Decorator betrachtet und dabei folgende Möglichkeiten kennengelernt:

1. **Minimalversion ohne Konstruktor-Injection:**
   Ein einfacher Ansatz, aber für viele reale Situationen zu stark eingeschränkt.

2. **Gregors Variante aus dem Jahr 2020 mit expliziter Konstruktor-Injection:**
   Technisch interessant und zeigt deutlich, wie Dependency Injection unter Ivy funktioniert. 
   In der Praxis ist dieser Ansatz allerdings nur für spezielle Fälle geeignet, da jede Abhängigkeit einzeln aufgeführt werden muss. 
   Das macht den Ansatz weniger wartbar.

3. **Automatische Dependency-Auflösung via `reflect-metadata`:**
   Bequem und generisch, aber die zusätzliche Abhängigkeit von `reflect-metadata` erhöht unnötig die Bundle-Größe und passt nicht mehr in moderne Ivy-basierte Angular-Projekte.

4. **Moderner Ansatz: Dependency Injection mit `inject()`:**
   Dieser Ansatz nutzt die Möglichkeiten der neuen Angular-API `inject()`. 
   Konstruktor-Injection ist dabei weiterhin nicht möglich, wird aber auch nicht mehr zwingend benötigt. 
   Diese finale Idee mit dem Einsatz von `inject()` gefällt mir persönlich gut.

Aber sollten wir diesen Decorator nun wirklich einsetzen?

Letztlich ist dieser Decorator, wie eingangs erwähnt, ein **Gedankenexperiment**.
Es ist spannend und lehrreich, interne Angular-APIs auf diese Weise zu erkunden, jedoch sollten wir im produktiven Kontext Vorsicht walten lassen:

* **Nutzung interner APIs:**
  Die verwendeten Ivy-APIs (`ɵɵdefineInjectable`, `ɵɵinject`) sind nicht offiziell dokumentiert und könnten sich in zukünftigen Angular-Versionen ändern. 
  Dies birgt ein erhebliches Risiko, dass der Code irgendwann nicht mehr funktioniert oder aufwändig angepasst werden muss.

* **Wartbarkeit und Verständnis im Team:**
  Ein selbst geschriebener Decorator wirkt vielleicht zunächst elegant, doch jedes neue Teammitglied müsste erst lernen, warum im Projekt ein "magischer" Decorator verwendet wird und wie genau dieser funktioniert.

* **Geringer Mehrwert vs. Risiko:**
  Der einzige Gewinn dieses Decorators ist eine leichte Verbesserung der Lesbarkeit und minimal weniger Boilerplate-Code.
  Demgegenüber steht jedoch das erwähnte Risiko und der Aufwand zur Pflege.

Aus diesen Gründen würde ich in produktivem Angular-Code wahrscheinlich weiterhin den bewährten `@Injectable()`-Decorator einsetzen.
Die offizielle Angular-API garantiert uns Stabilität, Wartbarkeit und Zukunftssicherheit.


**Was meinst du dazu?**

Wie findest du diesen experimentellen `@Service()`-Decorator?
Würdest du ein solches Konstrukt dennoch einmal ausprobieren, oder bleibst du wie ich lieber beim bewährten `@Injectable()`? …oder sollte ich doch alles auf `@Service()` umstellen? 😅

Ich freue mich auf dein Feedback auf X oder BlueSky! 😊