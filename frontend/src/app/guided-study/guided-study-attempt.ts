import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Observable } from 'rxjs';
import { Chess } from 'chess.js';
import { Chessboard, MoveMade } from '../chessboard/chessboard';
import { MoveSoundService } from '../core/move-sound.service';
import { StockfishService } from '../core/stockfish.service';
import { MoveNode, Variant, validationMessage } from '../core/variant.model';
import { buildTokens, childrenAt, fenAt, fromLine, mainline, pathsEqual } from '../core/move-tree';
import { difficultyLabel, themeLabel } from '../core/middlegame-format';
import { StudyType } from '../core/position-theme.model';
import { AttemptOutcome, PositionAttempt, RecordAttemptRequest } from '../core/attempt.model';
import { AttemptStateMachine } from './attempt-state';

/** Budget fisso della richiesta esplorativa (design decisione 7, stesso di "gioca contro il computer"). */
const ENGINE_MOVETIME_MS = 800;

/**
 * Regione a cui spostare il focus dopo un cambio di stato (R26.3, task 8.1).
 * Il design (decisione 11) sposta il focus soltanto dove serve a continuare il
 * flusso: soluzione ed errore, più la regione di stato quando l'esito
 * strategico appena registrato rimuove dal DOM i pulsanti che avevano il
 * focus. Deviazione, attesa motore e salvataggio vengono soltanto annunciati
 * dalle regioni live: rubare il focus mentre l'utente è sulla board sarebbe
 * intrusivo e non aggiunge nulla di azionabile.
 */
type AttemptFocusTarget = 'solution' | 'alert' | 'status';

/**
 * Componente riusabile del tentativo guidato Mediogioco (R26.3, design
 * decisioni 1 e 3): scacchiera più macchina a stati, condiviso dall'apertura
 * manuale (`GuidedStudyPosition`) e, nei gruppi successivi, dal contenitore
 * sequenziale — che passerà via via posizioni diverse allo stesso input
 * `variant`, riavviando qui il tentativo.
 *
 * Oltre all'infrastruttura comune (gruppo 2: epoch, lock della board, stato
 * soluzione binario con replay manuale, reset/riprova), ospita il flusso
 * tattico (gruppo 3, mainline unica + invio `userMoves`) e il flusso
 * strategico (gruppo 4): mainline finché l'utente la segue, deviazione senza
 * esito, esplorazione con Stockfish soltanto dopo la deviazione e
 * registrazione manuale `UNDERSTOOD`/`NOT_UNDERSTOOD` dopo la soluzione.
 * L'invio del tentativo passa sempre dall'input `recordAttempt` — mai un
 * servizio HTTP iniettato qui, per restare riusabile e testabile anche dal
 * contenitore sequenziale (gruppo 6/7), che fornirà la propria funzione di
 * invio legata alla posizione corrente. `StockfishService`, come
 * `MoveSoundService`, resta invece iniettato direttamente: è un singleton
 * root-provided senza parametri legati al chiamante (design decisione 7).
 */
@Component({
  selector: 'app-guided-study-attempt',
  imports: [Chessboard],
  templateUrl: './guided-study-attempt.html',
  styleUrls: ['../variants/variant-detail.css', './guided-study-attempt.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidedStudyAttempt implements OnDestroy {
  private readonly moveSound = inject(MoveSoundService);
  private readonly stockfish = inject(StockfishService);

  /** Posizione eleggibile da tentare: il chiamante garantisce già il gate (task 1.4). */
  readonly variant = input.required<Variant>();
  /** Tipologia persistita dello studio: seleziona il flusso tattico o lascia quello generico. */
  readonly studyType = input.required<StudyType>();
  /**
   * Invio del tentativo al backend, fornito dal chiamante (`GuidedStudyPosition`
   * oggi, il contenitore sequenziale nei prossimi gruppi): nessun `HttpClient`
   * iniettato qui, così il componente resta testabile senza provider HTTP e
   * riusabile con qualunque posizione corrente decisa dal chiamante.
   */
  readonly recordAttempt =
    input.required<(request: RecordAttemptRequest) => Observable<PositionAttempt>>();
  /** Notifica il contenitore solo dopo che il backend ha persistito un esito. */
  readonly attemptRecorded = output<PositionAttempt>();

  protected readonly themeLabel = themeLabel;
  protected readonly difficultyLabel = difficultyLabel;

  /** Macchina a stati del tentativo (design decisione 3): un'istanza per componente. */
  protected readonly machine = new AttemptStateMachine();
  protected readonly state = this.machine.state;
  protected readonly error = this.machine.error;
  protected readonly attemptFen = this.machine.currentFen;
  protected readonly locked = computed(() => this.machine.locked());
  protected readonly solutionRevealed = computed(() => this.state() === 'SOLUTION');

  /** Indice (0-based) della prossima semimossa della mainline da consumare (tattica e strategia). */
  private readonly mainlineIndex = signal(0);
  /** Esito confermato dal backend per l'ultimo invio (tattico automatico o strategico manuale). */
  protected readonly lastOutcome = signal<AttemptOutcome | null>(null);

  /** `true` dalla prima deviazione strategica: da qui in poi mai più confronto con la mainline. */
  private readonly deviated = signal(false);
  /** Toggle motore (design decisione 6): spento a ogni tentativo, senza effetto prima della deviazione. */
  protected readonly engineEnabled = signal(false);
  /** Protezione dalla race delle richieste Stockfish (design decisione 7), oltre a epoch e FEN. */
  private engineRequestSequence = 0;

  /**
   * Invio manuale dell'esito strategico (design decisione 8): resta locale al
   * pannello soluzione, senza lasciare lo stato macchina `SOLUTION` — l'albero
   * autore deve restare visibile durante l'invio e in caso di errore.
   */
  protected readonly strategicSaving = signal(false);
  protected readonly outcomeError = signal<string | null>(null);

  /** Percorso di navigazione della soluzione: indipendente dalle mosse locali del tentativo. */
  protected readonly solutionPath = signal<number[]>([]);

  // --- Regioni live e focus (task 8.1) ---------------------------------------
  // Le due regioni di annuncio esistono sempre nel DOM, anche vuote: un
  // `role="status"`/`role="alert"` inserito insieme al proprio testo non viene
  // annunciato in modo affidabile dagli screen reader. Qui cambia solo il
  // contenuto testuale, che è anche l'unico testo visibile: nessun duplicato
  // nascosto e nessun doppio annuncio.
  private readonly statusRegion = viewChild<ElementRef<HTMLElement>>('statusRegion');
  private readonly alertRegion = viewChild<ElementRef<HTMLElement>>('alertRegion');
  private readonly solutionRegion = viewChild<ElementRef<HTMLElement>>('solutionRegion');

  /** Richiesta di spostamento del focus, applicata al primo render utile. */
  private readonly focusRequest = signal<{ id: number; target: AttemptFocusTarget } | null>(null);
  private focusRequestId = 0;
  private lastFocusApplied = 0;

  /**
   * Testo annunciato e mostrato per lo stato corrente (task 8.1). Copre
   * deviazione, attesa motore e salvataggio, che non spostano il focus: la
   * regione live è l'unico canale con cui l'utente da tastiera o screen reader
   * si accorge che la board è passata in attesa.
   */
  protected readonly statusMessage = computed<string>(() => {
    switch (this.state()) {
      case 'LOADING':
        return 'Preparazione del tentativo…';
      case 'AUTO_REPLY':
        return 'Applicazione della risposta salvata…';
      case 'SAVING_OUTCOME':
        return 'Verifica della sequenza in corso…';
      case 'DEVIATED_ENGINE_OFF':
        return 'Hai lasciato la linea salvata. Attiva il motore per continuare a esplorare.';
      case 'ENGINE_THINKING':
        return 'Il motore sta pensando…';
      case 'EXPLORATION_USER_TURN':
        return 'Esplorazione libera: a te la mossa, il motore attivo risponde a ogni mossa.';
      case 'ERROR':
        // Il messaggio vive nella regione assertiva: qui resterebbe duplicato.
        return '';
      case 'SOLUTION':
        switch (this.lastOutcome()) {
          case 'UNDERSTOOD':
            return 'Esito registrato: compresa. Riprova quando vuoi.';
          case 'NOT_UNDERSTOOD':
            return 'Esito registrato: da rivedere. Riprova quando vuoi.';
          case 'FAILED':
            return 'Mossa diversa dalla soluzione salvata: ecco la linea corretta.';
          default:
            return "Soluzione rivelata: consulta l'albero e riprova quando vuoi.";
        }
      default:
        return 'A te la mossa. La linea salvata resta nascosta finché non la riveli.';
    }
  });

  /**
   * Testo della regione assertiva (task 8.1): errore del tentativo o errore di
   * registrazione dell'esito strategico. L'errore della macchina viene letto
   * solo in `ERROR`, così una soluzione rivelata dopo un errore motore non
   * continua ad annunciarlo.
   */
  protected readonly alertMessage = computed<string>(
    () => this.outcomeError() ?? (this.state() === 'ERROR' ? this.error() : null) ?? '',
  );

  protected readonly tree = computed<MoveNode[]>(() => {
    const v = this.variant();
    return v.tree && v.tree.length ? v.tree : fromLine(v.moves);
  });
  protected readonly tokens = computed(() => buildTokens(this.tree()));
  protected readonly mainlineLength = computed(() => mainline(this.tree()).length);
  protected readonly solutionFen = computed(() =>
    fenAt(this.variant().startingFen, this.tree(), this.solutionPath()),
  );
  /** FEN mostrata dalla board: quella del replay in soluzione, il tentativo altrimenti. */
  protected readonly boardFen = computed(() =>
    this.solutionRevealed() ? this.solutionFen() : this.attemptFen(),
  );
  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.variant().color === 'BLACK' ? 'black' : 'white',
  );
  protected readonly atStart = computed(() => this.solutionPath().length === 0);
  protected readonly atLeaf = computed(
    () => childrenAt(this.tree(), this.solutionPath()).length === 0,
  );

  constructor() {
    // Ogni posizione nuova (montaggio iniziale, cambio all'interno di una
    // sequenza) o ogni FEN iniziale diversa (es. la stessa posizione rientra
    // con dati ricaricati) avvia un nuovo tentativo con un nuovo epoch:
    // nessuna mossa o stato del tentativo precedente sopravvive.
    let lastPositionId: number | null = null;
    let lastStartingFen: string | null = null;
    effect(() => {
      const v = this.variant();
      if (v.id === lastPositionId && v.startingFen === lastStartingFen) {
        return;
      }
      lastPositionId = v.id;
      lastStartingFen = v.startingFen;
      this.resetAttemptLocalState();
      this.machine.beginAttempt(v.startingFen);
      this.solutionPath.set([]);
    });

    // Rileva un worker Stockfish caduto durante una richiesta in corso
    // (design decisione 7, "errore worker"): `StockfishService` non richiama
    // mai la callback pendente in quel caso, quindi l'unico segnale
    // osservabile dall'API esistente è `available` che torna `false`.
    effect(() => {
      const available = this.stockfish.available();
      if (!available && this.state() === 'ENGINE_THINKING') {
        this.cancelEngineRequest();
        this.failAttempt('Motore non disponibile.');
      }
    });

    // Applica la richiesta di focus al primo render in cui la regione esiste
    // (task 8.1): l'effect si ripete quando il `viewChild` si popola, così una
    // richiesta emessa nello stesso tick in cui la soluzione viene rivelata
    // non va persa. `lastFocusApplied` garantisce un solo spostamento per
    // richiesta, anche se l'effect rigira per altre dipendenze.
    effect(() => {
      const request = this.focusRequest();
      if (!request || request.id === this.lastFocusApplied) {
        return;
      }
      const region =
        request.target === 'solution'
          ? this.solutionRegion()
          : request.target === 'alert'
            ? this.alertRegion()
            : this.statusRegion();
      if (!region) {
        return;
      }
      this.lastFocusApplied = request.id;
      region.nativeElement.focus();
    });
  }

  /** Registra la richiesta di focus consumata dall'effect al render successivo. */
  private requestFocus(target: AttemptFocusTarget): void {
    this.focusRequest.set({ id: ++this.focusRequestId, target });
  }

  /**
   * Errore controllato del tentativo: oltre allo stato, sposta il focus sulla
   * regione assertiva (task 8.1). È l'unico punto da cui il componente entra
   * in `ERROR`, così annuncio e focus non possono divergere.
   */
  private failAttempt(message: string): void {
    this.machine.fail(message);
    this.requestFocus('alert');
  }

  private resetAttemptLocalState(): void {
    this.cancelEngineRequest();
    // Una richiesta di focus del tentativo precedente non deve applicarsi a
    // quello nuovo (task 8.1): il controllo appena premuto resta al suo posto.
    this.focusRequest.set(null);
    this.mainlineIndex.set(0);
    this.lastOutcome.set(null);
    this.deviated.set(false);
    this.engineEnabled.set(false);
    this.strategicSaving.set(false);
    this.outcomeError.set(null);
  }

  protected onMoveMade(move: MoveMade): void {
    const accepted = this.machine.applyUserMove(move.san, move.fen);
    if (!accepted) {
      return;
    }
    if (this.studyType() === 'TACTICAL') {
      this.handleTacticalMove(move.san);
    } else if (this.studyType() === 'STRATEGIC') {
      this.handleStrategicMove(move.san);
    }
  }

  /**
   * Rivela la soluzione su richiesta esplicita dell'utente (design decisione
   * 8, flusso strategico: disponibile da ogni stato, anche durante
   * l'analisi). Per la tattica la soluzione non è rivelabile prima della
   * validazione backend (design decisione 5): qui la richiesta viene
   * ignorata, l'unica via è `revealAfterOutcome` dopo la risposta del
   * backend.
   */
  protected revealSolution(): void {
    if (this.studyType() === 'TACTICAL') {
      return;
    }
    this.revealAfterOutcome();
  }

  private revealAfterOutcome(): void {
    this.cancelEngineRequest();
    this.machine.revealSolution();
    this.solutionPath.set([]);
    // La soluzione è il contenuto nuovo da leggere e l'unico da cui si
    // continua (replay, esito manuale): il focus la raggiunge senza costringere
    // a riattraversare board e pannello con il tab (task 8.1).
    this.requestFocus('solution');
  }

  /** Riprova: nuovo tentativo dalla stessa FEN iniziale, board e soluzione azzerate. */
  protected retry(): void {
    this.resetAttemptLocalState();
    this.machine.retry();
    this.solutionPath.set([]);
  }

  // --- Flusso tattico (gruppo 3): mainline unica, risposta automatica, esito backend ---

  /**
   * Confronta la mossa utente con il ply atteso della mainline (task 3.1).
   * Se coincide applica la risposta avversaria salvata e torna il turno
   * all'utente (task 3.2), gestendo sia la mainline che termina dopo la
   * mossa utente sia quella che termina dopo la risposta avversaria. Se
   * diverge blocca il tentativo e invia subito le mosse (task 3.3). Nessun
   * ramo alternativo dell'albero autore o motore entra in questo confronto
   * (task 3.6): la sola fonte è `variant().moves`, la mainline piatta già
   * validata dal backend alla creazione della posizione.
   */
  private handleTacticalMove(san: string): void {
    const mainlineMoves = this.variant().moves;
    const idx = this.mainlineIndex();
    if (san !== mainlineMoves[idx]) {
      this.submitTacticalOutcome();
      return;
    }
    const afterUserIdx = idx + 1;
    if (afterUserIdx >= mainlineMoves.length) {
      // Mainline dispari: termina subito dopo la mossa corretta dell'utente.
      this.mainlineIndex.set(afterUserIdx);
      this.submitTacticalOutcome();
      return;
    }

    this.machine.enterAutoReply();
    const replySan = mainlineMoves[afterUserIdx];
    const replyFen = applySan(this.machine.currentFen(), replySan);
    if (replyFen === null) {
      this.failAttempt(
        'Errore nei dati della posizione: impossibile applicare la risposta salvata.',
      );
      return;
    }
    this.machine.applyAutoReply(replyFen);
    this.moveSound.play(soundKind(replySan));

    const afterReplyIdx = afterUserIdx + 1;
    this.mainlineIndex.set(afterReplyIdx);
    if (afterReplyIdx >= mainlineMoves.length) {
      // Mainline pari: termina subito dopo la risposta avversaria.
      this.submitTacticalOutcome();
    } else {
      this.machine.enterUserTurn();
    }
  }

  /**
   * Invia le `userMoves` raccolte finora (task 3.1) e attende la validazione
   * backend prima di rivelare `FAILED`/`UNDERSTOOD` e la soluzione (task
   * 3.3/3.4). L'epoch catturato prima dell'invio protegge da risposte fuori
   * ordine, riprove o cambi di posizione nel frattempo (task 3.5): una
   * risposta che arriva dopo che l'epoch è cambiato viene scartata senza
   * creare o inventare alcun esito.
   */
  private submitTacticalOutcome(): void {
    const epoch = this.machine.epoch();
    this.machine.enterSavingOutcome();
    const request: RecordAttemptRequest = { userMoves: [...this.machine.userMoves()] };
    this.recordAttempt()(request).subscribe({
      next: (attempt) => {
        if (this.machine.epoch() !== epoch) {
          return;
        }
        this.lastOutcome.set(attempt.outcome);
        this.revealAfterOutcome();
        this.attemptRecorded.emit(attempt);
      },
      error: (err: unknown) => {
        if (this.machine.epoch() !== epoch) {
          return;
        }
        this.failAttempt(
          validationMessage(err) ?? 'Impossibile registrare il tentativo. Riprova.',
        );
      },
    });
  }

  // --- Flusso strategico (gruppo 4): mainline finché seguita, motore solo dopo deviazione ---

  /**
   * Finché l'utente non ha ancora deviato, confronta la mossa con il ply
   * atteso della mainline esattamente come la tattica (task 4.1): se
   * coincide applica l'eventuale risposta avversaria salvata senza mai
   * assegnare un esito, nemmeno quando la mainline termina (design decisione
   * 6: la soluzione con valutazione manuale resta disponibile a richiesta,
   * nessun invio automatico). Alla prima mossa che diverge — o non esiste
   * più un ply atteso — segna la deviazione e passa all'esplorazione: da qui
   * in avanti ogni mossa richiede una risposta motore, mai più un confronto
   * con la mainline (task 4.1).
   */
  private handleStrategicMove(san: string): void {
    if (!this.deviated()) {
      const mainlineMoves = this.variant().moves;
      const idx = this.mainlineIndex();
      if (idx < mainlineMoves.length && san === mainlineMoves[idx]) {
        const afterUserIdx = idx + 1;
        if (afterUserIdx >= mainlineMoves.length) {
          this.mainlineIndex.set(afterUserIdx);
          return;
        }
        this.machine.enterAutoReply();
        const replySan = mainlineMoves[afterUserIdx];
        const replyFen = applySan(this.machine.currentFen(), replySan);
        if (replyFen === null) {
          this.failAttempt(
            'Errore nei dati della posizione: impossibile applicare la risposta salvata.',
          );
          return;
        }
        this.machine.applyAutoReply(replyFen);
        this.moveSound.play(soundKind(replySan));
        this.mainlineIndex.set(afterUserIdx + 1);
        this.machine.enterUserTurn();
        return;
      }
      this.deviated.set(true);
    }
    this.requestEngineReplyOrSuspend();
  }

  /**
   * Attiva/disattiva il motore (task 4.2): prima della deviazione non ha
   * alcun effetto immediato, il flag viene solo memorizzato. Se accende il
   * motore mentre l'attesa è sospesa (task 4.3) chiede subito la risposta;
   * se lo spegne mentre il motore sta pensando (task 4.5) invalida la
   * richiesta in corso e torna sospeso.
   */
  protected toggleEngine(): void {
    const next = !this.engineEnabled();
    this.engineEnabled.set(next);
    if (next && this.state() === 'DEVIATED_ENGINE_OFF') {
      this.requestEngineReply();
    } else if (!next && this.state() === 'ENGINE_THINKING') {
      this.cancelEngineRequest();
      this.machine.enterDeviatedEngineOff();
    }
  }

  /** Richiede la risposta motore se il toggle è attivo, altrimenti sospende in attesa (task 4.3). */
  private requestEngineReplyOrSuspend(): void {
    if (this.engineEnabled()) {
      this.requestEngineReply();
    } else {
      this.machine.enterDeviatedEngineOff();
    }
  }

  /**
   * Una sola `requestBestMove` per la FEN corrente (task 4.4), con il trio
   * epoch/FEN/sequenza a protezione da callback obsolete (task 4.5): una
   * risposta che arriva dopo un cambio di stato/epoch/posizione o dopo
   * un'ulteriore richiesta viene scartata senza toccare board o stato. La
   * mossa UCI è validata/applicata con `chess.js` sulla FEN richiesta; `null`,
   * errore o mossa non applicabile mostrano «Motore non disponibile» senza
   * fallback (task 4.6). La linea esplorativa non viene mai persistita: solo
   * la FEN corrente del tentativo locale cambia.
   */
  private requestEngineReply(): void {
    this.machine.enterEngineThinking();
    const epoch = this.machine.epoch();
    const fen = this.machine.currentFen();
    const sequence = ++this.engineRequestSequence;
    this.stockfish.requestBestMove(fen, ENGINE_MOVETIME_MS, (uci) => {
      if (
        sequence !== this.engineRequestSequence ||
        this.machine.epoch() !== epoch ||
        this.machine.currentFen() !== fen
      ) {
        return;
      }
      if (!uci) {
        this.failAttempt('Motore non disponibile.');
        return;
      }
      const applied = applyUci(fen, uci);
      if (applied === null) {
        this.failAttempt('Motore non disponibile.');
        return;
      }
      this.machine.applyAutoReply(applied.fen);
      this.moveSound.play(soundKind(applied.san));
      this.machine.enterExplorationUserTurn();
    });
  }

  /**
   * Invalida ogni richiesta motore pendente e ferma il worker (task 4.5): su
   * spegnimento del toggle, soluzione, riprova, cambio posizione/FEN, uscita
   * (distruzione del componente) — sempre `stop()`, mai `dispose()`, perché
   * il componente è riusabile su posizioni successive nella sequenza.
   */
  private cancelEngineRequest(): void {
    this.engineRequestSequence++;
    this.stockfish.stop();
  }

  /**
   * Registra l'esito strategico dichiarato dall'utente (task 4.7/4.8): resta
   * disponibile solo in `SOLUTION`, dopo che l'intero albero è già stato
   * rivelato, e soltanto finché non è già stato confermato un esito. Non
   * lascia mai lo stato macchina `SOLUTION` durante l'invio — l'albero deve
   * restare visibile — e un errore mantiene scelta, retry e uscita
   * disponibili senza aggiornare il riepilogo come se fosse riuscito.
   */
  protected chooseStrategicOutcome(outcome: 'UNDERSTOOD' | 'NOT_UNDERSTOOD'): void {
    if (
      this.studyType() !== 'STRATEGIC' ||
      this.state() !== 'SOLUTION' ||
      this.lastOutcome() !== null ||
      this.strategicSaving()
    ) {
      return;
    }
    const epoch = this.machine.epoch();
    this.strategicSaving.set(true);
    this.outcomeError.set(null);
    this.recordAttempt()({ outcome }).subscribe({
      next: (attempt) => {
        if (this.machine.epoch() !== epoch) {
          return;
        }
        this.strategicSaving.set(false);
        this.lastOutcome.set(attempt.outcome);
        // «Compresa»/«Non compresa» spariscono dal DOM insieme all'esito
        // registrato: senza questo spostamento il focus resterebbe orfano sul
        // body (task 8.1). La regione di stato annuncia l'esito appena salvato.
        this.requestFocus('status');
        this.attemptRecorded.emit(attempt);
      },
      error: (err: unknown) => {
        if (this.machine.epoch() !== epoch) {
          return;
        }
        this.strategicSaving.set(false);
        this.outcomeError.set(validationMessage(err) ?? "Impossibile registrare l'esito. Riprova.");
      },
    });
  }

  /**
   * Espone se il tentativo corrente ha mosse locali non ancora concluse da un
   * esito (R26.3, task 7.3): unico membro pubblico ad uso del contenitore
   * sequenziale, che lo interroga (via `viewChild`) per decidere se chiedere
   * conferma prima di scartarle con «Salta posizione». `userMoves` registra
   * sia le mosse tattiche/pre-deviazione sia quelle esplorative post-deviazione
   * (`AttemptStateMachine.applyUserMove`), quindi un solo controllo copre
   * entrambi i flussi.
   */
  hasLocalMoves(): boolean {
    return this.machine.userMoves().length > 0;
  }

  ngOnDestroy(): void {
    this.cancelEngineRequest();
  }

  // --- Replay manuale della soluzione (attivo solo in stato SOLUTION) ---

  protected isCurrent(path: number[] | undefined): boolean {
    return !!path && pathsEqual(path, this.solutionPath());
  }

  protected goTo(path: number[] | undefined): void {
    if (!this.solutionRevealed() || !path) {
      return;
    }
    this.solutionPath.set([...path]);
  }

  protected first(): void {
    if (!this.solutionRevealed()) {
      return;
    }
    this.solutionPath.set([]);
  }

  protected prev(): void {
    if (!this.solutionRevealed()) {
      return;
    }
    this.solutionPath.update((p) => p.slice(0, -1));
  }

  protected next(): void {
    if (!this.solutionRevealed()) {
      return;
    }
    const kids = childrenAt(this.tree(), this.solutionPath());
    if (kids.length > 0) {
      this.solutionPath.update((p) => [...p, 0]);
      this.moveSound.play(soundKind(kids[0].san));
    }
  }

  protected last(): void {
    if (!this.solutionRevealed()) {
      return;
    }
    let path = [...this.solutionPath()];
    let kids = childrenAt(this.tree(), path);
    while (kids.length > 0) {
      path = [...path, 0];
      kids = kids[0].children;
    }
    this.solutionPath.set(path);
  }
}

function soundKind(san: string): 'move' | 'capture' {
  return san.includes('x') ? 'capture' : 'move';
}

/** FEN dopo l'applicazione della SAN data; `null` se non applicabile alla FEN corrente. */
function applySan(fen: string, san: string): string | null {
  try {
    const chess = new Chess(fen);
    chess.move(san);
    return chess.fen();
  } catch {
    return null;
  }
}

/**
 * Applica una mossa UCI (es. "e2e4", "e7e8q") alla FEN data (task 4.4/4.6),
 * stesso schema `from`/`to`/`promotion` già usato da "gioca contro il
 * computer" (`play.ts`). `null` se la mossa del motore non è applicabile.
 */
function applyUci(fen: string, uci: string): { fen: string; san: string } | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return { fen: chess.fen(), san: move.san };
  } catch {
    return null;
  }
}
