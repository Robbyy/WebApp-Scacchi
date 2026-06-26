import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { StudyService } from '../core/study.service';
import { LichessService } from '../core/lichess.service';
import { ToastService } from '../core/toast.service';
import { validationMessage } from '../core/variant.model';
import { StudyColor } from '../core/study.model';
import {
  ImportedChapter,
  LichessStudyImport,
  parseLichessStudyPgn,
  parseLichessStudyUrl,
} from '../core/lichess';

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
  private readonly studyService = inject(StudyService);
  private readonly toast = inject(ToastService);

  /** Studio locale di destinazione, se l'import parte dal dettaglio di uno studio. */
  protected readonly studyId = signal<number | null>(null);

  protected readonly url = signal('');
  protected readonly studyName = signal('');
  protected readonly loading = signal(false);
  protected readonly importing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly preview = signal<LichessStudyImport | null>(null);

  protected readonly chapters = computed<ImportedChapter[]>(() => this.preview()?.chapters ?? []);
  protected readonly failed = computed(() => this.preview()?.failed ?? []);
  protected readonly canImport = computed(() => this.chapters().length > 0 && !this.importing());

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
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.describeFetchError(err));
      },
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

    // Import come nuovo studio locale (endpoint transazionale).
    const name = this.studyName().trim() || 'Studio importato';
    this.studyService
      .importStudy({ name, color: this.studyColor(), variants })
      .subscribe({
        next: (study) => {
          this.toast.success('Studio importato da Lichess.');
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
