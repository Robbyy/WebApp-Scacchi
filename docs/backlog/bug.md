# Bug

> Difetti di funzionalità o resa di feature **già esistenti**. Ogni scheda è in formato
> **pronto-ticket GitHub** (titolo, label, passi, atteso vs attuale): quando si aprirà
> la gestione a ticket basterà copiarla in una issue.
> Indice e classificazione: [`../backlog.md`](../backlog.md). ID `ISSUE-0NN` stabili.

| ID | Titolo | Severità | Area |
|----|--------|:--------:|------|
| 001 | Layout `/play` errato su Full HD | Media | frontend |
| 002 | Pulsanti motore fuori viewport (dettaglio variante) | Media | frontend |
| 003 | Header home: titolo e pulsanti vanno a capo | Bassa | frontend |
| 004 | Nessun suono sulla prima mossa dopo ritorno focus | Bassa-media | audio |
| 005 | Nessun suono per le mosse del computer | Bassa-media | audio |
| 006 | Badge "Misto": testo illeggibile sulla metà scura | Bassa | frontend |
| 020 | Allenamento: sotto-varianti annidate mai proposte | Media-alta | training |

---

## ISSUE-001 — Layout `/play` errato su Full HD
**Label:** `bug` · `frontend` · `severità:media`
**Area:** pagina `/play` (gioca contro il computer).
**Descrizione:** il layout della pagina è rotto a schermo intero: la scacchiera occupa
quasi tutta la larghezza, il titolo "STOCKFISH / Gioca contro il computer" sta sopra la
board e la spinge oltre l'altezza visibile, i pulsanti di controllo finiscono sotto la
board e il pannello destro è tagliato fuori a destra.
**Passi per riprodurre:** aprire `/play` su 1920×1080 con finestra massimizzata.
**Atteso:** layout a due colonne come nel dettaglio variante — board a sinistra; colonna
destra con titolo, heading, pulsanti di controllo (ricomincia, ecc.) e info partita;
nessun testo sopra/sotto la board; nessuna scrollbar verticale; pannello destro
interamente visibile e allineato alla board.
**Attuale:** scrollbar verticale; pulsanti sotto la board illeggibili/irraggiungibili;
pannello destro praticamente invisibile.
**Note tecniche:** stesso pattern "2 colonne" di ISSUE-002 (conviene coordinarli).
Enumerare i pulsanti reali leggendo il componente `play`.

## ISSUE-002 — Pulsanti motore fuori viewport (dettaglio variante)
**Label:** `bug` · `frontend` · `severità:media`
**Area:** dettaglio variante `/variants/:id`.
**Descrizione:** i due pulsanti sotto la scacchiera ("♦ Motore" e "Gioca contro il
computer") spingono il layout oltre l'altezza visibile e attivano la scrollbar verticale.
**Passi per riprodurre:** aprire un `/variants/:id` su 1920×1080 con finestra massimizzata.
**Atteso:** i due pulsanti nel pannello laterale destro (dove già stanno "Modifica
variante", "Torna allo studio" e i controlli replay); board e pannello entrambi visibili
senza scrollbar verticale.
**Attuale:** scrollbar verticale dovuta ai pulsanti sotto la board.
**Note tecniche:** coordinare con ISSUE-010 (stessa pagina, layout a 3 colonne) e con il
pattern 2-col di ISSUE-001.

## ISSUE-003 — Header home: titolo e pulsanti vanno a capo
**Label:** `bug` · `frontend` · `severità:bassa`
**Area:** home studi `/`.
**Descrizione:** nell'header, il titolo "I tuoi studi" va a capo su due righe e i pulsanti
("Ripeti oggi", "Importa da Lichess", "Nuovo studio") scendono sotto il titolo invece di
restare sulla stessa riga.
**Passi per riprodurre:** aprire `/` a Full HD con finestra massimizzata.
**Atteso:** titolo a sinistra e pulsanti a destra sulla stessa riga (flex-row che non
collassa); il wrap è accettabile solo su viewport stretta.
**Attuale:** titolo spezzato e pulsanti a capo anche con spazio orizzontale abbondante.
**Note tecniche:** stessa home di ISSUE-009 e ISSUE-011 (coordinare).

## ISSUE-004 — Nessun suono sulla prima mossa dopo ritorno focus
**Label:** `bug` · `audio` · `severità:bassa-media`
**Area:** tutte le pagine con suono di mossa (sistema audio).
**Descrizione:** dopo aver minimizzato il browser (o cambiato finestra) e poi essere
tornati alla webapp, la prima mossa eseguita non emette suono; le successive sì.
**Passi per riprodurre:** minimizzare il browser → ripristinarlo → eseguire una mossa.
**Atteso:** anche la prima mossa dopo il ritorno del focus emette suono (nel rispetto del
toggle suono), senza interazioni aggiuntive dell'utente.
**Attuale:** la prima mossa è muta.
**Causa probabile:** i browser sospendono l'`AudioContext` quando la pagina perde il
focus; al ritorno è in stato `suspended` e la prima riproduzione fallisce silenziosamente.
**Note tecniche:** nel `MoveSoundService`, intercettare `visibilitychange`/`focus` e
chiamare `AudioContext.resume()` in anticipo, oppure `resume()` prima di ogni
riproduzione. Stesso servizio di ISSUE-005. Test automatico difficile in headless.

## ISSUE-005 — Nessun suono per le mosse del computer
**Label:** `bug` · `audio` · `severità:bassa-media`
**Area:** pagina `/play`.
**Descrizione:** giocando contro il computer, le mosse dell'utente suonano ma le risposte
del motore Stockfish no.
**Passi per riprodurre:** aprire `/play`, eseguire una mossa e attendere la risposta del
motore.
**Atteso:** la mossa del motore emette il suono di mossa, nel rispetto del toggle globale
(se off, nessuno suona).
**Attuale:** la mossa del motore è muta.
**Note tecniche:** stesso `MoveSoundService` di ISSUE-004; vive in `/play` (ISSUE-001).

## ISSUE-006 — Badge "Misto": testo illeggibile sulla metà scura
**Label:** `bug` · `frontend` · `accessibilità` · `severità:bassa`
**Area:** ovunque appaia il badge colore (home studi, dettaglio studio, dettaglio variante).
**Descrizione:** il badge "Misto" è diviso in due metà (chiara e scura); la scritta è
scura su tutta la larghezza e risulta illeggibile sulla metà scura (contrasto scarso).
**Passi per riprodurre:** visualizzare un badge "Misto".
**Atteso:** sulla metà scura il testo usa lo **stesso colore dello sfondo della metà
chiara** (coerenza cromatica), leggibile su entrambe le metà.
**Attuale:** testo scuro su sfondo scuro nella metà destra.
**Note tecniche:** correzione solo del colore del testo nella zona scura; struttura del
badge invariata.

## ISSUE-020 — Allenamento: sotto-varianti annidate mai proposte
**Label:** `bug` · `frontend` · `training` · `severità:media-alta`
**Area:** allenamento variante ("Allena questa variante"), es. `/variants/293`.
**Descrizione:** durante l'allenamento, una linea **memorizzata nell'albero** non viene
**mai** proposta se è una sotto-variante annidata dentro un'altra sotto-variante. Le linee
di primo livello vengono invece proposte.
**Passi per riprodurre:** allenare `/variants/293` (PGN sotto) e verificare che la linea di
matto `11…Nxa1 12.Qd5+ Ke7 13.Qxe5+ Kd7 14.Qe6#` non viene mai proposta.
**Atteso:** ogni linea presente nell'albero, **a qualunque profondità di annidamento**, è
proponibile durante l'allenamento (coerente col "supporto rami multipli" dichiarato).
**Attuale:** le sotto-varianti annidate (profondità ≥ 2) non vengono proposte.
**Pinpoint strutturale:** la linea mancante è una **sideline di una sideline** —
`11…Nxa1…` è sideline di `11…c6`, che è dentro la sideline `9…Nxc2` della mainline `9…c6`.
**Ipotesi (da verificare):** la selezione dei rami in `variant-training` attraversa le
sotto-varianti di primo livello ma non quelle annidate, o si ferma a una certa profondità.
Da chiarire se coinvolge anche la validazione backend delle mosse attese.
**PGN di test (`/variants/293`):**
```pgn
[Event "?"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "?"]
[Black "?"]
[Result "*"]

1. e4 e5
2. Nf3 Nc6
3. Bc4 Nf6
4. Ng5 d5
5. exd5 Nxd5
6. Nxf7 Kxf7
7. Qf3+ Ke6
8. Nc3 Nb4
9. O-O c6
   (9... Nxc2
    10. Bxd5+ Kd6
    11. Bb3 c6
       (11... Nxa1
        12. Qd5+ Ke7
        13. Qxe5+ Kd7
        14. Qe6#)
    12. Bxc2)
10. d4 Qf6
11. Qd1 *
```
