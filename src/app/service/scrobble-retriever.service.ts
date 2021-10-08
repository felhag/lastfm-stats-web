import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, Subject, BehaviorSubject, forkJoin} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
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
  album: {
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
      } else if (progress.pageSize !== Constants.API_PAGE_SIZE_REDUCED) {
        // restart with a lower page size :/
        progress.pageSize = Constants.API_PAGE_SIZE_REDUCED;
        this.start(scrobbles, progress, from, to);
      } else {
        progress.state.next('LOADFAILED');
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

  private iterate(progress: Progress, from: string, to: string, retry: number = Constants.RETRIES): void {
    if (progress.state.value === 'INTERRUPTED') {
      return;
    }

    const start = new Date().getTime();

    this.get(progress.user!.name, from, to, progress.currentPage, progress.pageSize).subscribe(r => {
      if (progress.state.value === 'INTERRUPTED') {
        return;
      }

      this.updateTracks(r.recenttracks.track, progress);

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
    }, () => {
      if (retry > 0) {
        // sometimes lastfm returns a 500, retry a few times.
        this.iterate(progress, from, to, retry - 1);
      } else {
        // failed to load data twice. Lastfm is probably not gonna give a decent result, load this page in multiple chunks
        this.retryLowerPageSize(progress, from, to);
      }
    });
  }

  private retryLowerPageSize(progress: Progress, from: string, to: string): void {
    const newFrom = String(this.determineFrom(progress.user!, progress.allScrobbles));
    const tempPageSize = progress.pageSize === 1000 ? 200 : 125;
    // split current page in five or four pages (based on page size)
    this.get(progress.user!.name, newFrom, to, 1, tempPageSize).pipe(switchMap(r => {
      // build observable for each page and combine result
      const lastPage = parseInt(r.recenttracks['@attr'].totalPages);
      return forkJoin(Array.from(Array(progress.pageSize / tempPageSize).keys())
        .map((o, idx) => lastPage - idx)
        .map(page => this.get(progress.user!.name, newFrom, to, page, tempPageSize)))
        .pipe(map(pages => pages.map(p => p.recenttracks.track).flat()));
    })).subscribe(tracks => {
      // add combined chunks to result
      this.updateTracks(tracks, progress);

      // restart
      this.iterate(progress, from, to);
    }, () => progress.state.next('LOADSTUCK'));
  }

  private updateTracks(response: Track[], progress: Progress): void {
    const tracks: Scrobble[] = response.filter(t => t.date && !(t['@attr']?.nowplaying === 'true')).map(t => ({
      track: t.name,
      artist: t.artist['#text'],
      album: t.album['#text'],
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
