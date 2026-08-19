import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StudyService } from '../core/study.service';
import { VariantService } from '../core/variant.service';
import { Study, StudyColor } from '../core/study.model';
import { Variant, validationMessage } from '../core/variant.model';
import { StudyType } from '../core/position-theme.model';
import { PositionAttemptsSummary } from '../core/attempt.model';
import { difficultyLabel, lastOutcomeLabel, studyTypeLabel, themeLabel } from '../core/middlegame-format';
import { formatReviewDate } from '../reviews/review-format';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { sectionContextFrom, sectionLabel, sectionPaths } from '../core/study-sections';
import { StudyFormFields } from './study-form-fields';

/**
 * Dettaglio di uno studio (Prototipo 12): intestazione, elenco delle varianti
 * ("capitoli") con creazione/import e cancellazione, ed eliminazione dell'intero
 * studio (a cascata). Sul modello degli *studies* di Lichess. Da R22 i metadati
 * (nome/descrizione/colore) sono modificabili con un form inline espandibile
 * (ISSUE-012) che riusa i campi condivisi con la pagina di creazione.
 *
 * Da R26 la stessa pagina serve anche le sezioni posizionali (ISSUE-016):
 * montata sotto una route di sezione riceve nei `data` il contesto con la fase
 * attesa e la base canonica, accetta soltanto studi di quella fase e genera
 * link e redirect dentro la sezione. Senza contesto — le route generiche delle
 * Aperture — comportamento, URL e terminologia restano quelli pre-R26.
 */
@Component({
  selector: 'app-study-detail',
  imports: [FormsModule, RouterLink, StudyFormFields],
  templateUrl: './study-detail.html',
  styleUrls: ['./study-type-badge.css', './study-detail.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(StudyService);
  private readonly variantService = inject(VariantService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Contesto di sezione dai `data` della route: `null` sulle Aperture. */
  private readonly context = sectionContextFrom(this.route.snapshot.data);
  /** Percorsi canonici della sezione (o generici pre-R26 senza contesto). */
  protected readonly paths = sectionPaths(this.context);
  /** Antenato nei breadcrumb: «Studi» sulle Aperture, la sezione altrimenti. */
  protected readonly parentLabel = this.context ? sectionLabel(this.context.section) : 'Studi';
  /** Ritorno mostrato dall'errore, invariato per le Aperture. */
  protected readonly backLabel = this.context ? `torna a ${this.parentLabel}` : 'torna agli studi';

  protected readonly study = signal<Study | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly deletingStudy = signal(false);

  protected readonly variants = computed<Variant[]>(() => this.study()?.variants ?? []);
  protected readonly isOpening = computed(() => this.study()?.phase === 'OPENING');
  protected readonly itemLabel = computed(() => (this.isOpening() ? 'variante' : 'posizione'));
  protected readonly itemLabelPlural = computed(() => (this.isOpening() ? 'varianti' : 'posizioni'));

  /** Metadati e catalogo Mediogioco (R26.3): non si applicano ad Aperture/Finale. */
  protected readonly isMiddlegame = computed(() => this.study()?.phase === 'MIDDLEGAME');
  protected readonly classified = computed(() => this.study()?.studyType != null);
  protected readonly studyTypeLabel = studyTypeLabel;
  protected readonly themeLabel = themeLabel;
  protected readonly difficultyLabel = difficultyLabel;
  protected readonly lastOutcomeLabel = lastOutcomeLabel;
  protected readonly formatReviewDate = formatReviewDate;

  /** Form inline di modifica dei metadati (ISSUE-012). */
  protected readonly editing = signal(false);
  protected readonly savingEdit = signal(false);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editColor = signal<StudyColor | ''>('');

  /** Classificazione una tantum di un Mediogioco «Da classificare» (R26.3, task 2.3/5.2). */
  protected readonly classifying = signal(false);
  protected readonly savingClassify = signal(false);
  protected readonly classifyType = signal<StudyType | ''>('');

  /** Riepilogo dei tentativi per posizione (R26.3, task 5.6), indicizzato per posizione. */
  protected readonly attemptsSummary = signal<Map<number, PositionAttemptsSummary>>(new Map());
  /** Riordino numerico e drag-and-drop (R26.3, task 5.5): una richiesta alla volta. */
  protected readonly reordering = signal(false);
  private readonly dragIndex = signal<number | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const expected = this.context?.phase;
    this.service.getStudy(id).subscribe({
      next: (s) => {
        // Controllo esatto della fase (ISSUE-016): un id valido di un'altra
        // sezione non deve essere presentato come contenuto di questa.
        if (expected && s.phase !== expected) {
          this.error.set(`Questo studio non appartiene alla sezione ${this.parentLabel}.`);
          return;
        }
        this.study.set(s);
        if (s.phase === 'MIDDLEGAME') {
          this.loadAttemptsSummary(s.id);
        }
      },
      error: () => this.error.set('Studio non trovato.'),
    });
  }

  /** Best-effort: l'assenza del riepilogo non impedisce di consultare lo studio. */
  private loadAttemptsSummary(studyId: number): void {
    this.service.getAttemptsSummary(studyId).subscribe({
      next: (summary) => {
        this.attemptsSummary.set(new Map(summary.map((s) => [s.variantId, s])));
      },
      error: () => this.attemptsSummary.set(new Map()),
    });
  }

  /** Riepilogo di una posizione, o `undefined` se non ancora caricato/mai tentata. */
  protected summaryFor(variantId: number): PositionAttemptsSummary | undefined {
    return this.attemptsSummary().get(variantId);
  }

  /** Apre il form inline precompilato con i metadati correnti. */
  protected openEdit(): void {
    const s = this.study();
    if (!s) {
      return;
    }
    this.editName.set(s.name);
    this.editDescription.set(s.description ?? '');
    this.editColor.set(s.color ?? '');
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected saveEdit(): void {
    const s = this.study();
    const name = this.editName().trim();
    if (!s || !name || this.savingEdit()) {
      return;
    }
    this.savingEdit.set(true);
    // `phase` omessa di proposito: è scelta alla creazione e mai modificabile
    // (ISSUE-016); il backend la mantiene quando assente dalla richiesta.
    this.service
      .updateStudy(s.id, {
        name,
        description: this.editDescription().trim() || null,
        color: this.isOpening() ? this.editColor() || null : null,
      })
      .subscribe({
        next: (updated) => {
          this.study.update((cur) =>
            cur
              ? {
                  ...cur,
                  name: updated.name,
                  description: updated.description,
                  color: this.isOpening() ? updated.color : null,
                }
              : cur,
          );
          this.savingEdit.set(false);
          this.editing.set(false);
          this.toast.success('Studio aggiornato.');
        },
        error: (err) => {
          this.savingEdit.set(false);
          this.toast.error(validationMessage(err) ?? 'Salvataggio non riuscito.');
        },
      });
  }

  protected async removeVariant(variant: Variant): Promise<void> {
    const label = this.itemLabel();
    const ok = await this.confirm.ask({
      title: `Elimina ${label}`,
      message: `Eliminare definitivamente «${variant.name}»? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.deletingId.set(variant.id);
    this.variantService.deleteVariant(variant.id).subscribe({
      next: () => {
        this.study.update((s) =>
          s
            ? {
                ...s,
                variants: (s.variants ?? []).filter((v) => v.id !== variant.id),
                variantCount: Math.max(0, s.variantCount - 1),
              }
            : s,
        );
        this.deletingId.set(null);
        this.toast.success(`${label[0].toUpperCase()}${label.slice(1)} eliminata.`);
      },
      error: () => {
        this.deletingId.set(null);
        this.toast.error('Eliminazione non riuscita.');
      },
    });
  }

  protected async removeStudy(): Promise<void> {
    const s = this.study();
    if (!s) {
      return;
    }
    const count = s.variantCount;
    const label = this.itemLabel();
    const warning =
      count > 0
        ? ` Verranno eliminate anche le sue ${count} ${count === 1 ? label : this.itemLabelPlural()}.`
        : '';
    const ok = await this.confirm.ask({
      title: 'Elimina studio',
      message: `Eliminare definitivamente lo studio «${s.name}»?${warning} L'operazione non è reversibile.`,
      confirmLabel: 'Elimina studio',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.deletingStudy.set(true);
    this.service.deleteStudy(s.id).subscribe({
      next: () => {
        this.toast.success('Studio eliminato.');
        // Ritorno alla lista della sezione: `/` per le Aperture (ISSUE-016).
        this.router.navigate([this.paths.studyList]);
      },
      error: () => {
        this.deletingStudy.set(false);
        this.toast.error('Eliminazione non riuscita.');
      },
    });
  }

  /** Apre il pannello di classificazione una tantum (R26.3). */
  protected openClassify(): void {
    this.classifyType.set('');
    this.classifying.set(true);
  }

  protected cancelClassify(): void {
    this.classifying.set(false);
  }

  /**
   * Persiste la scelta `TACTICAL`/`STRATEGIC` su un Mediogioco «Da
   * classificare» (R26.3): unica transizione ammessa, poi immutabile. Il
   * resto dei metadati non cambia, quindi viaggia invariato con l'update.
   */
  protected saveClassify(): void {
    const s = this.study();
    const type = this.classifyType();
    if (!s || !type || this.savingClassify()) {
      return;
    }
    this.savingClassify.set(true);
    this.service
      .updateStudy(s.id, {
        name: s.name,
        description: s.description ?? null,
        color: null,
        studyType: type,
      })
      .subscribe({
        next: (updated) => {
          this.study.update((cur) => (cur ? { ...cur, studyType: updated.studyType } : cur));
          this.savingClassify.set(false);
          this.classifying.set(false);
          this.toast.success('Studio classificato.');
        },
        error: (err) => {
          this.savingClassify.set(false);
          this.toast.error(validationMessage(err) ?? 'Classificazione non riuscita.');
        },
      });
  }

  /** Sposta una posizione di una riga verso l'inizio (riordino numerico, task 5.5). */
  protected moveUp(index: number): void {
    this.reorder(index, index - 1);
  }

  /** Sposta una posizione di una riga verso la fine (riordino numerico, task 5.5). */
  protected moveDown(index: number): void {
    this.reorder(index, index + 1);
  }

  protected onDragStart(index: number): void {
    this.dragIndex.set(index);
  }

  protected dragIndexIs(index: number): boolean {
    return this.dragIndex() === index;
  }

  protected onDragOver(event: DragEvent): void {
    // Necessario per rendere la riga una destinazione di drop valida (API nativa).
    event.preventDefault();
  }

  protected onDrop(index: number): void {
    const from = this.dragIndex();
    this.dragIndex.set(null);
    if (from === null || from === index) {
      return;
    }
    this.reorder(from, index);
  }

  /**
   * Riordino atomico via `PUT .../variants/order` (R26.3, task 5.5): aggiorna
   * subito la vista, poi ripristina l'ordine precedente se l'API fallisce.
   */
  private reorder(from: number, to: number): void {
    const s = this.study();
    const current = s?.variants ?? null;
    if (
      !s ||
      s.phase !== 'MIDDLEGAME' ||
      !current ||
      this.reordering() ||
      to < 0 ||
      to >= current.length ||
      from === to
    ) {
      return;
    }
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    this.reordering.set(true);
    this.study.set({ ...s, variants: next });
    this.service.reorderVariants(s.id, next.map((v) => v.id)).subscribe({
      next: (updated) => {
        this.reordering.set(false);
        this.study.update((cur) => (cur ? { ...cur, variants: updated } : cur));
      },
      error: () => {
        this.reordering.set(false);
        this.study.update((cur) => (cur ? { ...cur, variants: current } : cur));
        this.toast.error("Riordino non riuscito: ripristinato l'ordine precedente.");
      },
    });
  }

  protected colorLabel(color: StudyColor | null | undefined): string {
    switch (color) {
      case 'WHITE':
        return 'Bianco';
      case 'BLACK':
        return 'Nero';
      case 'MIXED':
        return 'Misto';
      default:
        return '';
    }
  }
}
