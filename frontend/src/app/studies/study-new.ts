import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { StudyService } from '../core/study.service';
import { LichessService } from '../core/lichess.service';
import { LichessAuthService } from '../core/lichess-auth.service';
import { ToastService } from '../core/toast.service';
import { validationMessage } from '../core/variant.model';
import { Study, StudyColor } from '../core/study.model';
import { StudyFormFields } from './study-form-fields';
import {
  ImportedChapter,
  LichessStudyImport,
  LichessStudyRef,
  parseLichessStudyPgn,
  parseLichessStudyUrl,
} from '../core/lichess';

const LICHESS_PROVIDER = 'LICHESS';

/**
 * Bozza del form in `sessionStorage` (ISSUE-011): scritta a ogni modifica dei
 * campi, eliminata da `ngOnDestroy`. Sopravvive quindi solo agli unload pieni
 * della pagina — in particolare al redirect OAuth verso Lichess — e viene
 * ripristinata al ritorno dal callback.
 */
const DRAFT_KEY = 'was.studyNew.draft';

interface StudyNewDraft {
  studyId: number | null;
  url: string;
  name: string;
  description: string;
  color: StudyColor | '';
}

/**
 * Pagina unica di creazione/import di uno studio (ISSUE-011, R22): sostituisce
 * il form inline della home e la pagina dedicata di import Lichess. Senza link
 * Lichess crea uno studio locale vuoto (`createStudy`); con link e anteprima
 * importa/aggiorna via upsert (`importLichess`); con `?studyId` aggiunge una
 * variante per capitolo allo studio locale indicato (contratto invariato).
 * In R22 la pagina crea/importa esclusivamente studi `OPENING`: la fase non è
 * esposta e resta il default del contratto.
 */
@Component({
  selector: 'app-study-new',
  imports: [FormsModule, RouterLink, StudyFormFields],
  templateUrl: './study-new.html',
  styleUrl: './study-new.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyNew implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lichess = inject(LichessService);
  private readonly auth = inject(LichessAuthService);
  private readonly studyService = inject(StudyService);
  private readonly toast = inject(ToastService);

  /** Connessione OAuth a Lichess: il comando vive nella topbar (ISSUE-011). */
  protected readonly connected = this.auth.connected;

  /** Studio locale di destinazione, se l'import parte dal dettaglio di uno studio. */
  protected readonly targetStudyId = signal<number | null>(null);
  /** Studio di destinazione caricato (verifica di esistenza e intestazione). */
  protected readonly targetStudy = signal<Study | null>(null);
  /** Errore dedicato quando `?studyId` non è valido (inesistente o non Aperture). */
  protected readonly targetError = signal<string | null>(null);

  /** Campi locali dello studio (modello condiviso con la modifica, ISSUE-012). */
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly color = signal<StudyColor | ''>('');

  protected readonly url = signal('');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly preview = signal<LichessStudyImport | null>(null);

  /** Riferimento Lichess dell'ultima anteprima (per l'upsert). */
  private readonly ref = signal<LichessStudyRef | null>(null);
  /** Studio locale già importato da questo studio Lichess, se esiste (P15). */
  protected readonly existingStudy = signal<Study | null>(null);

  /**
   * Ultimi valori scritti nei campi dall'app (suggerimenti Lichess o metadati
   * dello studio esistente): una nuova anteprima può sovrascriverli, ma non
   * sovrascrive mai un valore digitato dall'utente.
   */
  private suggestedName = '';
  private suggestedColor: StudyColor | '' = '';

  protected readonly chapters = computed<ImportedChapter[]>(() => this.preview()?.chapters ?? []);
  protected readonly failed = computed(() => this.preview()?.failed ?? []);
  /** Lo studio sarà aggiornato (esiste già) anziché creato? Solo nel flusso "nuovo studio". */
  protected readonly willUpdate = computed(
    () => this.targetStudyId() === null && this.existingStudy() !== null,
  );

  /** L'URL è compilato ma l'anteprima non è stata ancora generata. */
  protected readonly needsPreview = computed(
    () => this.preview() === null && this.url().trim() !== '' && !this.loading(),
  );

  protected readonly canSubmit = computed(() => {
    if (this.saving()) {
      return false;
    }
    if (this.targetStudyId() !== null) {
      return this.targetStudy() !== null && this.chapters().length > 0;
    }
    if (this.preview() !== null) {
      return this.chapters().length > 0 && (this.willUpdate() || this.name().trim() !== '');
    }
    // Creazione locale: nome obbligatorio; con un link incollato serve prima l'anteprima.
    return this.name().trim() !== '' && this.url().trim() === '';
  });

  protected readonly submitLabel = computed(() => {
    if (this.saving()) {
      return this.targetStudyId() !== null || this.preview() !== null
        ? 'Importazione…'
        : 'Salvataggio…';
    }
    if (this.targetStudyId() !== null) {
      return 'Importa nello studio';
    }
    if (this.preview() !== null) {
      return this.willUpdate() ? 'Aggiorna lo studio' : 'Importa come nuovo studio';
    }
    return 'Crea studio';
  });

  constructor() {
    const studyParam = this.route.snapshot.queryParamMap.get('studyId');
    if (studyParam !== null) {
      const id = Number(studyParam);
      if (!Number.isInteger(id) || id <= 0) {
        this.targetError.set('Studio di destinazione non valido.');
      } else {
        this.targetStudyId.set(id);
        this.loadTargetStudy(id);
      }
    }
    this.restoreDraft();
    // Autosalvataggio bozza: la navigazione in-app passa da ngOnDestroy che la
    // elimina; resta viva solo attraverso il redirect OAuth (unload pieno).
    effect(() => this.storeDraft());
  }

  ngOnDestroy(): void {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // sessionStorage non disponibile: niente da eliminare.
    }
  }

  protected onUrlChange(value: string): void {
    this.url.set(value);
    const current = this.ref();
    if (this.preview() === null && current === null) {
      return;
    }
    // Un URL diverso da quello dell'anteprima corrente la invalida: evita di
    // importare lo studio A mentre il campo mostra il link dello studio B.
    const next = parseLichessStudyUrl(value);
    if (
      next === null ||
      current === null ||
      next.studyId !== current.studyId ||
      next.chapterId !== current.chapterId
    ) {
      this.preview.set(null);
      this.ref.set(null);
      this.existingStudy.set(null);
      this.error.set(null);
    }
  }

  protected loadPreview(): void {
    const ref = parseLichessStudyUrl(this.url());
    if (!ref) {
      this.error.set('Link Lichess non valido. Incolla un URL come https://lichess.org/study/XXXXXXXX');
      this.preview.set(null);
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.preview.set(null);
    this.ref.set(ref);
    this.existingStudy.set(null);

    const fetch$ = ref.chapterId
      ? this.lichess.fetchChapterPgn(ref.studyId, ref.chapterId)
      : this.lichess.fetchStudyPgn(ref.studyId);

    fetch$.subscribe({
      next: (pgn) => {
        const result = parseLichessStudyPgn(pgn);
        this.loading.set(false);
        if (result.chapters.length === 0 && result.failed.length === 0) {
          this.error.set('Nessun capitolo trovato nello studio.');
          return;
        }
        this.preview.set(result);
        if (this.targetStudyId() === null) {
          this.applySuggestions(result);
          this.detectExisting(ref.studyId);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.describeFetchError(err));
      },
    });
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const target = this.targetStudyId();
    if (target !== null) {
      this.importIntoStudy(target);
      return;
    }
    if (this.preview() !== null) {
      this.importAsStudy();
      return;
    }
    this.createLocalStudy();
  }

  /** Flusso 1 (mini-spec): senza link Lichess crea uno studio locale vuoto. */
  private createLocalStudy(): void {
    const name = this.name().trim();
    if (!name) {
      return;
    }
    this.saving.set(true);
    this.studyService
      .createStudy({
        name,
        description: this.description().trim() || null,
        color: this.color() || null,
      })
      .subscribe({
        next: (study) => {
          this.toast.success('Studio creato.');
          this.router.navigate(['/studies', study.id]);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(validationMessage(err) ?? 'Creazione non riuscita.');
        },
      });
  }

  /** Flussi 2 e 3: import/sync come studio locale (upsert per riferimento remoto, P15). */
  private importAsStudy(): void {
    const chapters = this.chapters();
    if (chapters.length === 0) {
      return;
    }
    this.saving.set(true);
    const ref = this.ref();
    const updating = this.willUpdate();
    this.studyService
      .importLichess({
        name: this.name().trim() || 'Studio importato',
        description: this.description().trim() || null,
        color: this.color() || null,
        sourceProvider: LICHESS_PROVIDER,
        sourceStudyId: ref?.studyId ?? null,
        sourceUrl: ref ? `https://lichess.org/study/${ref.studyId}` : null,
        variants: chapters.map(toVariantRequest),
      })
      .subscribe({
        next: (study) => {
          this.toast.success(
            updating ? 'Studio aggiornato da Lichess.' : 'Studio importato da Lichess.',
          );
          this.router.navigate(['/studies', study.id]);
        },
        error: (err) => this.onSubmitError(err),
      });
  }

  /**
   * Flusso 4: import dentro uno studio locale esistente — una richiesta di
   * creazione per capitolo, senza upsert e senza nuova API transazionale.
   * Limite noto R22: in caso di errore a metà, i capitoli già creati restano.
   */
  private importIntoStudy(target: number): void {
    const chapters = this.chapters();
    if (chapters.length === 0) {
      return;
    }
    this.saving.set(true);
    forkJoin(chapters.map((c) => this.studyService.addVariant(target, toVariantRequest(c)))).subscribe({
      next: (created) => {
        this.toast.success(`Importati ${created.length} capitoli nello studio.`);
        this.router.navigate(['/studies', target]);
      },
      error: (err) => this.onSubmitError(err, true),
    });
  }

  private onSubmitError(err: unknown, partialPossible = false): void {
    this.saving.set(false);
    const base = validationMessage(err) ?? 'Import non riuscito.';
    const msg = partialPossible
      ? `${base} Alcuni capitoli potrebbero essere già stati aggiunti allo studio.`
      : base;
    this.error.set(msg);
    this.toast.error(msg);
  }

  /** Verifica che lo studio `?studyId` esista (e sia di Aperture) prima dell'import. */
  private loadTargetStudy(id: number): void {
    this.studyService.getStudy(id).subscribe({
      next: (study) => {
        if (study.phase !== 'OPENING') {
          this.targetError.set(
            "Lo studio di destinazione non è uno studio di Aperture: l'import da Lichess non è disponibile.",
          );
          return;
        }
        this.targetStudy.set(study);
      },
      error: () => this.targetError.set('Studio di destinazione non trovato.'),
    });
  }

  /**
   * Primo import (flusso 2): nome e colore suggeriti da Lichess precompilano il
   * form ma restano modificabili — un valore digitato dall'utente non viene toccato.
   */
  private applySuggestions(result: LichessStudyImport): void {
    const name = this.name().trim();
    if (name === '' || name === this.suggestedName) {
      this.name.set(result.studyName);
      this.suggestedName = result.studyName;
    }
    const suggested = overallColor(result.chapters);
    if (this.color() === '' || this.color() === this.suggestedColor) {
      this.color.set(suggested);
      this.suggestedColor = suggested;
    }
  }

  /** Cerca uno studio locale già importato da questo studio Lichess (avviso di upsert). */
  private detectExisting(sourceStudyId: string): void {
    this.studyService.getStudies().subscribe({
      next: (studies) => {
        const match = studies.find(
          (s) => s.sourceProvider === LICHESS_PROVIDER && s.sourceStudyId === sourceStudyId,
        );
        this.existingStudy.set(match ?? null);
        if (match) {
          // Upsert: i campi (disabilitati) mostrano i metadati locali che
          // resteranno invariati, non i suggerimenti Lichess.
          this.name.set(match.name);
          this.description.set(match.description ?? '');
          this.color.set(match.color ?? '');
          this.suggestedName = match.name;
          this.suggestedColor = match.color ?? '';
        }
      },
      error: () => this.existingStudy.set(null),
    });
  }

  private storeDraft(): void {
    const draft: StudyNewDraft = {
      studyId: this.targetStudyId(),
      url: this.url(),
      name: this.name(),
      description: this.description(),
      color: this.color(),
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // sessionStorage non disponibile: la bozza non sopravvive all'OAuth.
    }
  }

  private restoreDraft(): void {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(DRAFT_KEY);
    } catch {
      return;
    }
    if (!raw) {
      return;
    }
    try {
      const draft = JSON.parse(raw) as StudyNewDraft;
      // La bozza vale solo per lo stesso contesto (stesso `?studyId` o nessuno).
      if ((draft.studyId ?? null) !== this.targetStudyId()) {
        return;
      }
      this.url.set(draft.url ?? '');
      this.name.set(draft.name ?? '');
      this.description.set(draft.description ?? '');
      this.color.set(draft.color ?? '');
    } catch {
      // Bozza corrotta: si riparte dal form vuoto.
    }
  }

  protected colorLabel(color: StudyColor): string {
    return color === 'WHITE' ? 'Bianco' : color === 'BLACK' ? 'Nero' : 'Misto';
  }

  private describeFetchError(err: HttpErrorResponse): string {
    switch (err.status) {
      case 404:
        return 'Studio non trovato o non pubblico su Lichess.';
      case 429:
        return 'Troppe richieste a Lichess: attendi qualche istante e riprova.';
      case 0:
        return 'Impossibile contattare Lichess (rete o restrizioni del browser).';
      default:
        return `Errore da Lichess (${err.status}). Riprova più tardi.`;
    }
  }
}

/** Colore complessivo suggerito: unico se tutti i capitoli concordano, altrimenti misto. */
function overallColor(chapters: ImportedChapter[]): StudyColor {
  const colors = new Set(chapters.map((c) => c.color));
  return colors.size === 1 ? [...colors][0] : 'MIXED';
}

function toVariantRequest(c: ImportedChapter) {
  return {
    name: c.name,
    color: c.color,
    moves: c.mainline,
    tree: c.tree,
    sourcePgn: c.sourcePgn,
  };
}
