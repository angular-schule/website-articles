---
title: 'Goodbye, ngClass und ngStyle!'
author: Ferdinand Malcher
mail: ferdinand@malcher.media
published: 2024-12-XX
lastModified: 2024-12-XX
keywords:
  - Angular
  - Attributdirektiven
  - Direktiven
  - ngClass
  - ngStyle
  - Deprecation
  - Property Binding
language: de
header: ngclass.jpg
---

Voraussichtlich in der Version 19.1 von Angular werden die Direktiven `ngClass` und `ngStyle` als *deprecated* markiert.
In diesem Blogpost erläutern wir die Hintergründe und die Migration.

## tl;dr

Die Direktiven `ngClass` und `ngStyle` werden als *deprecated*  markiert, siehe [Pull Request #58860](https://github.com/angular/angular/pull/58860).
Sie können in der Regel nahtlos mit Property Bindings auf die nativen Propertys `class` und `style` ersetzt werden:

```html
<!-- VORHER -->
<div [ngClass]="myClass"></div>
<div [ngClass]="myClasses"></div>
<div [ngClass]="{ foo: isFoo() }"></div>
<div [ngStyle]="{ color: 'red' }"></div>

<!-- NACHHER -->
<div [class]="myClass"></div>
<div [class]="myClasses"></div>
<div [class]="{ foo: isFoo() }"></div>
<div [style]="{ color: 'red' }"></div>
```

## Die Direktiven `ngClass` und `ngStyle`

Angular bietet seit jeher die beiden Attributdirektiven `ngClass` und `ngStyle` an.
Damit können wir CSS-Klassen bzw. CSS-Stile auf ein DOM-Element im Template anwenden.

Die Attribute `class` und `style` ermöglichen dies in HTML grundsätzlich mit *statischen* Werten:

```html
<h1 class="headline">Headline</h1>
<p style="font-size: 1em"></p>
```

Sollen CSS-Klassen und Stile dynamisch angewendet werden, z. B. aus Propertys der Komponentenklasse, helfen uns die beiden mitgelieferten Direktiven von Angular. In der letzten Zeile des folgenden Beispiels ist zu sehen, wie mehrere CSS-Klassen anhand von Bedingungen angewendet werden: *Die Klasse `danger` wird angewendet, wenn `isError()` den Wert `true` zurückgibt.* 

```html
<h1 [ngClass]="myHeadlineClass">Headline</h1>
<p [ngStyle]="{ 'font-size': myFontSize }"></p>

<div class="alert" [ngClass]="{ danger: isError(), success: !isError() }"></div>
```

Diese Direktiven werden mit Angular 19.1 als deprecated markiert und in einer späteren Version entfernt.
Was bedeutet das für die Templates unserer Angular-Anwendungen?

## Die Lösung: Property Bindings mit `[class]` und `[style]`

Mit Property Bindings können wir grundsätzlich auch alle nativen Propertys von DOM-Elementen beschreiben, darunter die Propertys `class` und `style`.
Diese Schreibweise ist schon immer möglich und ist in einer Sonderform als *Class Binding* bzw. *Style Binding* bekannt.
Damit können wir einzelne Klassen abhängig von einer Bedingung anwenden und Werte für CSS-Propertys schreiben:

```html
<p [style.font-size]="myFontSize"></p>

<div class="alert" [class.danger]="isError()" [class.success]="!isError()"></div>
```

Auch ohne diese Sonderform können wir `class` und `style` direkt mithilfe von Property Bindings abbilden.
Dabei funktionieren verschiedene Schreibweisen, die bisher auch mit `ngClass` und `ngStyle` möglich waren: als String, als Array von Strings oder als Objekt für Entscheidungen.

```html
<h1 [class]="myHeadlineClass">Headline</h1>
<h2 [class]="['foo', 'bar']">Headline mit mehreren Klassen</h2>
<p [style]="{ 'font-size': myFontSize }"></p>

<div [class]="{ alert: true, danger: isError(), success: !isError() }"></div>
```

In den meisten Fällen können die Direktiven `ngClass` und `ngStyle` also nahtlos durch Property Bindings mit `class` und `style` ersetzt werden.
Diese Migration ist mithilfe von *Suchen & Ersetzen* im Editor unkompliziert möglich.
Außerdem wird Angular wahrscheinlich ein Migrationsskript anbieten, um die Templates umzustellen.
Bitte vergessen Sie nicht, auch die Imports der Direktiven in der Komponentenklasse zu entfernen.

## Warum?

Da mit den nativen Mitteln von Browser und Angular alle notwendigen Bindings erstellt werden können, ist es nicht mehr zwingend notwendig, die Direktiven zu verwenden.
Zusätzliche Bausteine erschweren es nicht nur, Angular zu lernen, sondern: Die Größe des ausgelieferten JavaScript-Bundles wächst mit jeder zusätzlichen Direktive.

Wir haben die Templates unserer Website migriert und auf `ngClass` und `ngStyle` verzichtet. Die Ersparnis bei der Bundle-Größe betrug in diesem Szenario etwa 5 KB.

## Limitationen

Obwohl `[class]` und `[style]` ein direkter Ersatz für die Direktiven sind, funktionieren einige wenige Details anders:

- Es kann kein `Set` übergeben werden. Es wird empfohlen, stattdessen ein Array zu verwenden.
- In der Objektschreibweise konnte ein Schlüssel auch mehrere Klassen oder CSS-Propertys beinhalten: `[ngClass]="{ 'foo bar': isFoo() }"`. Diese Schreibweise ist mit dem nativen Binding nicht mehr möglich. Es wird empfohlen, die Klassen einzeln aufzuführen: `[class]="{ foo: isFoo(), bar: isFoo() }"`


## Fazit

Die Direktiven `ngClass` und `ngStyle` hatten lange ihre Berechtigung und waren ein wichtiges Werkzeug bei der Notation der HTML-Templates.
Inzwischen unterstützt Angular fast alle Schreibweisen aber auch mit Property Bindings auf die nativen DOM-Propertys `class` und `style`.
Wir empfehlen Ihnen also, auf die Direktiven zu verzichten und Property Bindings zu verwenden.
Wir begrüßen diesen Schritt sehr, die API-Oberfläche des Frameworks weiter zu verkleinern und unnötige Teile zu entfernen.