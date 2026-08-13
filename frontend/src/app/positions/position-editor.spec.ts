import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PositionEditor } from './position-editor';
import { ConfirmService } from '../core/confirm.service';
import { StudyService } from '../core/study.service';
import { ToastService } from '../core/toast.service';
import { VariantService } from '../core/variant.service';
import { Study } from '../core/study.model';
import { CreateVariantRequest, Variant } from '../core/variant.model';

const study: Study = { id: 7, name: 'Finali pratici', phase: 'ENDGAME', variantCount: 0 };
const saved: Variant = {
  id: 31,
  name: 'Re e pedone',
  color: 'WHITE',
  moves: [],
  tree: [],
  startingFen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
  studyId: 7,
};

function setup(options: { save?: (request: CreateVariantRequest) => unknown; phase?: Study['phase'] } = {}) {
  let captured: CreateVariantRequest | null = null;
  const currentStudy = { ...study, phase: options.phase ?? study.phase };
  TestBed.configureTestingModule({
    imports: [PositionEditor],
    providers: [
      provideRouter([]),
      {
        provide: StudyService,
        useValue: {
          getStudy: () => of(currentStudy),
          addVariant: (_studyId: number, request: CreateVariantRequest) => {
            captured = request;
            return options.save ? options.save(request) : of(saved);
          },
        },
      },
      { provide: VariantService, useValue: { getVariant: () => of(saved), updateVariant: () => of(saved) } },
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({}),
            queryParamMap: convertToParamMap({ studyId: '7' }),
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PositionEditor);
  const router = TestBed.inject(Router);
  router.navigate = (() => Promise.resolve(true)) as typeof router.navigate;
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any, captured: () => captured };
}

describe('PositionEditor', () => {
  it('generates a normalized FEN from visual piece placement and setup controls', () => {
    const { cmp } = setup();
    cmp.selectPiece('wK');
    cmp.placeOn('e1');
    cmp.selectPiece('bK');
    cmp.placeOn('e8');
    cmp.selectPiece('bP');
    cmp.placeOn('d5');
    cmp.selectPiece('wP');
    cmp.placeOn('e5');
    cmp.onSideChange('w');
    cmp.onEnPassantChange('d6');

    expect(cmp.startingFen()).toBe('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    expect(cmp.validate('Re e pedone')).toBeNull();
  });

  it('saves a valid position without moves and without a training color', () => {
    const { cmp, captured } = setup();
    cmp.useStandardPosition();
    cmp.onNameChange('Posizione iniziale');
    cmp.save();

    expect(captured()).toEqual({
      name: 'Posizione iniziale',
      moves: [],
      tree: [],
      startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    });
  });

  it('keeps the backend validation message visible after a failed save', () => {
    const { cmp } = setup({
      save: () => throwError(() => ({ error: { message: 'La posizione lascia il re in scacco.' } })),
    });
    cmp.useStandardPosition();
    cmp.onNameChange('Posizione da rifiutare');
    cmp.save();

    expect(cmp.error()).toBe('La posizione lascia il re in scacco.');
  });

  it('does not expose the editor for an opening study', () => {
    const { cmp } = setup({ phase: 'OPENING' });

    expect(cmp.ready()).toBe(false);
    expect(cmp.error()).toContain('solo negli studi di mediogioco o finale');
  });
});
