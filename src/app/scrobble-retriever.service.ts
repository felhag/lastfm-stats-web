import {A} from '@angular/cdk/keycodes';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, Subject, of, BehaviorSubject} from 'rxjs';
import {map, catchError} from 'rxjs/operators';
import {Constants, User} from './model';

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

export interface Scrobble {
  artist: string;
  track: string;
  date: Date;
}

export type State = 'LOADINGUSER' | 'CALCULATINGPAGES' | 'RETRIEVING' | 'INTERRUPTED' | 'COMPLETED' | 'USERNOTFOUND';

export interface Progress {
  user?: User;
  first: Subject<Scrobble>;
  last: Subject<Scrobble>;
  totalPages: number;
  loadScrobbles: number;
  importedScrobbles: number;
  allScrobbles: Scrobble[];
  currentPage: number;
  pageLoadTime?: number;
  state: BehaviorSubject<State>;
  loader: Subject<Scrobble[]>;
}

@Injectable({
  providedIn: 'root'
})
export class ScrobbleRetrieverService {
  private readonly API = 'https://ws.audioscrobbler.com/2.0/';
  private readonly KEY = '2c223bda2fe846bd5c24f9a5d2da834e';

  constructor(private http: HttpClient) {
  }

  retrieveFor(username: string, scrobbles: Scrobble[]): Progress {
    const to = new Date().toDateString();
    const progress: Progress = {
      loader: new Subject<Scrobble[]>(),
      first: new Subject<Scrobble>(),
      last: new Subject<Scrobble>(),
      state: new BehaviorSubject<State>('LOADINGUSER'),
      totalPages: -1,
      currentPage: -1,
      loadScrobbles: 0,
      importedScrobbles: scrobbles.length,
      allScrobbles: scrobbles
    };

    this.retrieveUser(username).subscribe(user => {
      progress.user = user;
      progress.state.next('CALCULATINGPAGES');
      const from = scrobbles.length ? String(scrobbles[scrobbles.length - 1].date.getTime() / 1000 + 1) : user.registered.unixtime;
      this.get(user.name, from, to, 1).subscribe(r => {
        const page = parseInt(r.recenttracks['@attr'].totalPages);

        // trigger update for imported scrobbles
        if (scrobbles.length) {
          progress.loader.next(scrobbles);
        }

        if (page > 0) {
          progress.state.next('RETRIEVING');
          progress.totalPages = page;
          progress.currentPage = page;
          progress.loadScrobbles = parseInt(r.recenttracks['@attr'].total);
          this.iterate(progress, from, to, 3);
        } else {
          progress.state.next('COMPLETED');
        }
      });
    }, () => progress.state.next('USERNOTFOUND'));

    return progress;
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
    this.get(progress.user!.name, from, to, progress.currentPage).subscribe(r => {
      if (progress.state.value === 'INTERRUPTED') {
        return;
      }

      const tracks: Scrobble[] = r.recenttracks.track.filter(t => t.date && !(t['@attr']?.nowplaying === 'true')).map(t => ({
        track: t.name,
        artist: t.artist['#text'],
        date: new Date(t.date?.uts * 1000)
      })).reverse();
      if (progress.currentPage === progress.totalPages) {
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
      }
      // sometimes lastfm returns a 500, retry a few times.
    }, () => retry > 0 ? this.iterate(progress, from, to, retry--) : undefined);
  }

  private get(username: string, from: string, to: string, page: number): Observable<Response> {
    const params = new HttpParams()
      .append('method', 'user.getrecenttracks')
      .append('api_key', this.KEY)
      .append('user', username)
      .append('format', 'json')
      .append('to', to)
      .append('from', from)
      .append('limit', String(Constants.API_PAGE_SIZE))
      .append('page', String(page));

    return this.http.get<Response>(this.API, {params});
  }
}
