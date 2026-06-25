import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chessboard, MoveMade } from '../chessboard/chessboard';
import { VariantService } from '../core/variant.service';
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
  mainline,
  pathsEqual,
  removeNode,
} from '../core/move-tree';

@Component({
  selector: 'app-variant-editor',
  imports: [FormsModule, RouterLink, Chessboard],
  templateUrl: './variant-editor.html',
  styleUrl: './variant-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantEditor {
  private readonly service = inject(VariantService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

  constructor() {
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
  }

  /** Mossa legale giocata: segue il figlio esistente o crea una nuova variante. */
  protected onMove(move: MoveMade): void {
    const kids = childrenAt(this.tree(), this.currentPath());
    const existing = kids.findIndex((c) => c.san === move.san);
    if (existing >= 0) {
      this.currentPath.update((p) => [...p, existing]);
      return;
    }
    const { tree, index } = addChild(this.tree(), this.currentPath(), move.san);
    this.tree.set(tree);
    this.currentPath.update((p) => [...p, index]);
  }

  protected isCurrent(path: number[] | undefined): boolean {
    return !!path && pathsEqual(path, this.currentPath());
  }

  protected goTo(path: number[] | undefined): void {
    if (path) {
      this.currentPath.set([...path]);
    }
  }

  protected first(): void {
    this.currentPath.set([]);
  }

  protected prev(): void {
    this.currentPath.update((p) => p.slice(0, -1));
  }

  protected next(): void {
    if (childrenAt(this.tree(), this.currentPath()).length > 0) {
      this.currentPath.update((p) => [...p, 0]);
    }
  }

  /** Rimuove il nodo corrente (e il suo sottoalbero) e torna al precedente. */
  protected deleteCurrent(): void {
    const path = this.currentPath();
    if (path.length === 0) {
      return;
    }
    this.tree.set(removeNode(this.tree(), path));
    this.currentPath.update((p) => p.slice(0, -1));
  }

  protected reset(): void {
    this.tree.set([]);
    this.currentPath.set([]);
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
    const save$ = id !== null
      ? this.service.updateVariant(id, request)
      : this.service.createVariant(request);
    save$.subscribe({
      next: (saved) => this.router.navigate(['/variants', saved.id]),
      error: (err) => {
        this.error.set(validationMessage(err) ?? 'Salvataggio non riuscito.');
        this.saving.set(false);
      },
    });
  }
}
