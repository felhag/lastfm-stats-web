import { Injectable } from '@angular/core';
import { Constants } from 'projects/shared/src/lib/app/model';
import { combineLatest, filter, map, shareReplay, Observable } from 'rxjs';
import { ScrobbleStore } from './scrobble.store';
import { SettingsService } from './settings.service';

@Injectable()
export class DateColorsService {
  gaps!: Observable<number[]>;

  constructor(private scrobbles: ScrobbleStore, private settings: SettingsService) {
    this.gaps = combineLatest([this.scrobbles.first, this.scrobbles.last, this.settings.dateRangeStart, this.settings.dateRangeEnd]).pipe(
      map(([f, l, s, e]) => s && e ? [s, e] : [f.date, l.date]),
      filter(([first, last]) => !!first && !!last),
      map((arr) => arr.map(a => a!.getTime())),
      map(([first, last]) => {
        const gap = last - first;
        const part = gap / (Constants.DATE_COLORS.length - 1);
        return [...Array.from(Array(Constants.DATE_COLORS.length).keys()).map((v, idx) => first + idx * part), last];
      }),
      shareReplay(),
    );
  }
}
