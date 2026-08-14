# Analisi R26.2 — Editor posizione: azioni contestuali e gerarchia visiva

**Stato:** proposta formalizzata, nessuna implementazione avviata
**Data:** 2026-08-14
**Perimetro:** editor delle mosse di una posizione di studio (`MIDDLEGAME` e, in prospettiva,
`ENDGAME`)

## Contesto

La verifica visuale successiva a R26.1 ha evidenziato che l'editor condiviso conserva alcuni
elementi nati per la navigazione generale o per il dettaglio variante. In modalità modifica questi
elementi competono con il contenuto operativo principale, cioè l'albero «Mosse & rami».

La schermata di riferimento è `/middlegame/positions/{id}/edit`, con la scacchiera a sinistra e
il pannello operativo a destra. Le correzioni devono essere progettate come comportamento
contestuale del solo editor posizionale: le Aperture mantengono i propri flussi e il Finale dovrà
ereditare il contratto quando R27 renderà attiva la sezione.

## Segnalazioni formalizzate

### R26.2-UI-01 — Breadcrumb non interattivo in modifica

In modalità modifica il breadcrumb può restare visibile come orientamento, ma nessuna voce deve
essere un link attivo o avviare una navigazione. Il percorso deve essere leggibile anche da
tecnologie assistive; la pagina corrente può essere marcata con `aria-current="page"`, mentre gli
antenati sono testo di contesto non focalizzabile.

### R26.2-UI-02 — Rimozione dell'etichetta «MODIFICA POSIZIONE»

L'etichetta/kicker sopra «Aggiorna la linea» è ridondante nella modalità già identificata dalla
route e dal titolo. Deve sparire dal pannello posizionale senza rimuovere il titolo principale,
il campo nome o lo stato di salvataggio.

### R26.2-UI-03 — Rimozione del comando «Posizioni»

Il pulsante di apertura della navigazione tra posizioni non deve essere mostrato nell'editor in
modalità modifica. Non va sostituito da un secondo comando equivalente dentro il pannello: in
questa modalità il pannello deve concentrarsi sull'editing corrente; salvataggio, annullamento e
breadcrumb informativo restano disponibili secondo i flussi già esistenti.

### R26.2-UI-04 — «Mosse & rami» al posto del controllo «Motore»

Il pulsante «Motore» deve sparire dall'editor posizionale. La sezione «Mosse & rami», già
necessaria per modificare la linea, deve occupare la posizione gerarchica attualmente riservata
al controllo motore, subito dopo il nome e prima dei controlli di replay/azioni. Il motore resta
disponibile nei contesti in cui è previsto dal dettaglio posizione; R26.2 non introduce né rimuove
il servizio Stockfish e non anticipa R28.

### R26.2-UI-05 — Rimozione dell'etichetta «posizione iniziale»

La scritta sopra «Rendi mainline», «Elimina mossa» e «Reset» deve essere rimossa: non descrive
correttamente il gruppo di azioni dell'editor dell'albero e occupa spazio senza aggiungere
informazione. I pulsanti e le loro condizioni di abilitazione restano invariati.

## Contratto condiviso con R27

I cinque punti sono requisiti del paradigma «posizione come studio», non dettagli esclusivi del
Mediogioco. R27 dovrà applicarli alle route `/endgame/...` e verificarli con dati `ENDGAME`, anche
se il codice viene ereditato da `VariantEditor` o da altri componenti condivisi. Il solo riuso di
una classe non costituirà evidenza di accettazione.

Le Aperture restano fuori dal correttivo: in quel contesto breadcrumb, navigazione tra varianti,
motore e titoli esistenti devono conservare il comportamento pre-R26.2, salvo una regressione
esplicita che dimostri il contrario.

## Valutazione del mini-rilascio

È opportuno introdurre **R26.2 — Editor posizionale contestuale** prima di R27.

Motivazioni:

1. i cinque punti sono coesi e riguardano la stessa schermata e lo stesso componente condiviso;
2. il delta previsto è principalmente template/CSS/accessibilità frontend, senza API, migration,
   database o modifica di `Study.phase`/`Variant`;
3. la correzione preventiva evita che R27 mescoli rifinitura dell'editor, nuove route Finale e
   regressioni di fase nello stesso gate;
4. i criteri sono verificabili con test di rendering/interazione e con una breve checklist browser
   ai sei viewport già adottati per R26.1;
5. il blocco può essere chiuso senza attivare `/endgame`, quindi non altera la pianificazione di
   R27 né anticipa training, review o gioco contro Stockfish.

R26.2 non deve diventare una nuova fase di prodotto: è una change breve di consolidamento UX,
con un unico gate di accettazione e senza lavori opportunistici non correlati.

## Criteri di uscita proposti

- OpenSpec della change valida in modalità strict, con proposal/design/spec/tasks completi.
- Test frontend aggiornati per contesto posizionale e regressione Aperture.
- Verifica browser su H2 temporaneo a 1600/1440/1024/768/375/320 px.
- Breadcrumb leggibile ma non cliccabile; nessun focus su voci disabilitate.
- Assenza di «MODIFICA POSIZIONE», «Posizioni», «Motore» e «posizione iniziale» nell'editor
  posizionale; «Mosse & rami» presente nella posizione prevista.
- Salvataggio, annullamento, guard delle modifiche, replay, azioni sui nodi e responsive invariati.
- Aperture invariate e `/endgame` ancora segnaposto fino a R27.
- Database condiviso escluso e hash confrontato prima/dopo il gate.

## Fuori scope R26.2

- implementazione della sezione Finale;
- nuove azioni di navigazione o nuove API;
- training posizionale, suggerimenti, autoverifica, statistiche, review/SM-2;
- gioco contro Stockfish dalla posizione (R28);
- modifica del modello a fasi, persistenza o schema Liquibase;
- redesign generale dell'editor FEN o della scacchiera già stabilizzato in R26.1.
