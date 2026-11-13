import { Directive, effect, ElementRef, inject, input, LOCALE_ID, OnDestroy } from '@angular/core';
import { formatNumber } from '@angular/common';

const DURATION = 1600;

/**
 * Counts a number up from 0 once it scrolls into view. Formats like the `number` pipe, and shows
 * the final value right away for users who prefer reduced motion.
 */
@Directive({
  selector: '[appCountUp]',
  host: {
    // equal width digits, so the surrounding text doesn't jitter while counting
    '[style.font-variant-numeric]': '"tabular-nums"',
  },
})
export class CountUpDirective implements OnDestroy {
  readonly value = input.required<number>({alias: 'appCountUp'});
  readonly digits = input('1.0-0', {alias: 'countUpDigits'});

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly locale = inject(LOCALE_ID);
  private observer?: IntersectionObserver;
  private frame?: number;

  constructor() {
    effect(() => {
      const value = this.value();
      const digits = this.digits();
      this.stop();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.render(value, digits);
        return;
      }
      this.render(0, digits);
      this.observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          this.observer?.disconnect();
          this.animate(value, digits);
        }
      }, {threshold: .5});
      this.observer.observe(this.element);
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private animate(value: number, digits: string): void {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // ease-out-expo: fast start, slowly settling on the final value
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      this.render(value * eased, digits);
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
      }
    };
    this.frame = requestAnimationFrame(step);
  }

  private render(value: number, digits: string): void {
    this.element.textContent = formatNumber(value, this.locale, digits);
  }

  private stop(): void {
    this.observer?.disconnect();
    if (this.frame) {
      cancelAnimationFrame(this.frame);
    }
  }
}
