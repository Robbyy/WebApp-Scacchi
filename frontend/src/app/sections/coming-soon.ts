import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Segnaposto riusabile delle sezioni non ancora sviluppate (ISSUE-021).
 * Riceve il nome della sezione dalla `data` della route (binding automatico via
 * `withComponentInputBinding`) e sarà sostituito dalle sezioni reali con le
 * slice `issue-016-middlegame-section` / `issue-016-endgame-section`.
 */
@Component({
  selector: 'app-coming-soon',
  imports: [RouterLink],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoon {
  /** Nome della sezione mostrato come titolo (es. «Mediogioco»). */
  readonly section = input<string>('');
}
