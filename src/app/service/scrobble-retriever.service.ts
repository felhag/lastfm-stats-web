import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, Subject, BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
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

export type State = 'LOADINGUSER' | 'CALCULATINGPAGES' | 'LOADFAILED' | 'LOADFAILEDDUEPRIVACY' | 'USERNOTFOUND' | 'RETRIEVING' | 'INTERRUPTED' | 'COMPLETED';

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
      const from = String(this.determineFrom(user));
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

  private determineFrom(user: User): number {
    if (this.imported.length) {
      return this.imported[this.imported.length - 1].date.getTime() / 1000 + 1;
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
        this.iterate(progress, from, to, 3);
      } else {
        progress.state.next('COMPLETED');
        progress.loader.complete();
      }
    }, err => {
      if (err.error?.error === 17) {
        progress.state.next('LOADFAILEDDUEPRIVACY');
      } else if (progress.pageSize !== 500) {
        // restart with a lower page size :/
        progress.pageSize = 500;
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

  private iterate(progress: Progress, from: string, to: string, retry: number): void {
    if (progress.state.value === 'INTERRUPTED') {
      return;
    }

    const start = new Date().getTime();
    this.get(progress.user!.name, from, to, progress.currentPage, progress.pageSize).subscribe(r => {
      if (progress.state.value === 'INTERRUPTED') {
        return;
      }

      const tracks: Scrobble[] = r.recenttracks.track.filter(t => t.date && !(t['@attr']?.nowplaying === 'true')).map(t => ({
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
      if (progress.currentPage > 0) {
        const ms = new Date().getTime() - start;
        const handled = progress.totalPages - progress.currentPage - 1;
        const avgLoadTime = progress.pageLoadTime ? progress.pageLoadTime * handled : 0;
        progress.pageLoadTime = (avgLoadTime + ms) / (handled + 1);
        this.iterate(progress, from, to, 3);
      } else {
        progress.state.next('COMPLETED');
        progress.loader.complete();
      }
      // sometimes lastfm returns a 500, retry a few times.
    }, () => retry > 0 ? this.iterate(progress, from, to, retry--) : undefined);
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
