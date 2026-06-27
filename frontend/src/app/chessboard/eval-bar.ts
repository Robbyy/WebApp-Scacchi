import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UciScore, formatEval } from '../core/uci';

/**
 * Barra di valutazione verticale (Prototipo 16): la porzione bianca in basso
 * cresce col vantaggio del Bianco. Mostra il punteggio (es. "+1.5", "#3").
 * Puramente presentazionale: riceve la valutazione dal motore.
 */
@Component({
  selector: 'app-eval-bar',
  template: `
    <div class="eval-bar" [class.eval-bar--thinking]="thinking()" [attr.title]="label()">
      <span class="eval-bar__num eval-bar__num--top">{{ topNum() }}</span>
      <div class="eval-bar__white" [style.height.%]="whitePct()"></div>
      <span class="eval-bar__num eval-bar__num--bottom">{{ bottomNum() }}</span>
    </div>
  `,
  styles: [
    `
      .eval-bar {
        position: relative;
        width: 1.6rem;
        height: 100%;
        min-height: 12rem;
        border-radius: 0.35rem;
        overflow: hidden;
        background: var(--wood-dark, #3a2a1a);
        border: 1px solid var(--panel-border, #c9b48a);
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .eval-bar--thinking {
        opacity: 0.75;
      }
      .eval-bar__white {
        width: 100%;
        background: var(--board-light, #f0d9b5);
        transition: height 0.25s ease;
      }
      .eval-bar__num {
        position: absolute;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 0.62rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .eval-bar__num--top {
        top: 0.15rem;
        color: var(--board-light, #f0d9b5);
      }
      .eval-bar__num--bottom {
        bottom: 0.15rem;
        color: var(--wood-dark, #3a2a1a);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvalBar {
  readonly score = input<UciScore | null>(null);
  readonly thinking = input<boolean>(false);

  private readonly formatted = computed(() => {
    const s = this.score();
    return s ? formatEval(s) : { text: '0.0', whiteFraction: 0.5 };
  });

  protected readonly whitePct = computed(() => Math.round(this.formatted().whiteFraction * 100));
  protected readonly label = computed(() => `Valutazione ${this.formatted().text}`);
  /** Il numero appare dalla parte di chi è in vantaggio. */
  protected readonly topNum = computed(() =>
    this.formatted().whiteFraction < 0.5 ? this.formatted().text : '',
  );
  protected readonly bottomNum = computed(() =>
    this.formatted().whiteFraction >= 0.5 ? this.formatted().text : '',
  );
}
