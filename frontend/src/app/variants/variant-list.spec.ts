import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VariantList } from './variant-list';
import { VariantService } from '../core/variant.service';
import { Variant } from '../core/variant.model';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

const v1: Variant = { id: 1, name: 'A', color: 'WHITE', moves: ['e4'], startingFen: '' };
const v2: Variant = { id: 2, name: 'B', color: 'BLACK', moves: ['e4', 'c5'], startingFen: '' };

function setup(service: Partial<VariantService>, confirmResult = true) {
  TestBed.configureTestingModule({
    imports: [VariantList],
    providers: [
      provideRouter([]),
      { provide: VariantService, useValue: service },
      { provide: ConfirmService, useValue: { ask: () => Promise.resolve(confirmResult) } },
      { provide: ToastService, useValue: { success() {}, error() {}, info() {} } },
    ],
  });
  const fixture = TestBed.createComponent(VariantList);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance as any };
}

describe('VariantList', () => {
  it('loads variants from the service', () => {
    const { cmp } = setup({ getVariants: () => of([v1, v2]) });
    expect(cmp.variants().length).toBe(2);
    expect(cmp.loading()).toBe(false);
  });

  it('removes a variant after confirmation', async () => {
    let deletedId: number | null = null;
    const { cmp } = setup({
      getVariants: () => of([v1, v2]),
      deleteVariant: (id: number) => {
        deletedId = id;
        return of(void 0);
      },
    });
    await cmp.remove(v1);
    expect(deletedId).toBe(1);
    expect(cmp.variants().some((x: Variant) => x.id === 1)).toBe(false);
    expect(cmp.variants().length).toBe(1);
  });

  it('does not remove when the confirmation is declined', async () => {
    let deletedId: number | null = null;
    const { cmp } = setup(
      {
        getVariants: () => of([v1, v2]),
        deleteVariant: (id: number) => {
          deletedId = id;
          return of(void 0);
        },
      },
      false,
    );
    await cmp.remove(v1);
    expect(deletedId).toBeNull();
    expect(cmp.variants().length).toBe(2);
  });
});
