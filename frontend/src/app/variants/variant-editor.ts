import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Chessboard, MoveMade } from '../chessboard/chessboard';
import { EvalBar } from '../chessboard/eval-bar';
import { StudyVariantNav } from './study-variant-nav';
import { MenuAnchor, MoveAction, MoveActionsMenu } from './move-actions-menu';
import { MoveAnnotationDialog } from './move-annotation-dialog';
import { VariantService } from '../core/variant.service';
import { StudyService } from '../core/study.service';
import { StockfishService } from '../core/stockfish.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { CanComponentDeactivate } from './can-deactivate.guard';
import {
  CreateVariantRequest,
  MoveNode,
  Variant,
  VariantColor,
  validationMessage,
} from '../core/variant.model';
import {
  MoveAnnotation,
  addChild,
  buildTokens,
  childrenAt,
  fenAt,
  fromLine,
  isOnMainline,
  lineSans,
  mainline,
  nodeAt,
  pathsEqual,
  promoteToMainline,
  removeNode,
  setAnnotation,
} from '../core/move-tree';

/** Stato del menu azioni: la mossa a cui si riferisce e dove ancorarlo. */
interface MoveMenuState {
  path: number[];
  san: string;
  anchor: MenuAnchor;
}

/** Stato del dialog di annotazione: mossa e annotazioni da cui partire. */
interface MoveAnnotationState {
  path: number[];
  san: string;
  annotation: MoveAnnotation;
}

@Component({
  selector: 'app-variant-editor',
  imports: [
    FormsModule,
    RouterLink,
    Chessboard,
    EvalBar,
    StudyVariantNav,
    MoveActionsMenu,
    MoveAnnotationDialog,
  ],
  templateUrl: './variant-editor.html',
  styleUrl: './variant-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantEditor implements CanComponentDeactivate, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly service = inject(VariantService);
  private readonly studyService = inject(StudyService);
  private readonly stockfish = inject(StockfishService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /**
   * Stato del motore Stockfish (Prototipo 16): aiuto allo studio, mai in
   * allenamento. Il toggle governa da solo anche la barra di valutazione
   * (ISSUE-007).
   */
  protected readonly engineOn = signal(false);
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
  /**
   * ID della variante **effettivamente caricata** dalla risposta corrente:
   * null mentre il caricamento è in corso, valorizzato solo dalla risposta
   * della richiesta attiva. È dipendenza dell'effetto motore, così passando a
   * un'altra variante con la stessa FEN l'analisi riparte davvero.
   */
  private readonly loadedVariantId = signal<number | null>(null);

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

  /**
   * Cancellazione in attesa di conferma (ISSUE-013): il percorso del nodo, non
   * un semplice flag, perché l'azione può partire da una mossa qualsiasi del
   * pannello e non solo da quella selezionata.
   */
  private readonly pendingDelete = signal<number[] | null>(null);
  protected readonly confirmingDelete = computed(() => this.pendingDelete() !== null);
  protected readonly pendingDeleteSan = computed(() => {
    const path = this.pendingDelete();
    return path ? (nodeAt(this.tree(), path)?.san ?? '') : '';
  });

  /** Menu azioni aperto su una mossa: percorso, SAN e ancora del controllo di origine. */
  protected readonly menu = signal<MoveMenuState | null>(null);
  /** Nel menu la promozione esiste solo per una mossa fuori dalla mainline. */
  protected readonly menuCanPromote = computed(() => {
    const open = this.menu();
    return !!open && open.path.length > 0 && !isOnMainline(open.path);
  });
  /** Mossa in annotazione nel dialog modale, con le annotazioni di partenza. */
  protected readonly annotating = signal<MoveAnnotationState | null>(null);
  /** Controllo che ha aperto menu o dialog: riceve indietro il focus alla chiusura. */
  private menuTrigger: HTMLElement | null = null;

  /** Varianti dello studio a cui appartiene quella in modifica (ISSUE-010). */
  protected readonly studyVariants = signal<Variant[]>([]);
  /** Drawer varianti aperto: nell'editor il pannello è sempre a sovrapposizione. */
  protected readonly variantsOpen = signal(false);
  /**
   * Il pannello compare solo se serve davvero a navigare: variante esistente,
   * presente nella risposta dello studio e con almeno un'alternativa. In
   * creazione non c'è una variante attiva, quindi non compare (ISSUE-010).
   */
  protected readonly hasVariantNav = computed(() => {
    const id = this.editId();
    const list = this.studyVariants();
    return id !== null && list.length >= 2 && list.some((v) => v.id === id);
  });

  constructor() {
    const studyParam = this.route.snapshot.queryParamMap.get('studyId');
    if (studyParam) {
      this.studyId.set(Number(studyParam));
    }
    // Cambiando variante dal pannello resta montato lo stesso componente
    // (cambia solo `:id`): l'editor deve ricaricare e ripartire pulito qui,
    // non una sola volta dallo snapshot della route (ISSUE-010). Il caricamento
    // passa da `switchMap`, così un cambio rapido di `:id` annulla le richieste
    // ancora in volo (variante e studio) e una risposta precedente non può
    // sovrascrivere la variante ora aperta.
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        tap((idParam) => this.resetTransientState(idParam)),
        switchMap((idParam) => (idParam ? this.load(Number(idParam)) : EMPTY)),
        takeUntilDestroyed(),
      )
      .subscribe();
    // Motore acceso → analizza la posizione corrente a ogni cambio. La variante
    // caricata è una dipendenza esplicita: al cambio variante l'analisi riparte
    // (svuotando valutazione e PV) anche quando la FEN coincide, e non parte
    // affatto finché la risposta corrente non è arrivata.
    effect(() => {
      const fen = this.fen();
      // Letto direttamente (non tramite un `computed` booleano): serve la
      // dipendenza dall'identità della variante caricata, che cambia anche
      // quando la FEN resta la stessa.
      const loaded = this.loadedVariantId();
      const loading = this.editId() !== null && loaded === null;
      if (this.engineOn() && fen && !loading) {
        this.stockfish.analyse(fen);
      }
    });
  }

  /** Azzera lo stato transitorio prima di (ri)caricare la variante della route. */
  private resetTransientState(idParam: string | null): void {
    this.variantsOpen.set(false);
    this.pendingDelete.set(null);
    this.menu.set(null);
    this.annotating.set(null);
    this.menuTrigger = null;
    this.studyVariants.set([]);
    this.error.set(null);
    this.saving.set(false);
    this.dirty.set(false);
    this.tree.set([]);
    this.currentPath.set([]);
    // Finché la risposta corrente non arriva nessuna variante è caricata.
    this.loadedVariantId.set(null);
    this.editId.set(idParam ? Number(idParam) : null);
    if (!idParam) {
      this.name.set('');
      this.color.set('WHITE');
      this.startingFen.set('');
    }
  }

  /**
   * Letture della variante in modifica (dettaglio e, a seguire, studio padre).
   * Restituisce un flusso unico perché il `switchMap` del chiamante possa
   * annullarle entrambe al cambio di `:id`.
   */
  private load(id: number): Observable<unknown> {
    return this.service.getVariant(id).pipe(
      tap((v) => this.apply(v)),
      switchMap((v) =>
        v.studyId != null
          ? this.studyService.getStudy(v.studyId).pipe(
              tap((s) => this.studyVariants.set(s.variants ?? [])),
              catchError(() => {
                this.studyVariants.set([]);
                return EMPTY;
              }),
            )
          : EMPTY,
      ),
      catchError(() => {
        this.error.set('Variante non trovata.');
        return EMPTY;
      }),
    );
  }

  /** Applica la variante arrivata dalla richiesta corrente. */
  private apply(v: Variant): void {
    this.name.set(v.name);
    this.color.set(v.color);
    this.startingFen.set(v.startingFen ?? '');
    this.tree.set(v.tree && v.tree.length ? v.tree : fromLine(v.moves));
    this.currentPath.set([]);
    // Il caricamento non è una modifica dell'utente.
    this.dirty.set(false);
    // Da qui la variante è davvero caricata: l'effetto motore riparte.
    this.loadedVariantId.set(v.id);
  }

  protected toggleVariants(): void {
    this.variantsOpen.update((open) => !open);
  }

  protected closeVariants(): void {
    this.variantsOpen.set(false);
  }

  /**
   * Cambio variante dal pannello. Il guard va invocato **esplicitamente**: con
   * il solo `canDeactivate` dichiarato sulla route, il riuso del componente al
   * cambio di `:id` lascerebbe perdere le modifiche non salvate senza chiedere.
   * A conferma avvenuta lo stato torna pulito, così il guard della route non
   * ripropone lo stesso dialog durante la navigazione.
   */
  protected async requestVariantChange(id: number): Promise<void> {
    if (id === this.editId()) {
      this.variantsOpen.set(false);
      return;
    }
    const allowed = await this.canDeactivate();
    if (!allowed) {
      return;
    }
    this.dirty.set(false);
    this.variantsOpen.set(false);
    this.router.navigate(['/variants', id, 'edit']);
  }

  protected toggleEngine(): void {
    const next = !this.engineOn();
    this.engineOn.set(next);
    if (!next) {
      this.stockfish.stop();
    }
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
    this.pendingDelete.set(null);
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
      this.pendingDelete.set(null);
      this.currentPath.set([...path]);
    }
  }

  protected first(): void {
    this.pendingDelete.set(null);
    this.currentPath.set([]);
  }

  protected prev(): void {
    this.pendingDelete.set(null);
    this.currentPath.update((p) => p.slice(0, -1));
  }

  protected next(): void {
    if (childrenAt(this.tree(), this.currentPath()).length > 0) {
      this.pendingDelete.set(null);
      this.currentPath.update((p) => [...p, 0]);
    }
  }

  /**
   * Menu azioni della mossa (ISSUE-013): lo aprono sia il pulsante `⋮` sia il
   * tasto destro sulla mossa. Il click sinistro resta navigazione e non passa
   * di qui. Si ancora al controllo di origine, che riceverà indietro il focus.
   */
  protected openMoveMenu(event: MouseEvent, path: number[] | undefined, san: string | undefined): void {
    if (!path || !san) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const trigger = event.currentTarget as HTMLElement | null;
    this.menuTrigger = trigger;
    const rect = trigger?.getBoundingClientRect();
    this.menu.set({
      path: [...path],
      san,
      anchor: rect
        ? { x: rect.left, y: rect.bottom + 4 }
        : { x: event.clientX, y: event.clientY },
    });
  }

  protected isMenuOpen(path: number[] | undefined): boolean {
    const open = this.menu();
    return !!path && !!open && pathsEqual(open.path, path);
  }

  /** Chiave stabile del percorso, usata per ritrovare un'azione dopo il riordino dell'albero. */
  protected pathKey(path: number[] | undefined): string | null {
    return path ? path.join('.') : null;
  }

  /** Chiusura senza comando (`Esc`, click esterno): il focus torna all'origine. */
  protected closeMoveMenu(): void {
    this.menu.set(null);
    this.restoreMenuFocus();
  }

  /** Comando scelto nel menu: stessa logica dei controlli già presenti nell'editor. */
  protected onMoveAction(action: MoveAction): void {
    const open = this.menu();
    if (!open) {
      return;
    }
    this.menu.set(null);
    if (action === 'annotate') {
      // Il focus passa al dialog: torna al pulsante di origine alla sua chiusura.
      const node = nodeAt(this.tree(), open.path);
      this.annotating.set({
        path: open.path,
        san: open.san,
        annotation: { comment: node?.comment, nag: node?.nag },
      });
      return;
    }
    if (action === 'promote') {
      this.promoteAt(open.path);
      // La promozione riordina i token: il pulsante DOM di origine può ora
      // rappresentare un'altra mossa. Dopo il render cerca quello della linea
      // promossa, divenuta il percorso di soli zeri.
      this.focusActionAt(open.path.map(() => 0));
    } else {
      this.requestDeleteAt(open.path);
      this.restoreMenuFocus();
    }
  }

  /** Salva le annotazioni sull'albero locale: la variante resta da salvare. */
  protected saveAnnotation(annotation: MoveAnnotation): void {
    const open = this.annotating();
    if (!open) {
      return;
    }
    this.tree.set(setAnnotation(this.tree(), open.path, annotation));
    this.dirty.set(true);
    this.closeAnnotation();
  }

  /** Chiude il dialog senza modifiche e restituisce il focus all'azione di origine. */
  protected closeAnnotation(): void {
    this.annotating.set(null);
    this.restoreMenuFocus();
  }

  private restoreMenuFocus(): void {
    const trigger = this.menuTrigger;
    this.menuTrigger = null;
    trigger?.focus();
  }

  /** Restituisce il focus al pulsante della mossa in `path` dopo il render Angular. */
  private focusActionAt(path: number[]): void {
    const key = this.pathKey(path);
    this.menuTrigger = null;
    afterNextRender(() => {
      if (key === null) {
        return;
      }
      this.host.nativeElement
        .querySelector<HTMLButtonElement>(`[data-move-path="${key}"]`)
        ?.focus();
    }, { injector: this.injector });
  }

  /** Promuove la linea corrente a mainline (scorciatoia dell'azione del menu). */
  protected makeMainline(): void {
    this.promoteAt(this.currentPath());
  }

  /**
   * Promuove a mainline la linea che passa per `path` (riuso di
   * `promoteToMainline`): commenti, NAG e sotto-varianti restano dove sono.
   */
  protected promoteAt(path: number[]): void {
    if (path.length === 0 || isOnMainline(path)) {
      return;
    }
    this.tree.set(promoteToMainline(this.tree(), path));
    // la stessa linea ora è il percorso di soli zeri
    this.currentPath.set(path.map(() => 0));
    this.dirty.set(true);
  }

  /** Elimina la mossa corrente (scorciatoia dell'azione del menu). */
  protected deleteCurrent(): void {
    this.requestDeleteAt(this.currentPath());
  }

  /**
   * Richiede la cancellazione del nodo in `path`. Se il nodo ha figli
   * (sottoalbero) chiede conferma; una mossa-foglia viene rimossa direttamente.
   */
  protected requestDeleteAt(path: number[]): void {
    if (path.length === 0) {
      return;
    }
    if (childrenAt(this.tree(), path).length > 0) {
      this.pendingDelete.set([...path]);
      return;
    }
    this.performDelete(path);
  }

  /** Conferma la cancellazione del sottoalbero. */
  protected confirmDelete(): void {
    const path = this.pendingDelete();
    this.pendingDelete.set(null);
    if (path) {
      this.performDelete(path);
    }
  }

  /** Annulla la cancellazione in sospeso. */
  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  private performDelete(path: number[]): void {
    if (path.length === 0) {
      return;
    }
    this.tree.set(removeNode(this.tree(), path));
    // Dopo la rimozione la selezione torna al nodo padre.
    this.currentPath.set(path.slice(0, -1));
    this.dirty.set(true);
  }

  protected reset(): void {
    this.pendingDelete.set(null);
    this.menu.set(null);
    this.annotating.set(null);
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
