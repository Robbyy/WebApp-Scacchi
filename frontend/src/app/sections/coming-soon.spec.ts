import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ComingSoon } from './coming-soon';

function render(section: string) {
  TestBed.configureTestingModule({
    imports: [ComingSoon],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(ComingSoon);
  fixture.componentRef.setInput('section', section);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ComingSoon (ISSUE-021)', () => {
  it('shows the section name it receives', () => {
    const el = render('Mediogioco');
    expect(el.querySelector('.soon-title')?.textContent).toContain('Mediogioco');
  });

  it('is reusable for another section', () => {
    const el = render('Finale');
    expect(el.querySelector('.soon-title')?.textContent).toContain('Finale');
  });

  it('states that the section is not implemented yet', () => {
    const el = render('Finale');
    expect(el.querySelector('.soon-status')?.textContent).toContain('In fase di implementazione');
  });

  it('links back to the openings home', () => {
    const el = render('Mediogioco');
    expect(el.querySelector('.soon-lead a')?.getAttribute('href')).toBe('/');
  });
});
