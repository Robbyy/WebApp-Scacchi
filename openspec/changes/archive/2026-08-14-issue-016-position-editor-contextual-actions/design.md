## Context

`VariantEditor` è condiviso fra Aperture e sezioni posizionali. R26.1 ha stabilizzato la board,
il pannello destro e la navigazione canonica, ma la schermata di modifica Mediogioco mostra ancora
cinque elementi non necessari al compito principale: breadcrumb cliccabile, kicker, comando
«Posizioni», toggle motore e label «posizione iniziale».

R26.2 deve correggere il contesto posizionale senza duplicare l'editor per R27 e senza alterare
le Aperture.

## Decisioni

### 1. Il contesto di fase decide la presentazione

Il componente userà il contesto già disponibile (`positionMode`/fase dello studio) per applicare
la variante posizionale. Non viene introdotto un nuovo flag persistito o un nuovo endpoint.

| Contesto | Breadcrumb | «Posizioni» | Kicker | Motore nell'editor | «Mosse & rami» | Label azioni |
|---|---|---|---|---|---|---|
| `OPENING` | comportamento esistente | comportamento esistente | esistente | comportamento esistente | comportamento esistente | esistente |
| `MIDDLEGAME`/`ENDGAME` in modifica | testo non cliccabile | assente | assente | assente | posizione del Motore | assente |

### 2. Il breadcrumb resta informativo

La struttura semantica `nav` resta disponibile per orientamento, ma in modifica posizionale gli
antenati e la pagina corrente sono testo non focalizzabile. Solo la voce della pagina corrente può
usare `aria-current="page"`; non si usa un link disabilitato e non si intercetta il click con
JavaScript.

### 3. L'albero è il primo blocco operativo

Nel pannello posizionale, dopo il nome, viene mostrata «Mosse & rami». Replay, contatore, ramo
corrente, azioni sui nodi, salvataggio e annullamento restano nello stesso pannello e nello stesso
ordine funzionale già validato, salvo il loro spostamento verticale dovuto alla rimozione dei
blocchi ridondanti. Il motore continua a essere disponibile nel dettaglio posizione secondo il
contratto R26.1; l'editor non lo espone.

### 4. Aperture e Finale

La condizione posizionale deve essere esplicita e testata. Aperture non cambia. Finale erediterà
la stessa configurazione quando R27 renderà attive le route `/endgame`; R27 dovrà comunque ripetere
la verifica con fixture `ENDGAME`.

### 5. Verifica e accessibilità

I test automatici controlleranno presenza/assenza dei nodi, ordine dei blocchi, payload invariati,
guard e regressione Aperture. La checklist browser controllerà tab order, assenza di focus sul
breadcrumb, sei viewport, nessun overflow e salvataggio/annullamento. Non si simulerà la geometria
con jsdom quando è richiesta una misura reale.

## Rischi e mitigazioni

- **Perdita di orientamento:** il breadcrumb resta visibile come testo e il titolo/route corrente
  rimane annunciabile.
- **Perdita di navigazione rapida tra posizioni:** è intenzionale in modifica; il flusso conserva
  Annulla, Salva e il ritorno al dettaglio. La consultazione resta il luogo della navigazione.
- **Regressione Aperture:** guard esplicito sulla fase/`positionMode`, test di rendering dedicato.
- **Motore percepito come rimosso dal prodotto:** la rimozione riguarda solo l'editor posizionale;
  il dettaglio mantiene il motore e R28 resta fuori scope.
- **R27 che assume il riuso:** matrice di accettazione ENDGAME obbligatoria, senza chiusura per
  semplice ereditarietà del componente.

## Piano di rollback

Nessuna migrazione. Il rollback è il ripristino dei template/stili del componente e non coinvolge
backend o dati.
