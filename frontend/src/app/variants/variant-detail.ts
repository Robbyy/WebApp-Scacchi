import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chessboard } from '../chessboard/chessboard';
import { VariantService } from '../core/variant.service';
import { MoveNode, Variant } from '../core/variant.model';
import {
  buildTokens,
  childrenAt,
  fenAt,
  fromLine,
  mainline,
  pathsEqual,
} from '../core/move-tree';

@Component({
  selector: 'app-variant-detail',
  imports: [RouterLink, Chessboard],
  templateUrl: './variant-detail.html',
  styleUrl: './variant-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantDetail implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(VariantService);

  protected readonly variant = signal<Variant | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Percorso (indici di figlio dalla radice) del nodo selezionato; vuoto = posizione iniziale. */
  protected readonly currentPath = signal<number[]>([]);
  protected readonly playing = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly tree = computed<MoveNode[]>(() => {
    const v = this.variant();
    if (!v) {
      return [];
    }
    return v.tree && v.tree.length ? v.tree : fromLine(v.moves);
  });

  protected readonly tokens = computed(() => buildTokens(this.tree()));
  protected readonly mainlineLength = computed(() => mainline(this.tree()).length);
  protected readonly orientation = computed<'white' | 'black'>(() =>
    this.variant()?.color === 'BLACK' ? 'black' : 'white',
  );
  protected readonly currentFen = computed<string>(() =>
    fenAt(this.variant()?.startingFen, this.tree(), this.currentPath()),
  );
  protected readonly atStart = computed(() => this.currentPath().length === 0);
  protected readonly atLeaf = computed(
    () => childrenAt(this.tree(), this.currentPath()).length === 0,
  );

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getVariant(id).subscribe({
      next: (v) => this.variant.set(v),
      error: () => this.error.set('Variante non trovata.'),
    });
  }

  protected isCurrent(path: number[] | undefined): boolean {
    return !!path && pathsEqual(path, this.currentPath());
  }

  protected goTo(path: number[] | undefined): void {
    if (!path) {
      return;
    }
    this.stop();
    this.currentPath.set([...path]);
  }

  protected first(): void {
    this.stop();
    this.currentPath.set([]);
  }

  protected prev(): void {
    this.stop();
    this.currentPath.update((p) => p.slice(0, -1));
  }

  protected next(): void {
    if (childrenAt(this.tree(), this.currentPath()).length > 0) {
      this.currentPath.update((p) => [...p, 0]);
    }
  }

  protected last(): void {
    this.stop();
    let path = [...this.currentPath()];
    let kids = childrenAt(this.tree(), path);
    while (kids.length > 0) {
      path = [...path, 0];
      kids = kids[0].children;
    }
    this.currentPath.set(path);
  }

  protected togglePlay(): void {
    if (this.playing()) {
      this.stop();
      return;
    }
    if (childrenAt(this.tree(), this.currentPath()).length === 0) {
      return;
    }
    this.playing.set(true);
    this.timer = setInterval(() => {
      if (childrenAt(this.tree(), this.currentPath()).length === 0) {
        this.stop();
        return;
      }
      this.next();
    }, 900);
  }

  private stop(): void {
    this.playing.set(false);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      this.prev();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.next();
      event.preventDefault();
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
