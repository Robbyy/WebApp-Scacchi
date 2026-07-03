# ISSUE-016 - Editor manuale posizione

## Materiale

| File | Uso | Note |
|------|-----|------|
| `screenshots/inserisci-posizione-template.png` | Riferimento funzionale | Da adattare allo stile della webapp; non è un vincolo grafico. |

## Flusso primario

L'utente crea una posizione di Mediogioco o Finale guardando una posizione su libro o altra
fonte esterna e ricostruendola manualmente sulla scacchiera. Il FEN è il formato tecnico
salvato e validato dall'app, non il punto di ingresso principale.

La composizione dei pezzi deve seguire il paradigma Fritz/ChessBase: l'utente seleziona
un pezzo dalla palette laterale destra, poi si sposta sulla scacchiera e clicca sulla casa
in cui piazzarlo. Se un pezzo è selezionato, e solo mentre il puntatore si trova dentro
l'area della scacchiera, il cursore mostra il pezzo selezionato in formato ridotto.

Se la casa cliccata contiene già un pezzo, il comportamento dipende dal contenuto: un pezzo
diverso, anche solo per colore, viene sostituito dal pezzo selezionato; lo stesso pezzo
dello stesso colore viene invece rimosso e la casa torna vuota.

La posizione deve essere validata mentre viene composta. Non deve essere possibile salvare
posizioni impossibili, ad esempio con più di otto pedoni dello stesso colore, senza uno o
entrambi i re, con più re dello stesso colore, con i re a contatto o con altri stati non
legalmente rappresentabili. Finché la posizione non è valida, il salvataggio resta
disabilitato.

## Dentro scope

- Scacchiera editabile.
- Palette pezzi a destra.
- Inserimento pezzi tramite selezione dalla palette e click sulla casa di destinazione.
- Cursore con miniatura del pezzo selezionato solo dentro l'area della scacchiera.
- Sostituzione del pezzo presente se la casa contiene un pezzo diverso.
- Rimozione/toggle se la casa contiene già lo stesso pezzo dello stesso colore.
- Spostamento e rimozione pezzi sulla scacchiera.
- Pulizia completa della scacchiera.
- Scelta del colore al tratto.
- Rotazione/orientamento bianco-nero della scacchiera.
- Apertura automatica dell'editor quando si crea una posizione in Mediogioco o Finale.
- Salvataggio della posizione come FEN valido.
- Salvataggio abilitato solo quando la posizione è legalmente possibile.
- Validazione anche lato backend/API, non solo in UI.

## Secondario

- Copia FEN.
- Incolla FEN.
- Campi tecnici FEN da valutare solo se necessari per la validità e il gioco della
  posizione; il numero mossa non deve essere esposto in UI.

## Fuori scope

- Importazione studi da Lichess per Mediogioco e Finale.
- Copia ASCII.
- Incolla ASCII.
- Scambio Bianco/Nero.
- Scambio Re/Donna.
- Aiuto dedicato nella schermata.
- Campo "numero mossa" esposto all'utente.
