import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, Subject, BehaviorSubject, throwError, concat} from 'rxjs';
import {map, switchMap, catchError, toArray, expand} from 'rxjs/operators';
import {Progress, User, Constants, Scrobble} from '../model';

interface Response {
  recenttracks: RecentTracks;
}

interface RecentTracks {
  track: Track[];
  '@attr': {
    page: string;
    total: string;
    totalPages: string;
  };
}

interface Track {
  name: string;
  artist: {
    '#text': string;
  };
  date: {
    uts: number;
  };
  '@attr'?: {
    nowplaying: 'true' | 'false'
  };
}

export type State =
  'LOADINGUSER' | 'CALCULATINGPAGES' | 'RETRIEVING' |       // happy flow states
  'LOADFAILED' | 'LOADFAILEDDUEPRIVACY' | 'USERNOTFOUND' |  // initial error states
  'LOADSTUCK' | 'INTERRUPTED' | 'COMPLETED';                // completed states

@Injectable({
  providedIn: 'root'
})
export class ScrobbleRetrieverService {
  private readonly API = 'https://ws.audioscrobbler.com/2.0/';
  private readonly KEY = '2c223bda2fe846bd5c24f9a5d2da834e';
  imported: Scrobble[] = [];

  constructor(private http: HttpClient) {
  }

  retrieveFor(username: string): Progress {
    const to = new Date().toDateString();
    const progress: Progress = {
      loader: new Subject<Scrobble[]>(),
      first: new BehaviorSubject<Scrobble | undefined>(undefined),
      last: new BehaviorSubject<Scrobble | undefined>(undefined),
      state: new BehaviorSubject<State>('LOADINGUSER'),
      pageSize: Constants.API_PAGE_SIZE,
      totalPages: -1,
      currentPage: -1,
      loadScrobbles: 0,
      importedScrobbles: this.imported.length,
      allScrobbles: this.imported
    };

    this.retrieveUser(username).subscribe(user => {
      progress.user = user;
      progress.state.next('CALCULATINGPAGES');
      const from = String(this.determineFrom(user, this.imported));
      this.start(this.imported, progress, from, to);
      this.imported = [];
    }, (e) => {
      if (e.status === 404) {
        progress.state.next('USERNOTFOUND');
      } else {
        progress.state.next('LOADFAILED');
      }
    });

    return progress;
  }

  private determineFrom(user: User, scrobbles: Scrobble[]): number {
    if (scrobbles.length) {
      return scrobbles[scrobbles.length - 1].date.getTime() / 1000 + 1;
    } else {
      return parseInt(user.registered.unixtime) - 1000;
    }
  }

  private start(scrobbles: Scrobble[], progress: Progress, from: string, to: string): void {
    this.get(progress.user!.name, from, to, 1, progress.pageSize).subscribe(response => {
      const page = parseInt(response.recenttracks['@attr'].totalPages);

      // trigger update for imported scrobbles
      if (scrobbles.length) {
        progress.loader.next(scrobbles);
        progress.first.next(scrobbles[0]);
        progress.last.next(scrobbles[scrobbles.length - 1]);
      }

      if (page > 0) {
        progress.state.next('RETRIEVING');
        progress.totalPages = page;
        progress.currentPage = page;
        progress.loadScrobbles = parseInt(response.recenttracks['@attr'].total);
        this.iterate(progress, from, to);
      } else {
        progress.state.next('COMPLETED');
        progress.loader.complete();
      }
    }, err => {
      if (err.error?.error === 17) {
        progress.state.next('LOADFAILEDDUEPRIVACY');
      } else {
        const idx = Constants.API_PAGE_SIZE_REDUCTIONS.indexOf(progress.pageSize);
        if (Constants.API_PAGE_SIZE_REDUCTIONS.length > idx + 1) {
          progress.pageSize = Constants.API_PAGE_SIZE_REDUCTIONS[idx + 1];
          this.start(scrobbles, progress, from, to);
        } else {
          progress.state.next('LOADFAILED');
        }
      }
    });
  }

  private retrieveUser(username: string): Observable<User> {
    const params = new HttpParams()
      .append('method', 'user.getinfo')
      .append('api_key', this.KEY)
      .append('user', username)
      .append('format', 'json');

    return this.http.get<{user: User}>(this.API, {params}).pipe(map(u => u.user));
  }

  private iterate(progress: Progress, from: string, to: string): void {
    if (progress.state.value === 'INTERRUPTED') {
      return;
    }

    const start = new Date().getTime();

    this.getPageSizeFallback(progress, from, to).subscribe(tracks => {
      if (progress.state.value === 'INTERRUPTED') {
        return;
      }

      this.updateTracks(tracks, progress);

      if (progress.currentPage > 0) {
        const ms = new Date().getTime() - start;
        const handled = progress.totalPages - progress.currentPage - 1;
        const avgLoadTime = progress.pageLoadTime ? progress.pageLoadTime * handled : 0;
        progress.pageLoadTime = (avgLoadTime + ms) / (handled + 1);
        this.iterate(progress, from, to);
      } else {
        progress.state.next('COMPLETED');
        progress.loader.complete();
      }
    }, () => progress.state.next('LOADSTUCK'));
  }

  /**
   * Loads a page page, with some fallbacks for the unstable last fm api:
   * - tries to load with two retries
   * - if failed three times, retries with lower page size
   * - if failed again, recursively call method with smaller page size.
   */
  private getPageSizeFallback(progress: Progress, from: string, to: string): Observable<Track[]> {
    return this.getWithRetry(progress.user!.name, from, to, progress.currentPage, progress.pageSize).pipe(
      map(r => r.recenttracks.track),
      catchError(() => this.retryLowerPageSize(progress, from, to, progress.pageSize))
    );
  }

  private retryLowerPageSize(progress: Progress, from: string, to: string, orgPageSize: number): Observable<Track[]> {
    // failed to load data twice. Lastfm is probably not gonna give a decent result, load this page in multiple chunks
    const sizeIdx = Constants.API_PAGE_SIZE_REDUCTIONS.indexOf(orgPageSize);
    const nextSize = Constants.API_PAGE_SIZE_REDUCTIONS[sizeIdx === 0 ? 2 : sizeIdx + 1]; // skip page size 600
    if (!nextSize) {
      // tried loading with lowest page size. Last fm really wont give a response ..
      return throwError(() => new Error(`API wont give a response, even with smallest page size ${orgPageSize}.`));
    } else {
      // use last loaded scrobble as from date
      const newFrom = String(this.determineFrom(progress.user!, progress.allScrobbles));
      return this.getWithRetry(progress.user!.name, newFrom, to, 1, nextSize).pipe(switchMap(r => {
        // build observable for each page and combine result
        const lastPage = parseInt(r.recenttracks['@attr'].totalPages);

        return concat(...Array.from(Array(orgPageSize / nextSize).keys())
          .map((o, idx) => lastPage - idx)
          .map(page => this.getWithRetry(progress.user!.name, newFrom, to, page, nextSize, 10)))
          .pipe(
            expand(),
            toArray(),
            map(pages => pages.map(p => p.recenttracks.track).flat()),

            // if any failed, retry again with a lower page size
            catchError(() => this.retryLowerPageSize(progress, from, to, nextSize))
          );
      }));
    }
  }

  private x(progress: Progress, from: string, to: string, pageSize: number, tracks: Track[]): Observable<Track[]> {
    return this.retryLowerPageSize(progress, from, to, pageSize).pipe(
      map(r => [...tracks, ...r]),
      expand()
    );
  }

  // lastfm api isn't very stable an sometimes returns a 500 error so we'll retry a few times.
  private getWithRetry(username: string, from: string, to: string, page: number, size: number,
                       retry: number = Constants.RETRIES): Observable<Response> {
    return this.get(username, from, to, page, size).pipe(
      catchError(() => {
        if (retry > 0) {
          return this.getWithRetry(username, from, to, page, size, retry - 1);
        } else {
          return throwError(() => new Error(`Retried ${Constants.RETRIES} times but couldn't retrieve page ${page} with size ${size} for ${username}`));
        }
      })
    );
  }

  private updateTracks(response: Track[], progress: Progress): void {
    const tracks: Scrobble[] = response.filter(t => t.date && !(t['@attr']?.nowplaying === 'true')).map(t => ({
      track: t.name,
      artist: t.artist['#text'],
      date: new Date(t.date?.uts * 1000)
    })).reverse();
    if (!progress.first.value) {
      progress.first.next(tracks[0]);
    }
    progress.last.next(tracks[tracks.length - 1]);
    progress.loader.next(tracks);
    progress.allScrobbles.push(...tracks);
    progress.currentPage--;
  }

  private get(username: string, from: string, to: string, page: number, size: number): Observable<Response> {
    const params = new HttpParams()
      .append('method', 'user.getrecenttracks')
      .append('api_key', this.KEY)
      .append('user', username)
      .append('format', 'json')
      .append('to', to)
      .append('from', from)
      .append('limit', String(size))
      .append('page', String(page));

    return this.http.get<Response>(this.API, {params});
  }
}
