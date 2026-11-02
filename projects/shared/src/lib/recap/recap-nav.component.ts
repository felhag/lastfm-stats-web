import { Component, effect, input, OnDestroy, signal } from '@angular/core';

/** Step indicator next to the recap slides: shows the current step and jumps to a step on click. */
@Component({
  selector: 'app-recap-nav',
  template: `
    @for (slide of slides(); track slide) {
      <button type="button" [class.active]="$index === active()" [attr.aria-current]="$index === active() ? 'step' : null"
              [attr.aria-label]="'Go to step ' + ($index + 1)" (click)="go(slide)"></button>
    }
  `,
  styleUrl: './recap-nav.component.scss',
  host: {'aria-label': 'Recap steps', 'role': 'navigation'},
})
export class RecapNavComponent implements OnDestroy {
  readonly slides = input.required<HTMLElement[]>();
  /** The scroll container of the slides. */
  readonly root = input.required<HTMLElement>();
  readonly active = signal(0);

  private observer?: IntersectionObserver;

  constructor() {
    effect(() => {
      const slides = this.slides();
      this.observer?.disconnect();
      // a slide is active while it covers the middle of the screen, works for slides taller than the screen too
      this.observer = new IntersectionObserver(entries => entries
        .filter(e => e.isIntersecting)
        .forEach(e => this.active.set(slides.indexOf(e.target as HTMLElement))),
        {root: this.root(), rootMargin: '-50% 0px -50% 0px'});
      slides.forEach(slide => this.observer!.observe(slide));
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  go(slide: HTMLElement): void {
    slide.scrollIntoView({behavior: 'smooth'});
  }
}
