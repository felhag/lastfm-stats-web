import { Injectable } from '@angular/core';
import { Constants } from 'projects/shared/src/lib/app/model';
import { combineLatest, filter, map, shareReplay, Observable } from 'rxjs';
import { ScrobbleStore } from './scrobble.store';

@Injectable()
export class DateColorsService {
  gaps!: Observable<number[]>;

  constructor(private scrobbles: ScrobbleStore) {
    this.gaps = combineLatest([this.scrobbles.first, this.scrobbles.last]).pipe(
      filter(([first, last]) => !!first && !!last),
      map((arr) => arr.map(a => a!.date.getTime())),
      map(([first, last]) => {
        const gap = last - first;
        const part = gap / (Constants.DATE_COLORS.length - 1);
        return [...Array.from(Array(Constants.DATE_COLORS.length).keys()).map((v, idx) => first + idx * part), last];
      }),
      shareReplay(),
    );
  }
}
