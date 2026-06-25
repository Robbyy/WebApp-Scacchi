import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PgnImport } from './pgn-import';
import { VariantService } from '../core/variant.service';
import { StudyService } from '../core/study.service';
import { CreateVariantRequest, Variant } from '../core/variant.model';

function setup(service: Partial<VariantService>, studyService: Partial<StudyService> = {}) {
  TestBed.configureTestingModule({
    imports: [PgnImport],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: service },
      { provide: StudyService, useValue: studyService },
    ],
  });
  const fixture = TestBed.createComponent(PgnImport);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('PgnImport', () => {
  it('parses a simple PGN into SAN moves', () => {
    const { cmp } = setup({});
    cmp.pgn.set('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    const p = cmp.preview();
    expect(p.state).toBe('ok');
    expect(p.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
  });

  it('suggests a name from the PGN headers', () => {
    const { cmp } = setup({});
    cmp.pgn.set('[White "Anderssen"]\n[Black "Kieseritzky"]\n\n1. e4 e5');
    expect(cmp.state()).toBe('ok');
    expect(cmp.suggestedName()).toBe('Anderssen - Kieseritzky');
  });

  it('reports an error for an invalid PGN', () => {
    const { cmp } = setup({});
    cmp.pgn.set('1. e4 e9 blah');
    expect(cmp.state()).toBe('error');
    expect(cmp.errorMessage()).toBeTruthy();
  });

  it('treats empty input as empty (no error)', () => {
    const { cmp } = setup({});
    expect(cmp.state()).toBe('empty');
  });

  it('imports the parsed variant with the original PGN and navigates', () => {
    const created: Variant = { id: 9, name: 'X', color: 'WHITE', moves: ['e4', 'e5'], startingFen: '' };
    let captured: CreateVariantRequest | null = null;
    const { cmp } = setup({
      createVariant: (req: CreateVariantRequest) => {
        captured = req;
        return of(created);
      },
    });
    const router = TestBed.inject(Router);
    let navTarget: unknown[] | null = null;
    router.navigate = ((commands: unknown[]) => {
      navTarget = commands;
      return Promise.resolve(true);
    }) as typeof router.navigate;

    cmp.pgn.set('1. e4 e5');
    cmp.name.set('Apertura di Re');
    cmp.color.set('BLACK');
    cmp.save();

    expect(captured).toEqual({
      name: 'Apertura di Re',
      color: 'BLACK',
      moves: ['e4', 'e5'],
      sourcePgn: '1. e4 e5',
    });
    expect(navTarget).toEqual(['/variants', 9]);
  });
});
