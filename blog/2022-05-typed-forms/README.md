---
title: Typed Reactive Forms
author: Ferdinand Malcher
mail: mail@fmalcher.de
published: 2022-05-19
last-change: 2022-05-18
keywords:
  - Angular
  - Angular 14
  - Reactive Forms
  - Typed Forms
language: de
thumbnail: ./typedforms.jpg
---

Mit Version 14 kommt ein lang erwartetes Feature in Angular an: typisierte Formulare!
Bisher waren die Modelle für Reactive Forms stets lose mit `any` typisiert -- das ändert sich nun.
In diesem Blogartikel stellen wir kurz die wichtigsten Eckpunkte vor.

## Untypisierte Formulare

Reactive Forms sind ein mächtiger Ansatz, um Formulare in Angular zu bauen.
In der Komponentenklasse bauen wir dazu ein Formularmodell aus den Bausteinen `FormControl`, `FormGroup` und `FormArray` auf.
Dieses Modell wird dann mithilfe von Direktiven mit dem Template verknüpft.

Ein Formularmodell kann zum Beispiel so definiert werden:

```ts
bookForm = new FormGroup({
    isbn: new FormControl(''),
    title: new FormControl(''),
    author: new FormControl('')
});
```

Über das Property `value` bzw. die Methode `getRawValue()` können wir den Wert des Formulars auslesen, um damit weiterzuarbeiten.
Das Problem: Dieser Wert ist mit `any` typisiert!

```ts
this.bookForm.value // any
this.bookForm.getRawValue() // any
```

Dadurch kann es schnell passieren, dass Fehler in den erfassten Daten auftreten, die erst zur Laufzeit der Anwendung überhaupt auffallen.

Das Angular-Team hat sich dieses Problems nun angenommen: Ab Angular 14 kann das Formularmodell korrekt typisiert werden.

## Typed Forms

Seit Angular 14 verwenden alle Bausteine von Reactive Forms die korrekten Typinformationen.
Der Typ wird anhand des Startwerts ermittelt, den wir im Konstruktor von `FormControl` angeben:

```ts
new FormControl('') // FormControl<string | null>
new FormControl(5) // FormControl<number | null>
```

Hier ist immer auch der Typ `null` inkludiert.
Der Hintergrund: Controls können mit der Methode `reset()` zurückgesetzt werden.
Gibt man dabei keinen neuen Startwert an, wird der Wert standardmäßig auf `null` gesetzt.
Um dieses aktuelle Verhalten nicht zu brechen, ist `null` im Typ immer enthalten.

Wir können diese Eigenschaft umgehen: Bei der Initialisierung des FormControls setzen wir dazu die neue Option `initialValueIsDefault`.
Das ändert das Reset-Verhalten des FormControls: Beim Zurücksetzen wird nicht `null` verwendet, sondern der ursprünglich definierte Startwert.
Damit entfällt der Typ `null` und das `FormControl` besitzt nur noch den Typ `string`:


```ts
new FormControl('', { initialValueIsDefault: true }) // FormControl<string>
```

Üblicherweise werden im zweiten Argument von `FormControl` die Validatoren notiert.
Möchte man die neue Option *und* Validatoren setzen, müssen diese mit in das Optionsobjekt aufgenommen werden:

```ts
new FormControl('', {
    validators: [
        Validators.required,
        Validators.maxLength(15)
    ],
    initialValueIsDefault: true
})
```

Falls der Typ eines einzelnen FormControls nicht automatisch inferiert werden kann, weil der Startwert auf `null` gesetzt wird, können wir mithilfe des generischen Typparameters nachhelfen:

```ts
new FormControl<string | null>(null) // FormControl<string | null>
```

Es ist zu erwarten, dass die Option `initialValueIsDefault` in einer späteren Version von Angular per Default auf `true` gesetzt wird, sodass für alle Controls standardmäßig der Startwert zum Reset verwendet wird (und nicht `null`).
Da es sich dabei allerdings um einen Breaking Change handelt, muss diese Änderung mit Vorsicht durchgeführt werden.

Entwickeln Sie ein Formular "auf der grünen Wiese", empfehlen wir Ihnen, die Option `initialValueIsDefault` für jedes Control auf `true` zu setzen.
Das vereinfacht die Arbeit mit den erzeugten Daten, weil die Typen den tatsächlichen Eingabewert widerspiegeln.

## FormGroup und FormArray

Kombinieren wir mehrere Controls in einer `FormGroup` oder in einem `FormArray` wird der zusammengesetzte Typ automatisch inferiert.
Die Methode `getRawValue()` liefert also ein Objekt mit dem erwarteten Typ:

```ts
bookForm = new FormGroup({
    isbn: new FormControl('', {
        initialValueIsDefault: true
    }),
    title: new FormControl(''),
    author: new FormControl('')
});

// Typ von bookForm.getRawValue()
{
    isbn: string;
    title: string | null;
    author: string | null;
}
```

Hier ist eine Einschränkung zu beachten: Das Property `value` und das Observable `valueChanges` geben nur die Werte der *aktivierten* Controls aus.
Da das Typsystem nicht bestimmen kann, ob ein Feld aktiviert ist oder nicht, ist der Typ hier stets mit `Partial` definiert.
Das bedeutet, dass alle Felder optional sind, also auch `undefined` inkludieren:

```ts
// Typ von bookForm.value
Partial<{
    isbn: string;
    title: string | null;
    author: string | null;
}>

// das entspricht:
{
    isbn?: string;
    titl?: string | null;
    author?: string | null;
}
```

Es ist übrigens empfehlenswert, die `FormGroup` immer direkt bei der Deklaration des Komponenten-Propertys zu initialisieren.
Ansonsten müssten wir den vollständigen Typ manuell hinter dem Property notieren.

## Controls abrufen mit `.get()`

Mit der Methode `get()` können wir in eine `FormGroup` "hinabsteigen" und ein Control abrufen.
Das funktioniert selbst mit zusammengesetzten Pfaden hervorragend -- *it's magic!*

```ts
const form = new FormGroup({
    title: new FormControl('', { initialValueIsDefault: true }),
    authors: new FormArray([
        new FormGroup({
            firstname: new FormControl(''),
            lastname: new FormControl(''),
        })
    ])
});
```

```ts
form.get('title')
// AbstractControl<string, string> | null

form.get('authors.0.firstname')
// AbstractControl<string | null, string | null> | null
```


## NonNullableFormBuilder verwenden

Wenn wir in einem komplexen Formular jedes Control mit der Option `initialValueIsDefault` versehen, wächst das Formularmodell stark an und wird unübersichtlich.

Um ohne viel Tipparbeit ein `FormControl` zu erzeugen, können wir deshalb den `FormBuilder` nutzen.
Diese Klasse bietet verschiedene Methoden an, um Formularmodelle schnell und kurz zu erzeugen.
Ab Angular 14 existiert eine zweite Variante: der `NonNullableFormBuilder`.

Damit können wir typisierte Controls erzeugen, in denen die Option `initialValueIsDefault` sofort auf `true` gesetzt ist.
Selbstverständlich können wir den `FormBuilder` und die selbst erzeugten Klasseninstanzen in unserem Formularmodell kombinieren:

```ts
import { NonNullableFormBuilder } from '@angular/forms';

bookForm = new FormGroup({
    isbn: new this.fb.control('', [
        Validators.required,
        Validators.maxLength(15)
    ]),
    title: this.fb.control(''),
    author: this.fb.control('')
});

constructor(private fb: NonNullableFormBuilder) {}
```



## Grenzen der Typisierung

Grundsätzlich gilt: In TypeScript können nur die Dinge typisiert werden, die zur Entwicklungszeit sicher bekannt sind.
Wenn wir ein dynamisches Formular entwickeln, dessen Struktur zur Laufzeit geändert wird, können wir uns nicht auf die Typisierung verlassen.

Die `FormGroup` ist daher in der neuen Variante strikt typisiert.
Wir können zur Laufzeit keine weiteren Controls hinzufügen oder durch andere Controls mit einem anderen Typ ersetzen:

```ts
bookForm = new FormGroup({
    isbn: new FormControl('')
});

bookForm.addControl('title', new FormControl('')) // FEHLER!
bookForm.setControl('isbn', new FormControl(5)) // FEHLER!
```

In diesem Fall müssen wir auf die untypisierte Variante `UntypedFormControl` (siehe unten) oder auf den neuen `FormRecord` zurückgreifen.

## Der neue Baustein `FormRecord`

Um das Problem mit `addControl()` in einer `FormGroup` zu lösen, wurde ein neuer Baustein `FormRecord` eingeführt.
Prinzipiell funktioniert dieses Objekt wie eine `FormGroup`, es besitzen jedoch alle Felder denselben Typ.
Das ist besonders dann sinnvoll, wenn Controls zur Laufzeit hinzugefügt oder entfernt werden sollen:

```ts
const checkboxGroup = new FormRecord({
    acceptAGB: new FormControl(false),
    acceptDSGVO: new FormControl(false),
    subscribeNewsletter: new FormControl(true)
});

checkboxGroup.addControl('acceptCOC', new FormControl(false)); // ✅
```

Bei der Typisierung des Values kommt TypeScript allerdings wieder an seine Grenzen: Die Namen/Keys der Felder können nicht statisch ermittelt werden und sind deshalb generisch mit `string` definiert:

```ts
{
    [key: string]: boolean | null;
}
```

Rufen wir also z. B. mit `get()` ein Control ab, kann der eingegebene Key nicht von TypeScript geprüft werden.


## Migration

Der Umstieg mit einem existierenden Formular auf die neue typisierte Variante ist unter Umständen nicht ganz trivial.
Deshalb werden alle Bausteine von Reactive Forms auch weiterhin mit ihrer alten, untypisierten Schnittstelle angeboten.

Wenn wir die Anwendung mithilfe von `ng update` auf Angular 14 migrieren, werden die Klassennamen automatich ersetzt:

* `FormControl` => `UntypedFormControl`
* `FormGroup` => `UntypedFormGroup`
* `FormArray` => `UntypedFormArray`

So kann die Migration auf typisierte Formulare schrittweise durchgeführt werden.
Komplexe Formulare mit dynamischen Strukturen können ggf. sogar gar nicht von der Typisierung profitieren und müssen mit den `Untyped`-Varianten bestehen bleiben.

Möchten Sie die einzelne Migration der Controls manuell anstoßen, ist der folgende Befehl hilfreich:

```bash
ng update @angular/core --migrate-only=migration-v14-typed-forms
```


## Fazit

Das Angular-Team hat einige lang ersehnte Wünsche der Community berücksichtigt und hat viel Zeit und Energie in neue Features gesteckt.
Die neuen typisierten Bausteine für Reactive Forms bringen ein neues Level an Typsicherheit in die Anwendung.
Aufwendige Prüfungen der Formularwerte zur Laufzeit können damit entfallen, und der Komfort für die Entwickelnden steigt.






<small>**Titelbild:** XXX</small>
