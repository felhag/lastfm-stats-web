import { Component, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-orb',
  templateUrl: './orb.component.html',
  styleUrls: ['./orb.component.scss'],
})
export class OrbComponent {
  readonly value = input.required<number>();
  readonly title = input.required<string>();
  readonly delay = input(0);

  display = signal(0);

  constructor() {
    effect(onCleanup => {
      const target = this.value();
      const start = performance.now() + this.delay();
      let raf = 0;
      const tick = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - start) / 1400));
        this.display.set(Math.round(target * (1 - (1 - t) ** 3)));
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
      onCleanup(() => cancelAnimationFrame(raf));
    });
  }
}
