import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { map, Observable } from 'rxjs';
import { Constants } from 'projects/shared/src/lib/app/model';
import { Top10Item } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { DateColorsService } from '../../service/date-colors.service';

@Component({
  selector: 'app-top10list',
  templateUrl: './top10list.component.html',
  styleUrls: ['./top10list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Top10listComponent {
  @Input() title!: string;
  @Input() explanation?: string;
  @Input() list!: Top10Item[];

  constructor(private snackbar: MatSnackBar, private colors: DateColorsService) {
  }

  get isNumbered(): boolean {
    return this.list.length > 10;
  }

  getColor(date: Date): Observable<string> {
    const time = date.getTime();
    return this.colors.gaps.pipe(
      map(gaps => gaps.findIndex((gap, idx) => time >= gap && time <= gaps[idx + 1])),
      map(idx => Constants.DATE_COLORS[idx])
    );
  }

  explain(explanation: string): void {
    this.snackbar.open(explanation, 'Got it!', {
      duration: 10000
    });
  }
}
