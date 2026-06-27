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
import { Chessboard, MoveMade } from '../chessboard/chessboard';
import { EvalBar } from '../chessboard/eval-bar';
import { VariantService } from '../core/variant.service';
import { StudyService } from '../core/study.service';
import { StockfishService } from '../core/stockfish.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { CanComponentDeactivate } from './can-deactivate.guard';
import {
  CreateVariantRequest,
  MoveNode,
  VariantColor,
  validationMessage,
} from '../core/variant.model';
import {
  addChild,
  buildTokens,
  childrenAt,
  fenAt,
  fromLine,
  isOnMainline,
  lineSans,
  mainline,
  pathsEqual,
  promoteToMainline,
  removeNode,
} from '../core/move-tree';

@Component({
  selector: 'app-variant-editor',
  imports: [FormsModule, RouterLink, Chessboard, EvalBar],
  templateUrl: './variant-editor.html',
  styleUrl: './variant-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantEditor implements CanComponentDeactivate, OnDestroy {
  private readonly service = inject(VariantService);
  private readonly studyService = inject(StudyService);
  private readonly stockfish = inject(StockfishService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Stato del motore Stockfish (Prototipo 16): aiuto allo studio, mai in allenamento. */
  protected readonly engineOn = signal(false);
  protected readonly showEvalBar = signal(true);
  protected readonly engineEval = this.stockfish.evaluation;
  protected readonly engineThinking = this.stockfish.thinking;
  protected readonly engineAvailable = this.stockfish.available;

  /** Studio a cui agganciare la nuova variante (da query param ?studyId), se presente. */
  protected readonly studyId = signal<number | null>(null);

  /** true se ci sono modifiche non salvate (per il guard di uscita). */
  protected readonly dirty = signal(false);

  protected readonly name = signal('');
  protected readonly color = signal<VariantColor>('WHITE');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly editId = signal<number | null>(null);
  protected readonly isEdit = computed(() => this.editId() !== null);

  protected readonly tree = signal<MoveNode[]>([]);
  protected readonly currentPath = signal<number[]>([]);
  private readonly startingFen = signal<string>('');

  protected readonly fen = computed(() =>
    fenAt(this.startingFen(), this.tree(), this.currentPath()),
  );
  protected readonly tokens = computed(() => buildTokens(this.tree()));
  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.color() === 'BLACK' ? 'black' : 'white',
  );
  protected readonly atStart = computed(() => this.currentPath().length === 0);
  protected readonly atLeaf = computed(
    () => childrenAt(this.tree(), this.currentPath()).length === 0,
  );
  protected readonly moveCount = computed(() => this.currentPath().length);

  /** Sequenza SAN della linea corrente e stato del ramo (mainline o variante). */
  protected readonly currentLine = computed(() => lineSans(this.tree(), this.currentPath()));
  protected readonly onMainline = computed(() => isOnMainline(this.currentPath()));
  protected readonly canPromote = computed(
    () => this.currentPath().length > 0 && !this.onMainline(),
  );
  /** Conferma in sospeso per la cancellazione di un sottoalbero. */
  protected readonly confirmingDelete = signal(false);

  constructor() {
    const studyParam = this.route.snapshot.queryParamMap.get('studyId');
    if (studyParam) {
      this.studyId.set(Number(studyParam));
    }
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editId.set(id);
      this.service.getVariant(id).subscribe({
        next: (v) => {
          this.name.set(v.name);
          this.color.set(v.color);
          this.startingFen.set(v.startingFen ?? '');
          this.tree.set(v.tree && v.tree.length ? v.tree : fromLine(v.moves));
          this.currentPath.set([]);
        },
        error: () => this.error.set('Variante non trovata.'),
      });
    }
    // Motore acceso → analizza la posizione corrente a ogni cambio.
    effect(() => {
      const fen = this.fen();
      if (this.engineOn() && fen) {
        this.stockfish.analyse(fen);
      }
    });
  }

  protected toggleEngine(): void {
    const next = !this.engineOn();
    this.engineOn.set(next);
    if (!next) {
      this.stockfish.stop();
    }
  }

  protected toggleEvalBar(): void {
    this.showEvalBar.update((v) => !v);
  }

  /** Apre "gioca contro il computer" in una nuova tab con la FEN corrente. */
  protected playVsComputer(): void {
    window.open(`/play?fen=${encodeURIComponent(this.fen())}`, '_blank');
  }

  ngOnDestroy(): void {
    this.stockfish.dispose();
  }

  /** Mossa legale giocata: segue il figlio esistente o crea una nuova variante. */
  protected onMove(move: MoveMade): void {
    this.confirmingDelete.set(false);
    const kids = childrenAt(this.tree(), this.currentPath());
    const existing = kids.findIndex((c) => c.san === move.san);
    if (existing >= 0) {
      this.currentPath.update((p) => [...p, existing]);
      return;
    }
    const { tree, index } = addChild(this.tree(), this.currentPath(), move.san);
    this.tree.set(tree);
    this.currentPath.update((p) => [...p, index]);
    this.dirty.set(true);
  }

  /** Aggiornamento del nome dal form (marca le modifiche come non salvate). */
  protected onNameChange(value: string): void {
    this.name.set(value);
    this.dirty.set(true);
  }

  /** Aggiornamento del lato da allenare dal form. */
  protected onColorChange(value: VariantColor): void {
    this.color.set(value);
    this.dirty.set(true);
  }

  protected isCurrent(path: number[] | undefined): boolean {
    return !!path && pathsEqual(path, this.currentPath());
  }

  protected goTo(path: number[] | undefined): void {
    if (path) {
      this.confirmingDelete.set(false);
      this.currentPath.set([...path]);
    }
  }

  protected first(): void {
    this.confirmingDelete.set(false);
    this.currentPath.set([]);
  }

  protected prev(): void {
    this.confirmingDelete.set(false);
    this.currentPath.update((p) => p.slice(0, -1));
  }

  protected next(): void {
    if (childrenAt(this.tree(), this.currentPath()).length > 0) {
      this.confirmingDelete.set(false);
      this.currentPath.update((p) => [...p, 0]);
    }
  }

  /** Promuove la linea corrente a mainline (il ramo scelto diventa il principale). */
  protected makeMainline(): void {
    const path = this.currentPath();
    if (path.length === 0 || isOnMainline(path)) {
      return;
    }
    this.tree.set(promoteToMainline(this.tree(), path));
    // la stessa linea ora è il percorso di soli zeri
    this.currentPath.set(path.map(() => 0));
    this.dirty.set(true);
  }

  /**
   * Richiede la cancellazione del nodo corrente. Se il nodo ha figli (sottoalbero)
   * chiede conferma; una mossa-foglia viene rimossa direttamente.
   */
  protected deleteCurrent(): void {
    const path = this.currentPath();
    if (path.length === 0) {
      return;
    }
    if (childrenAt(this.tree(), path).length > 0) {
      this.confirmingDelete.set(true);
      return;
    }
    this.performDelete();
  }

  /** Conferma la cancellazione del sottoalbero. */
  protected confirmDelete(): void {
    this.confirmingDelete.set(false);
    this.performDelete();
  }

  /** Annulla la cancellazione in sospeso. */
  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  private performDelete(): void {
    const path = this.currentPath();
    if (path.length === 0) {
      return;
    }
    this.tree.set(removeNode(this.tree(), path));
    this.currentPath.update((p) => p.slice(0, -1));
    this.dirty.set(true);
  }

  protected reset(): void {
    this.confirmingDelete.set(false);
    this.tree.set([]);
    this.currentPath.set([]);
    this.dirty.set(true);
  }

  /** Guard di uscita: chiede conferma se ci sono modifiche non salvate. */
  canDeactivate(): boolean | Promise<boolean> {
    if (!this.dirty()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Modifiche non salvate',
      message: 'Hai modifiche non salvate. Vuoi uscire senza salvarle?',
      confirmLabel: 'Esci senza salvare',
      danger: true,
    });
  }

  protected save(): void {
    const name = this.name().trim();
    if (!name) {
      this.error.set('Inserisci un nome per la variante.');
      return;
    }
    if (this.tree().length === 0) {
      this.error.set('Gioca almeno una mossa sulla scacchiera.');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    const request: CreateVariantRequest = {
      name,
      color: this.color(),
      moves: mainline(this.tree()),
      tree: this.tree(),
    };
    const id = this.editId();
    const studyId = this.studyId();
    const save$ = id !== null
      ? this.service.updateVariant(id, request)
      : studyId !== null
        ? this.studyService.addVariant(studyId, request)
        : this.service.createVariant(request);
    save$.subscribe({
      next: (saved) => {
        this.dirty.set(false);
        this.toast.success(this.isEdit() ? 'Variante aggiornata.' : 'Variante salvata.');
        this.router.navigate(['/variants', saved.id]);
      },
      error: (err) => {
        const msg = validationMessage(err) ?? 'Salvataggio non riuscito.';
        this.error.set(msg);
        this.toast.error(msg);
        this.saving.set(false);
      },
    });
  }
}
