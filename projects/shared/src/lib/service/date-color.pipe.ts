import { Pipe, PipeTransform, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Constants } from 'projects/shared/src/lib/app/model';
import { DateColorsService } from './date-colors.service';

/**
 * Resolves the gap-based color for a given date. Shared between the inline top10 list and the
 * fullscreen dialog so both render item dots identically.
 */
@Pipe({
  name: 'dateColor',
  standalone: true
})
export class DateColorPipe implements PipeTransform {
  private colors = inject(DateColorsService);

  transform(date: Date): Observable<string> {
    const time = date.getTime();
    return this.colors.gaps.pipe(
      map(gaps => gaps.findIndex((gap, idx) => time >= gap && time <= gaps[idx + 1])),
      map(idx => Constants.DATE_COLORS[idx])
    );
  }
}
