import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmService } from '../core/confirm.service';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { Study } from '../core/study.model';
import { SectionRouteContext, sectionLabel, sectionPaths } from '../core/study-sections';
import { studyTypeLabel } from '../core/middlegame-format';

/**
 * Lista degli studi di una sezione posizionale (ISSUE-016): chiede al backend i
 * soli studi della fase dichiarata dal contesto di route, quindi la stessa
 * pagina serve Mediogioco oggi e il Finale in R27 senza modifiche.
 *
 * Non è una variante della home Aperture: qui non esistono «Ripeti oggi»,
 * review, import PGN, import/sync Lichess, training o statistiche. Con
 * `StudyList` condivide solo il foglio di stile delle card, non il
 * comportamento.
 */
@Component({
  selector: 'app-position-study-list',
  imports: [RouterLink],
  templateUrl: './position-study-list.html',
  // Presentazione condivisa con la home Aperture (card, badge, griglia
  // adattiva): riusata dal foglio esistente per non duplicarne gli stili.
  styleUrls: ['../studies/study-list.css', './position-study-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionStudyList implements OnInit {
  private readonly service = inject(StudyService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Contesto della sezione, iniettato dai `data` della route (ISSUE-016). */
  readonly sectionContext = input.required<SectionRouteContext>();

  /** Etichetta della sezione, la stessa dei tab della topbar. */
  protected readonly label = computed(() => sectionLabel(this.sectionContext().section));
  /** Percorsi canonici della sezione: nessun URL generico `/studies/...`. */
  protected readonly paths = computed(() => sectionPaths(this.sectionContext()));
  /** Tipologia (Tattica/Strategia) valida solo per Mediogioco: `null` per Finale. */
  protected readonly isMiddlegame = computed(() => this.sectionContext().phase === 'MIDDLEGAME');
  protected readonly studyTypeLabel = studyTypeLabel;

  protected readonly studies = signal<Study[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.service.getStudiesByPhase(this.sectionContext().phase).subscribe({
      next: (studies) => {
        this.studies.set(studies);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossibile caricare gli studi.');
        this.loading.set(false);
      },
    });
  }

  protected async remove(study: Study): Promise<void> {
    const count = study.variantCount;
    const warning =
      count > 0 ? ` Verranno eliminate anche le sue ${count} ${this.itemLabel(count)}.` : '';
    const ok = await this.confirm.ask({
      title: 'Elimina studio',
      message: `Eliminare definitivamente lo studio «${study.name}»?${warning} L'operazione non è reversibile.`,
      confirmLabel: 'Elimina studio',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.deletingId.set(study.id);
    this.service.deleteStudy(study.id).subscribe({
      next: () => {
        this.studies.update((list) => list.filter((x) => x.id !== study.id));
        this.deletingId.set(null);
        this.toast.success('Studio eliminato.');
      },
      error: () => {
        this.deletingId.set(null);
        this.toast.error('Eliminazione non riuscita.');
      },
    });
  }

  /** «posizione/posizioni» nelle sezioni posizionali, «variante/varianti» altrove. */
  protected itemLabel(count: number): string {
    const position = this.sectionContext().positionMode;
    if (count === 1) {
      return position ? 'posizione' : 'variante';
    }
    return position ? 'posizioni' : 'varianti';
  }

}
