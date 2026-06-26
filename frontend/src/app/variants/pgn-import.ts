import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VariantService } from '../core/variant.service';
import { StudyService } from '../core/study.service';
import { CreateVariantRequest, MoveNode, VariantColor, validationMessage } from '../core/variant.model';
import { ToastService } from '../core/toast.service';
import { parsePgnTree } from '../core/pgn';
import { buildTokens } from '../core/move-tree';

type Preview =
  | { state: 'empty' }
  | { state: 'error'; message: string }
  | {
      state: 'ok';
      tree: MoveNode[];
      mainline: string[];
      nodeCount: number;
      variationCount: number;
      suggestedName: string;
    };

@Component({
  selector: 'app-pgn-import',
  imports: [FormsModule, RouterLink],
  templateUrl: './pgn-import.html',
  styleUrl: './pgn-import.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PgnImport {
  private readonly service = inject(VariantService);
  private readonly studyService = inject(StudyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  /** Studio a cui agganciare la variante importata (da query param ?studyId), se presente. */
  protected readonly studyId = signal<number | null>(null);

  protected readonly pgn = signal('');
  protected readonly color = signal<VariantColor>('WHITE');
  protected readonly name = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  constructor() {
    const studyParam = this.route.snapshot.queryParamMap.get('studyId');
    if (studyParam) {
      this.studyId.set(Number(studyParam));
    }
  }

  /**
   * Parsing avanzato del PGN incollato (Prototipo 13): legge anche le varianti
   * annidate e costruisce l'albero. Vedi {@link parsePgnTree}.
   */
  protected readonly preview = computed<Preview>(() => {
    const text = this.pgn().trim();
    if (!text) {
      return { state: 'empty' };
    }
    const parsed = parsePgnTree(text);
    if (!parsed.ok) {
      return { state: 'error', message: parsed.error };
    }
    return {
      state: 'ok',
      tree: parsed.value.tree,
      mainline: parsed.value.mainline,
      nodeCount: parsed.value.nodeCount,
      variationCount: parsed.value.variationCount,
      suggestedName: suggestName(text),
    };
  });

  /** Accessori "piatti" per il template (evitano l'accesso a proprietà dell'union). */
  protected readonly state = computed(() => this.preview().state);
  protected readonly suggestedName = computed(() => {
    const p = this.preview();
    return p.state === 'ok' ? p.suggestedName : '';
  });
  protected readonly errorMessage = computed(() => {
    const p = this.preview();
    return p.state === 'error' ? p.message : '';
  });
  protected readonly nodeCount = computed(() => {
    const p = this.preview();
    return p.state === 'ok' ? p.nodeCount : 0;
  });
  protected readonly variationCount = computed(() => {
    const p = this.preview();
    return p.state === 'ok' ? p.variationCount : 0;
  });

  /** Token per l'anteprima ad albero (mainline + varianti tra parentesi). */
  protected readonly tokens = computed(() => {
    const p = this.preview();
    return p.state === 'ok' ? buildTokens(p.tree) : [];
  });

  protected save(): void {
    const p = this.preview();
    if (p.state !== 'ok') {
      this.error.set('Incolla un PGN valido prima di salvare.');
      return;
    }
    const name = this.name().trim() || p.suggestedName || 'Variante importata';
    this.error.set(null);
    this.saving.set(true);
    const request: CreateVariantRequest = {
      name,
      color: this.color(),
      moves: p.mainline,
      tree: p.tree,
      sourcePgn: this.pgn().trim(),
    };
    const studyId = this.studyId();
    const save$ = studyId !== null
      ? this.studyService.addVariant(studyId, request)
      : this.service.createVariant(request);
    save$.subscribe({
      next: (created) => {
        this.toast.success('Variante importata.');
        this.router.navigate(['/variants', created.id]);
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

/** Propone un nome dalla testata PGN: "Bianco - Nero", altrimenti l'Event. */
function suggestName(pgn: string): string {
  const tag = (name: string) =>
    pgn.match(new RegExp('\\[' + name + '\\s+"([^"]*)"\\]'))?.[1]?.trim() ?? '';
  const white = tag('White');
  const black = tag('Black');
  if (white && black) {
    return `${white} - ${black}`;
  }
  return tag('Event');
}
