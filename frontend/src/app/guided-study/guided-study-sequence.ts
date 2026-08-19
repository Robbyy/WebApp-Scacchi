import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, EMPTY } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { StudyService } from '../core/study.service';
import { VariantService } from '../core/variant.service';
import { ConfirmService } from '../core/confirm.service';
import { Study } from '../core/study.model';
import { Variant } from '../core/variant.model';
import {
  AttemptOutcome,
  PositionAttempt,
  PositionAttemptsSummary,
  RecordAttemptRequest,
} from '../core/attempt.model';
import { studyGuidedStudyGate } from '../core/guided-study';
import {
  guidedStudyBlockMessage,
  sequenceFilterLabel,
  sequenceOrderLabel,
  studyTypeLabel,
} from '../core/middlegame-format';
import {
  SEQUENCE_FILTERS,
  SEQUENCE_ORDERS,
  SequenceFilter,
  SequenceOrder,
  buildSequenceSnapshot,
} from '../core/sequence-snapshot';
import { sectionContextFrom, sectionLabel, sectionPaths } from '../core/study-sections';
import { GuidedStudyAttempt } from './guided-study-attempt';

/** Fase mostrata dal contenitore sequenziale, indipendente dallo stato del tentativo montato. */
type SequencePhase = 'CONFIG' | 'EMPTY' | 'RUNNING' | 'SUMMARY';

/**
 * Regione a cui spostare il focus quando la sequenza cambia fase o posizione
 * (R26.3, task 8.1). Tutti e quattro i casi coincidono con la distruzione del
 * controllo appena premuto («Avvia», «Posizione successiva», «Salta
 * posizione», «Nuova sequenza»): senza spostamento il focus resterebbe sul
 * body e la navigazione da tastiera ripartirebbe dall'inizio della pagina.
 */
type SequenceFocusTarget = 'config' | 'empty' | 'summary' | 'progress';

/**
 * Classificazione locale di una posizione già "chiusa" nella sequenza (task
 * 7.4/7.5): l'ultimo esito ottenuto, o `SKIPPED` se saltata senza esito. Le
 * due possibilità sono mutuamente esclusive perché ogni posizione viene
 * visitata una sola volta per passaggio (l'indice avanza solo in avanti).
 */
type SequenceOutcome = AttemptOutcome | 'SKIPPED';

/** I cinque conteggi del riepilogo finale (task 7.5): sempre presenti, anche a zero. */
interface SequenceSummary {
  proposed: number;
  understood: number;
  notUnderstood: number;
  failed: number;
  noOutcome: number;
}

/**
 * Punto di ingresso sequenziale dello studio guidato Mediogioco su
 * `/middlegame/studies/:id/study` (R26.3, task 1.2/1.3/6.1-6.4): carica lo
 * studio classificato e il riepilogo tentativi già disponibile
 * (`StudyService.getAttemptsSummary`), applica il gate client (task 1.4) e
 * mostra la configurazione obbligatoria e indipendente di ordine e filtro.
 *
 * All'avvio costruisce una sola volta lo snapshot locale delle posizioni
 * eleggibili ({@link buildSequenceSnapshot}, task 6.2) e non lo ricostruisce
 * né lo riordina quando un tentativo successivo cambia lo storico (task 6.3):
 * lo snapshot resta un semplice segnale assegnato una volta sola, mai
 * ricalcolato dagli esiti registrati durante la sequenza. Uno snapshot vuoto
 * mostra uno stato dedicato con ritorno alla configurazione (task 6.4); un
 * reload o un accesso diretto alla route ripartono sempre da qui, perché il
 * componente non legge né scrive alcuno stato persistito (`localStorage`,
 * `sessionStorage` o sessioni lato server).
 *
 * Il passaggio della posizione corrente al contenitore riusabile del
 * tentativo (`GuidedStudyAttempt`, gruppo 2-5) è cablato con lo stesso
 * pattern di `GuidedStudyPosition`: nessun `HttpClient` iniettato nel figlio,
 * `recordAttempt` legato alla posizione corrente dello snapshot.
 *
 * Avanzamento e riepilogo (gruppo 7): una posizione conta come proposta al
 * primo ingresso (`positionNumber`, derivato dall'indice corrente, mai
 * ricontato da una riprova che non cambia posizione). `Posizione successiva`
 * compare solo dopo un esito registrato per la posizione corrente
 * (`resultByPosition`, task 7.1) e non c'è mai avanzamento automatico.
 * `Salta posizione` compare solo prima di un esito, non chiama l'API
 * tentativi né tocca lo storico, e chiede conferma (`ConfirmService`) solo se
 * il tentativo montato ha mosse locali (`GuidedStudyAttempt.hasLocalMoves`,
 * letto via `viewChild`); un annullamento non tocca alcuno stato (task 7.2/7.3).
 * In entrambi i casi l'avanzamento cambia la posizione legata a `[variant]`
 * (o smonta il figlio all'ultima posizione): l'`effect`/`ngOnDestroy` già
 * esistenti in `GuidedStudyAttempt` fermano il motore e scartano lo stato
 * locale da soli, senza bisogno di un metodo di reset dedicato qui.
 * Il riepilogo finale (`summary`, task 7.5) deriva da `resultByPosition`:
 * quattro categorie mutuamente esclusive che sommano sempre alle proposte,
 * mai persistito. Uscire in qualunque fase (link «Torna allo studio», sempre
 * presente) non crea né dichiara conclusa alcuna sessione: gli eventi già
 * confermati dal backend restano gli unici dati persistiti (task 7.6).
 */
@Component({
  selector: 'app-guided-study-sequence',
  imports: [FormsModule, RouterLink, GuidedStudyAttempt],
  templateUrl: './guided-study-sequence.html',
  styleUrls: ['../studies/study-detail.css', './guided-study-sequence.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidedStudySequence {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(StudyService);
  private readonly variantService = inject(VariantService);
  private readonly confirmService = inject(ConfirmService);

  /** Riferimento al tentativo montato (task 7.3): solo per interrogare `hasLocalMoves()`. */
  private readonly attempt = viewChild(GuidedStudyAttempt);

  private readonly context = sectionContextFrom(this.route.snapshot.data);
  protected readonly paths = sectionPaths(this.context);
  protected readonly parentLabel = this.context ? sectionLabel(this.context.section) : 'Studi';
  protected readonly studyTypeLabel = studyTypeLabel;
  protected readonly sequenceOrderLabel = sequenceOrderLabel;
  protected readonly sequenceFilterLabel = sequenceFilterLabel;
  protected readonly orders = SEQUENCE_ORDERS;
  protected readonly filters = SEQUENCE_FILTERS;

  protected readonly loading = signal(true);
  protected readonly study = signal<Study | null>(null);
  protected readonly summaries = signal<PositionAttemptsSummary[] | null>(null);
  protected readonly summariesError = signal(false);

  protected readonly gate = computed(() =>
    studyGuidedStudyGate(this.study(), this.context?.phase),
  );
  protected readonly blockMessage = computed(() => guidedStudyBlockMessage(this.gate().reason));

  /** Scelta di ordine e filtro (task 6.1): obbligatoria e indipendente, nessun valore di default. */
  protected readonly orderChoice = signal<SequenceOrder | ''>('');
  protected readonly filterChoice = signal<SequenceFilter | ''>('');
  protected readonly startError = signal<string | null>(null);

  protected readonly phase = signal<SequencePhase>('CONFIG');
  /** Snapshot congelato all'avvio (task 6.2/6.3): un solo `signal.set`, mai ricostruito dopo. */
  protected readonly snapshot = signal<Variant[]>([]);
  private readonly currentIndex = signal(0);
  protected readonly currentVariant = computed<Variant | null>(
    () => this.snapshot()[this.currentIndex()] ?? null,
  );
  /** Posizione mostrata (1-based): una posizione conta come proposta al primo ingresso (task 7.1). */
  protected readonly positionNumber = computed(() => this.currentIndex() + 1);

  /**
   * Ultimo esito/skip per posizione già "chiusa" nella sequenza (task
   * 7.1/7.2/7.4): una sola voce per id, sovrascritta da ogni riprova
   * riuscita. Non è mai letta o scritta dal backend: solo riepilogo locale
   * non persistito (task 7.5).
   */
  private readonly resultByPosition = signal<ReadonlyMap<number, SequenceOutcome>>(new Map());
  /** `true` quando la posizione corrente ha già un esito/skip in questa sequenza (task 7.1/7.2). */
  protected readonly hasOutcomeForCurrent = computed(() => {
    const current = this.currentVariant();
    return current != null && this.resultByPosition().has(current.id);
  });
  // --- Regione live e focus della sequenza (task 8.1) ------------------------
  private readonly progressRegion = viewChild<ElementRef<HTMLElement>>('progressRegion');
  private readonly configRegion = viewChild<ElementRef<HTMLElement>>('configRegion');
  private readonly emptyRegion = viewChild<ElementRef<HTMLElement>>('emptyRegion');
  private readonly summaryRegion = viewChild<ElementRef<HTMLElement>>('summaryRegion');

  private readonly focusRequest = signal<{ id: number; target: SequenceFocusTarget } | null>(null);
  private focusRequestId = 0;
  private lastFocusApplied = 0;

  /**
   * Testo della regione live persistente (task 8.1). Vive fuori dallo `@switch`
   * delle fasi proprio per restare nel DOM: un `role="status"` inserito insieme
   * al proprio testo non viene annunciato in modo affidabile. In `SUMMARY` resta
   * vuoto perché il focus si sposta sul titolo del riepilogo, che lo screen
   * reader legge da solo: due annunci contemporanei si sovrapporrebbero.
   */
  protected readonly sequenceStatus = computed<string>(() =>
    this.phase() === 'RUNNING' ? `Posizione ${this.positionNumber()} di ${this.snapshot().length}` : '',
  );

  protected readonly summary = computed<SequenceSummary>(() => {
    const results = [...this.resultByPosition().values()];
    return {
      proposed: this.snapshot().length,
      understood: results.filter((r) => r === 'UNDERSTOOD').length,
      notUnderstood: results.filter((r) => r === 'NOT_UNDERSTOOD').length,
      failed: results.filter((r) => r === 'FAILED').length,
      noOutcome: results.filter((r) => r === 'SKIPPED').length,
    };
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service
      .getStudy(id)
      .pipe(
        switchMap((s) => {
          this.study.set(s);
          if (!studyGuidedStudyGate(s, this.context?.phase).eligible) {
            this.loading.set(false);
            return EMPTY;
          }
          return this.service.getAttemptsSummary(id).pipe(
            tap((summaries) => {
              this.summaries.set(summaries);
              this.loading.set(false);
            }),
            catchError(() => {
              this.summariesError.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        catchError(() => {
          this.loading.set(false);
          return EMPTY;
        }),
      )
      .subscribe();

    // Applica la richiesta di focus al primo render in cui la regione esiste
    // (task 8.1): la fase e la regione cambiano nello stesso tick, quindi la
    // richiesta emessa dal gestore del click viene consumata subito dopo.
    effect(() => {
      const request = this.focusRequest();
      if (!request || request.id === this.lastFocusApplied) {
        return;
      }
      const region = this.regionFor(request.target);
      if (!region) {
        return;
      }
      this.lastFocusApplied = request.id;
      region.nativeElement.focus();
    });
  }

  private regionFor(target: SequenceFocusTarget): ElementRef<HTMLElement> | undefined {
    switch (target) {
      case 'config':
        return this.configRegion();
      case 'empty':
        return this.emptyRegion();
      case 'summary':
        return this.summaryRegion();
      default:
        return this.progressRegion();
    }
  }

  /** Registra la richiesta di focus consumata dall'effect al render successivo. */
  private requestFocus(target: SequenceFocusTarget): void {
    this.focusRequest.set({ id: ++this.focusRequestId, target });
  }

  /**
   * Costruisce lo snapshot dalla scelta corrente (task 6.1/6.2): entrambi i
   * campi sono obbligatori. Uno snapshot vuoto mostra lo stato dedicato
   * (task 6.4) invece di avviare una sequenza senza posizioni.
   */
  protected startSequence(): void {
    const order = this.orderChoice();
    const filter = this.filterChoice();
    if (!order || !filter) {
      this.startError.set('Scegli ordine e filtro prima di avviare la sequenza.');
      return;
    }
    this.startError.set(null);
    const variants = this.study()?.variants ?? [];
    const summaries = this.summaries() ?? [];
    const built = buildSequenceSnapshot(variants, summaries, order, filter);
    this.resultByPosition.set(new Map());
    if (built.length === 0) {
      this.phase.set('EMPTY');
      this.requestFocus('empty');
      return;
    }
    this.snapshot.set(built);
    this.currentIndex.set(0);
    this.phase.set('RUNNING');
    this.requestFocus('progress');
  }

  /**
   * Ritorno alla configurazione da uno snapshot vuoto (task 6.4) o da un
   * riepilogo concluso (task 7.5, «nuova sequenza»): azzera anche lo stato
   * della sequenza precedente, così un nuovo avvio costruisce uno snapshot e
   * un riepilogo genuinamente nuovi, mai una sessione ricostruita.
   */
  protected backToConfig(): void {
    this.phase.set('CONFIG');
    this.snapshot.set([]);
    this.currentIndex.set(0);
    this.resultByPosition.set(new Map());
    this.requestFocus('config');
  }

  /**
   * Invio del tentativo per la posizione corrente della sequenza, stesso
   * pattern di `GuidedStudyPosition.recordAttempt`: nessun `HttpClient`
   * iniettato nel componente riusabile del tentativo.
   */
  protected readonly recordAttempt = (request: RecordAttemptRequest): Observable<PositionAttempt> =>
    this.variantService.recordAttempt(this.currentVariant()!.id, request);

  /**
   * Registra l'esito confermato dal backend per la posizione corrente (task
   * 7.1/7.4): sovrascrive un'eventuale voce precedente della stessa
   * posizione (riprova), senza toccare `snapshot` o `currentIndex` — la
   * posizione resta quella corrente finché l'utente non sceglie esplicitamente
   * di avanzare. Il confronto con `currentVariant()` scarta un evento riferito
   * a una posizione non più corrente (difesa aggiuntiva: il figlio già
   * garantisce l'epoch, qui si protegge anche da un cambio di posizione nel
   * frattempo).
   */
  protected onAttemptRecorded(attempt: PositionAttempt): void {
    const current = this.currentVariant();
    if (!current || current.id !== attempt.variantId) {
      return;
    }
    this.setResult(attempt.variantId, attempt.outcome);
  }

  /** Avanza dopo un esito registrato (task 7.1): nessun avanzamento automatico, solo su comando esplicito. */
  protected next(): void {
    const current = this.currentVariant();
    if (!current || !this.hasOutcomeForCurrent()) {
      return;
    }
    this.advanceOrFinish();
  }

  /**
   * Salta la posizione corrente prima di un esito (task 7.2/7.3): non chiama
   * mai l'API tentativi né tocca lo storico, incrementa «senza esito» una
   * sola volta e avanza. Se il tentativo montato ha mosse locali, chiede
   * conferma; su annullamento non tocca alcuno stato (board, esito, indice).
   * Il motore e le mosse locali della posizione lasciata vengono scartati dal
   * figlio stesso quando smette di ricevere quella posizione (cambio di
   * `[variant]` o distruzione a fine sequenza), non da un reset esplicito qui.
   */
  protected async skip(): Promise<void> {
    const current = this.currentVariant();
    if (!current || this.hasOutcomeForCurrent()) {
      return;
    }
    if (this.attempt()?.hasLocalMoves()) {
      const ok = await this.confirmService.ask({
        title: 'Salta posizione',
        message:
          'Hai già giocato delle mosse in questa posizione: saltarla comunque? Le mosse verranno scartate.',
        confirmLabel: 'Salta posizione',
        cancelLabel: 'Annulla',
      });
      if (!ok) {
        return;
      }
    }
    this.setResult(current.id, 'SKIPPED');
    this.advanceOrFinish();
  }

  private setResult(variantId: number, outcome: SequenceOutcome): void {
    const next = new Map(this.resultByPosition());
    next.set(variantId, outcome);
    this.resultByPosition.set(next);
  }

  /** Avanza alla posizione seguente dello snapshot, o mostra il riepilogo finale se era l'ultima (task 7.5). */
  private advanceOrFinish(): void {
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex >= this.snapshot().length) {
      this.phase.set('SUMMARY');
      this.requestFocus('summary');
      return;
    }
    this.currentIndex.set(nextIndex);
    // Il comando premuto («Posizione successiva» o «Salta posizione») viene
    // sostituito dall'altro ramo: il focus va sulla regione che annuncia la
    // nuova posizione, da cui il tab prosegue su board e pannello (task 8.1).
    this.requestFocus('progress');
  }
}
