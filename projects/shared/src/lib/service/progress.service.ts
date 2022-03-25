import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, combineLatest, filter, map, shareReplay, Observable } from 'rxjs';
import { Progress, Scrobble, Constants, State } from 'projects/shared/src/lib/app/model';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  public progress!: Progress;
  gaps!: Observable<number[]>;

  public init(imported: Scrobble[]): Progress {
    this.progress = this.build();
    this.progress.importedScrobbles = imported.length;
    this.progress.allScrobbles = imported;

    this.gaps = combineLatest([this.progress.first, this.progress.last]).pipe(
      filter(([first, last]) => !!first && !!last),
      map((arr) => arr.map(a => a!.date.getTime())),
      map(([first, last]) => {
        const gap = last - first;
        const part = gap / (Constants.DATE_COLORS.length - 1);
        return [...Array.from(Array(Constants.DATE_COLORS.length).keys()).map((v, idx) => first + idx * part), last];
      }),
      shareReplay(),
    );
    return this.progress;
  }

  private build(): Progress {
    return {
      loader: new Subject<Scrobble[]>(),
      first: new BehaviorSubject<Scrobble | undefined>(undefined),
      last: new BehaviorSubject<Scrobble | undefined>(undefined),
      state: new BehaviorSubject<State>('LOADINGUSER'),
      pageSize: Constants.API_PAGE_SIZE,
      totalPages: -1,
      currentPage: -1,
      loadScrobbles: 0,
      importedScrobbles: 0,
      allScrobbles: []
    };
  }
}
