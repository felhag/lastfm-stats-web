import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { map, Observable } from 'rxjs';
import { Constants } from 'projects/shared/src/lib/app/model';
import { Top10Item } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { DateColorsService } from '../../service/date-colors.service';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-top10list',
  templateUrl: './top10list.component.html',
  styleUrls: ['./top10list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatSnackBarModule
  ]
})
export class Top10listComponent {
  @Input({required: true}) title!: string;
  @Input({required: false}) explanation?: string;
  @Input({required: true}) list!: Top10Item[];
  private openSnackbar?: MatSnackBarRef<TextOnlySnackBar>;

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
    if (this.openSnackbar) {
      this.openSnackbar?.dismiss();
    } else {
      this.openSnackbar = this.snackbar.open(explanation, 'Got it!', {
        duration: 10000
      });
      this.openSnackbar.afterDismissed().subscribe(() => this.openSnackbar = undefined);
    }
  }
}
