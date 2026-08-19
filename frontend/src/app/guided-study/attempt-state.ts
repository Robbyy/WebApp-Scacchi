import { signal } from '@angular/core';

/**
 * Stati del tentativo guidato Mediogioco (R26.3, design decisione 3). La
 * macchina è condivisa da tattica (gruppo 3) e strategia/Stockfish (gruppo
 * 4): qui si costruisce solo l'infrastruttura generica — transizioni, epoch
 * e lock della board — senza confronto con la mainline né chiamate API.
 */
export type AttemptState =
  | 'LOADING'
  | 'USER_TURN'
  | 'AUTO_REPLY'
  | 'DEVIATED_ENGINE_OFF'
  | 'ENGINE_THINKING'
  | 'EXPLORATION_USER_TURN'
  | 'SAVING_OUTCOME'
  | 'SOLUTION'
  | 'ERROR';

/** Stati in cui l'utente può muovere sulla board (design decisione 3, tabella stati). */
const UNLOCKED_STATES: ReadonlySet<AttemptState> = new Set(['USER_TURN', 'EXPLORATION_USER_TURN']);

/**
 * Macchina a stati del tentativo guidato, riusabile da tattica e strategia
 * (design decisioni 3 e 9). Nessuna dipendenza da Angular DI: una nuova
 * istanza per ogni componente di tentativo, così lo stato non trapela fra
 * posizioni diverse.
 */
export class AttemptStateMachine {
  readonly state = signal<AttemptState>('LOADING');
  /** Incrementato a ogni avvio/riprova: invalida callback e risposte asincrone obsolete. */
  readonly epoch = signal(0);
  readonly startingFen = signal('');
  /** FEN corrente del tentativo (non la soluzione): aggiornata dalle mosse locali dell'utente. */
  readonly currentFen = signal('');
  /** Mosse SAN dell'utente nel tentativo corrente: solo stato locale, mai persistito. */
  readonly userMoves = signal<string[]>([]);
  readonly error = signal<string | null>(null);

  /** `true` quando la board deve restare bloccata nello stato corrente. */
  locked(): boolean {
    return !UNLOCKED_STATES.has(this.state());
  }

  /**
   * Avvia un nuovo tentativo dalla FEN iniziale (caricamento o riprova):
   * nuovo epoch, mosse locali ed errore azzerati, board sbloccata in
   * `USER_TURN`. Restituisce l'epoch corrente perché il chiamante possa
   * scartare risposte asincrone più vecchie.
   */
  beginAttempt(startingFen: string): number {
    const next = this.epoch() + 1;
    this.epoch.set(next);
    this.startingFen.set(startingFen);
    this.currentFen.set(startingFen);
    this.userMoves.set([]);
    this.error.set(null);
    this.state.set('USER_TURN');
    return next;
  }

  /** Riprova: stesso comportamento di un nuovo avvio, dalla FEN iniziale corrente. */
  retry(): number {
    return this.beginAttempt(this.startingFen());
  }

  /**
   * Registra una mossa locale dell'utente se la board è sbloccata; ignorata
   * altrimenti (board bloccata o soluzione già rivelata). Non decide la
   * transizione successiva: il confronto con la mainline e le risposte
   * automatiche/motore sono compito della logica tattica/strategica dei
   * prossimi gruppi, che userà `enterAutoReply`/`enterDeviatedEngineOff`/ecc.
   */
  applyUserMove(san: string, fen: string): boolean {
    if (!UNLOCKED_STATES.has(this.state())) {
      return false;
    }
    this.userMoves.update((moves) => [...moves, san]);
    this.currentFen.set(fen);
    return true;
  }

  enterUserTurn(): void {
    this.state.set('USER_TURN');
  }

  enterAutoReply(): void {
    this.state.set('AUTO_REPLY');
  }

  /**
   * Applica la risposta avversaria automatica (mainline tattica gruppo 3,
   * risposta strategica pre-deviazione gruppo 4): aggiorna solo la FEN
   * corrente, senza toccare `userMoves` né lo stato, a carico del chiamante.
   */
  applyAutoReply(fen: string): void {
    this.currentFen.set(fen);
  }

  enterDeviatedEngineOff(): void {
    this.state.set('DEVIATED_ENGINE_OFF');
  }

  enterEngineThinking(): void {
    this.state.set('ENGINE_THINKING');
  }

  enterExplorationUserTurn(): void {
    this.state.set('EXPLORATION_USER_TURN');
  }

  enterSavingOutcome(): void {
    this.state.set('SAVING_OUTCOME');
  }

  /**
   * Stato soluzione binario (design decisione 4): riporta la board alla FEN
   * iniziale, da cui il chiamante rivela l'intero albero in sola lettura.
   * L'arresto delle attività asincrone in corso (es. `stop()` del motore) è a
   * carico del chiamante, non ancora presente in questo gruppo. Non esiste
   * uno stato intermedio: da qualunque stato del tentativo si entra qui
   * direttamente.
   */
  revealSolution(): void {
    this.currentFen.set(this.startingFen());
    this.state.set('SOLUTION');
  }

  /** Errore controllato: la board resta bloccata finché non si riprova. */
  fail(message: string): void {
    this.error.set(message);
    this.state.set('ERROR');
  }
}
