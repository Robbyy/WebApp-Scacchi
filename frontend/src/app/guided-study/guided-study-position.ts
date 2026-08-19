import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { VariantService } from '../core/variant.service';
import { StudyService } from '../core/study.service';
import { Study } from '../core/study.model';
import { Variant } from '../core/variant.model';
import {
  PositionAttempt,
  PositionAttemptsSummary,
  RecordAttemptRequest,
  deriveAttemptsSummary,
} from '../core/attempt.model';
import { positionGuidedStudyGate } from '../core/guided-study';
import { guidedStudyBlockMessage, lastOutcomeLabel } from '../core/middlegame-format';
import { sectionContextFrom, sectionLabel, sectionPaths } from '../core/study-sections';
import { formatReviewDate } from '../reviews/review-format';
import { GuidedStudyAttempt } from './guided-study-attempt';

/**
 * Punto di ingresso manuale dello studio guidato Mediogioco su
 * `/middlegame/positions/:id/study` (R26.3, task 1.2/1.3): carica la
 * posizione e lo studio padre, applica il gate client di eleggibilità
 * (task 1.4) e monta il componente riusabile di tentativo (`GuidedStudyAttempt`,
 * gruppo 2) sulla posizione eleggibile.
 */
@Component({
  selector: 'app-guided-study-position',
  imports: [RouterLink, GuidedStudyAttempt],
  templateUrl: './guided-study-position.html',
  styleUrls: ['../variants/variant-detail.css', './guided-study-position.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidedStudyPosition implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly variantService = inject(VariantService);
  private readonly studyService = inject(StudyService);

  /** Contesto di sezione dai `data` della route: sempre Mediogioco qui. */
  private readonly context = sectionContextFrom(this.route.snapshot.data);
  protected readonly paths = sectionPaths(this.context);
  protected readonly parentLabel = this.context ? sectionLabel(this.context.section) : 'Studi';

  protected readonly loading = signal(true);
  protected readonly variant = signal<Variant | null>(null);
  protected readonly study = signal<Study | null>(null);
  /** Riepilogo dello storico della sola posizione aperta in modalità manuale. */
  protected readonly attemptsSummary = signal<PositionAttemptsSummary | null>(null);
  protected readonly attemptsLoading = signal(false);
  protected readonly attemptsUnavailable = signal(false);
  private attemptsRequestSequence = 0;

  protected readonly lastOutcomeLabel = lastOutcomeLabel;
  protected readonly formatReviewDate = formatReviewDate;

  protected readonly gate = computed(() =>
    positionGuidedStudyGate(this.study(), this.variant(), this.context?.phase),
  );
  protected readonly blockMessage = computed(() => guidedStudyBlockMessage(this.gate().reason));

  /** Ritorno dallo stato bloccato: allo studio padre se noto, altrimenti alla sezione. */
  protected readonly returnLink = computed(() => {
    const studyId = this.variant()?.studyId;
    return studyId != null ? this.paths.study(studyId) : this.paths.studyList;
  });
  protected readonly returnLabel = computed(() =>
    this.variant()?.studyId != null ? 'Torna allo studio' : `torna a ${this.parentLabel}`,
  );

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id).subscribe();
  }

  /**
   * Invio del tentativo al backend per la posizione corrente (R26.3, gruppo
   * 3): passato come input a `GuidedStudyAttempt`, che non inietta alcun
   * servizio HTTP e resta così riusabile dal contenitore sequenziale.
   */
  protected readonly recordAttempt = (request: RecordAttemptRequest): Observable<PositionAttempt> =>
    this.variantService.recordAttempt(this.variant()!.id, request);

  /**
   * Il figlio emette soltanto dopo POST riuscita: da qui il riepilogo viene
   * riletto dal backend. L'id e la sequenza proteggono le risposte di una
   * posizione precedente dopo navigazione, reload o nuovo tentativo.
   */
  protected onAttemptRecorded(attempt: PositionAttempt): void {
    if (this.variant()?.id !== attempt.variantId) {
      return;
    }
    this.loadAttemptsSummary(attempt.variantId);
  }

  private load(id: number): Observable<unknown> {
    return this.variantService.getVariant(id).pipe(
      switchMap((v) => {
        this.variant.set(v);
        this.attemptsSummary.set(null);
        this.attemptsLoading.set(false);
        this.attemptsUnavailable.set(false);
        this.attemptsRequestSequence++;
        if (v.studyId == null) {
          this.loading.set(false);
          return EMPTY;
        }
        return this.studyService.getStudy(v.studyId).pipe(
          tap((s) => {
            this.study.set(s);
            this.loadAttemptsSummary(v.id);
            this.loading.set(false);
          }),
          catchError(() => {
            this.loading.set(false);
            return EMPTY;
          }),
        );
      }),
      catchError(() => {
        this.loading.set(false);
        return EMPTY;
      }),
    );
  }

  /** Lettura best-effort: un errore non blocca il tentativo né cancella un riepilogo già noto. */
  private loadAttemptsSummary(variantId: number): void {
    const requestSequence = ++this.attemptsRequestSequence;
    this.attemptsLoading.set(true);
    this.attemptsUnavailable.set(false);
    this.variantService.getAttempts(variantId).subscribe({
      next: (attempts) => {
        if (requestSequence !== this.attemptsRequestSequence || this.variant()?.id !== variantId) {
          return;
        }
        this.attemptsSummary.set(deriveAttemptsSummary(variantId, attempts));
        this.attemptsLoading.set(false);
      },
      error: () => {
        if (requestSequence !== this.attemptsRequestSequence || this.variant()?.id !== variantId) {
          return;
        }
        this.attemptsLoading.set(false);
        this.attemptsUnavailable.set(this.attemptsSummary() === null);
      },
    });
  }

  ngOnDestroy(): void {
    // Invalida risposte GET tardive quando l'utente esce dalla modalità manuale.
    this.attemptsRequestSequence++;
  }
}
