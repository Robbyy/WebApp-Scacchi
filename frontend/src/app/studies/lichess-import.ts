import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import {
  ImportedChapter,
  LichessStudyImport,
  LichessStudyRef,
  parseLichessStudyPgn,
  parseLichessStudyUrl,
} from '../core/lichess';

const LICHESS_PROVIDER = 'LICHESS';

@Component({
  selector: 'app-lichess-import',
  imports: [FormsModule, RouterLink],
  templateUrl: './lichess-import.html',
  styleUrl: './lichess-import.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessImport {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lichess = inject(LichessService);
  private readonly auth = inject(LichessAuthService);
  private readonly studyService = inject(StudyService);
  private readonly toast = inject(ToastService);

  /** Stato della connessione OAuth a Lichess (per leggere studi privati/unlisted). */
  protected readonly connected = this.auth.connected;

  /** Studio locale di destinazione, se l'import parte dal dettaglio di uno studio. */
  protected readonly studyId = signal<number | null>(null);

  protected readonly url = signal('');
  protected readonly studyName = signal('');
  protected readonly loading = signal(false);
  protected readonly importing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly preview = signal<LichessStudyImport | null>(null);

  /** Riferimento Lichess dell'ultima anteprima (per l'upsert). */
  private readonly ref = signal<LichessStudyRef | null>(null);
  /** Studio locale già importato da questo studio Lichess, se esiste (P15). */
  protected readonly existingStudy = signal<Study | null>(null);

  protected readonly chapters = computed<ImportedChapter[]>(() => this.preview()?.chapters ?? []);
  protected readonly failed = computed(() => this.preview()?.failed ?? []);
  protected readonly canImport = computed(() => this.chapters().length > 0 && !this.importing());
  /** Lo studio sarà aggiornato (esiste già) anziché creato? Solo nel flusso "nuovo studio". */
  protected readonly willUpdate = computed(
    () => this.studyId() === null && this.existingStudy() !== null,
  );

  /** Colore complessivo: unico se tutti i capitoli concordano, altrimenti misto. */
  protected readonly studyColor = computed<StudyColor>(() => {
    const colors = new Set(this.chapters().map((c) => c.color));
    if (colors.size === 1) {
      return [...colors][0];
    }
    return 'MIXED';
  });

  constructor() {
    const studyParam = this.route.snapshot.queryParamMap.get('studyId');
    if (studyParam) {
      this.studyId.set(Number(studyParam));
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
        this.studyName.set(result.studyName);
        this.detectExisting(ref.studyId);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.describeFetchError(err));
      },
    });
  }

  /** Cerca uno studio locale già importato da questo studio Lichess (per l'avviso di upsert). */
  private detectExisting(sourceStudyId: string): void {
    if (this.studyId() !== null) {
      return; // import di un capitolo dentro uno studio specifico: nessun upsert
    }
    this.studyService.getStudies().subscribe({
      next: (studies) => {
        const match = studies.find(
          (s) => s.sourceProvider === LICHESS_PROVIDER && s.sourceStudyId === sourceStudyId,
        );
        this.existingStudy.set(match ?? null);
      },
      error: () => this.existingStudy.set(null),
    });
  }

  protected doImport(): void {
    const chapters = this.chapters();
    if (chapters.length === 0) {
      return;
    }
    this.importing.set(true);
    const variants = chapters.map((c) => ({
      name: c.name,
      color: c.color,
      moves: c.mainline,
      tree: c.tree,
      sourcePgn: c.sourcePgn,
    }));

    const targetStudy = this.studyId();
    if (targetStudy !== null) {
      // Import dentro uno studio locale esistente: una variante per capitolo.
      forkJoin(variants.map((v) => this.studyService.addVariant(targetStudy, v))).subscribe({
        next: () => {
          this.toast.success(`Importati ${variants.length} capitoli nello studio.`);
          this.router.navigate(['/studies', targetStudy]);
        },
        error: (err) => this.onImportError(err),
      });
      return;
    }

    // Import/sync come studio locale (upsert per riferimento remoto, P15).
    const ref = this.ref();
    const name = this.studyName().trim() || 'Studio importato';
    const updating = this.willUpdate();
    this.studyService
      .importLichess({
        name,
        color: this.studyColor(),
        sourceProvider: LICHESS_PROVIDER,
        sourceStudyId: ref?.studyId ?? null,
        sourceUrl: ref ? `https://lichess.org/study/${ref.studyId}` : null,
        variants,
      })
      .subscribe({
        next: (study) => {
          this.toast.success(
            updating ? 'Studio aggiornato da Lichess.' : 'Studio importato da Lichess.',
          );
          this.router.navigate(['/studies', study.id]);
        },
        error: (err) => this.onImportError(err),
      });
  }

  private onImportError(err: unknown): void {
    this.importing.set(false);
    const msg = validationMessage(err) ?? 'Import non riuscito.';
    this.error.set(msg);
    this.toast.error(msg);
  }

  /** Avvia l'OAuth Lichess per leggere studi privati/unlisted; torna a questa pagina. */
  protected connectLichess(): void {
    const returnTo = this.studyId() !== null
      ? `/studies/import-lichess?studyId=${this.studyId()}`
      : '/studies/import-lichess';
    void this.auth.connect(returnTo);
  }

  protected disconnectLichess(): void {
    this.auth.disconnect();
    this.toast.info('Disconnesso da Lichess.');
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
