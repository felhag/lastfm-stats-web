import {Component, OnInit, AfterViewInit, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {MDCSlider} from '@material/slider/component';
import {cssClasses} from '@material/slider/constants';
import {Subject} from 'rxjs';

interface Step {
  date: Date;
  display: string;
}

@Component({
  selector: 'app-date-range',
  templateUrl: './date-range.component.html',
  styleUrls: ['./date-range.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangeComponent implements OnInit, AfterViewInit {
  @Input() start: Date = new Date(0);
  @Output() changed = new Subject<[Date, Date]>();
  steps: Step[] = [];

  constructor() {
  }

  ngOnInit(): void {
    const now = new Date().getTime();
    let current = this.start;
    while (current.getTime() < now) {
      this.createStep(current);

      const newYear = current.getMonth() >= 11;
      current = new Date(current.getFullYear() + (newYear ? 1 : 0), newYear ? 0 : current.getMonth() + 1, 1);
    }
    this.createStep(current);
  }

  ngAfterViewInit(): void {
    const slider = new MDCSlider(document.querySelector('.mdc-slider')!);
    const foundation = (slider as any).foundation;
    foundation.adapter.setValueIndicatorText =  (value: any, thumb: any) => {
      const valueIndicatorEl = (slider as any).getThumbEl(thumb).querySelector('.' + cssClasses.VALUE_INDICATOR_TEXT);
      valueIndicatorEl.textContent = this.steps[value].display;
    };

    slider.root.addEventListener('MDCSlider:change', () => {
      if (slider.getValueStart() === 0 && slider.getValue() === this.steps.length - 1) {
        this.changed.next(undefined);
      } else {
        const start = this.steps[slider.getValueStart()].date;
        const end = this.steps[slider.getValue()].date;
        this.changed.next([start, end]);
      }
    });
    foundation.layout();
  }

  private createStep(date: Date): void {
    this.steps.push( { date, display: date.toLocaleDateString() });
  }
}
