import {Component, OnInit, AfterViewInit, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {MDCSlider} from '@material/slider/component';
import {cssClasses} from '@material/slider/constants';
import {Subject} from 'rxjs';
import {SettingsService} from '../service/settings.service';

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
  @Output() startChanged = new Subject<Date>();
  @Output() endChanged = new Subject<Date>();
  steps: Step[] = [];

  constructor(public settings: SettingsService) {

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
    foundation.adapter.setValueIndicatorText = (value: any, thumb: any) => {
      const valueIndicatorEl = (slider as any).getThumbEl(thumb).querySelector('.' + cssClasses.VALUE_INDICATOR_TEXT);
      valueIndicatorEl.textContent = this.steps[value].display;
    };

    slider.root.addEventListener('MDCSlider:change', (ev: any) => {
      const thumb: 1 | 2 = ev.detail.thumb;
      if (thumb === 1) {
        this.startChanged.next(slider.getValueStart() === 0 ? undefined : this.steps[slider.getValueStart()].date);
      } else if (thumb === 2) {
        this.endChanged.next(slider.getValue() === this.steps.length - 1 ? undefined : this.steps[slider.getValue()].date);
      }
    });
    foundation.layout();
  }

  getStep(date: Date): number | undefined {
    if (!date) {
      return undefined;
    }
    const time = date.getTime();
    const idx = this.steps.findIndex(s => s.date.getTime() === time);
    return idx >= 0 ? idx : undefined;
  }

  private createStep(date: Date): void {
    this.steps.push({date, display: date.toLocaleDateString()});
  }
}
