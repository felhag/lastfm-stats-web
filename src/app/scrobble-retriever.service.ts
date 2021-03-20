import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';

interface Response {
  recenttracks: RecentTracks;
}

interface RecentTracks {
  track: Track[];
  '@attr': {
    page: number;
    total: number;
    totalPages: number;
  };
}

interface Track {
  name: string;
  artist: {
    '#text': string;
  };
  date?: {
    '#text': string;
  };
}

export interface Scrobble {
  artist: string;
  track: string;
  date: Date;
}

export interface Progress {
  first: Subject<Scrobble>;
  last: Subject<Scrobble>;
  totalPages: number;
  total: number;
  currentPage: number;
  state: 'RETRIEVING' | 'INTERRUPTED' | 'COMPLETED';
  loader: Subject<Scrobble[]>;
}

@Injectable({
  providedIn: 'root'
})
export class ScrobbleRetrieverService {
  private readonly API = 'http://ws.audioscrobbler.com/2.0/';
  private readonly KEY = '2c223bda2fe846bd5c24f9a5d2da834e';
  private readonly MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  constructor(private http: HttpClient) {
  }

  retrieveFor(username: string): Progress {
    const to = new Date().toDateString();
    const progress: Progress = {
      loader: new Subject<Scrobble[]>(),
      first: new Subject<Scrobble>(),
      last: new Subject<Scrobble>(),
      state: 'RETRIEVING',
      totalPages: -1,
      currentPage: -1,
      total: -1,
    };
    this.get(username, to, 1).subscribe(r => {
      const page = r.recenttracks['@attr'].totalPages;
      progress.totalPages = page;
      progress.currentPage = page;
      progress.total = r.recenttracks['@attr'].total;
      this.iterate(progress, username, to, 3);
    });
    return progress;
  }

  private iterate(progress: Progress, username: string, to: string, retry: number): void {
    if (progress.state === 'INTERRUPTED') {
      return;
    }

    this.get(username, to, progress.currentPage).subscribe(r => {
      if (progress.state === 'INTERRUPTED') {
        return;
      }

      const tracks: Scrobble[] = r.recenttracks.track.filter(t => t.date).map(t => ({
        track: t.name,
        artist: t.artist['#text'],
        date: this.parseDate(t.date!['#text'])
      })).reverse();
      if (progress.currentPage === progress.totalPages) {
        progress.first.next(tracks[0]);
      }
      progress.last.next(tracks[tracks.length - 1]);
      progress.loader.next(tracks);
      progress.currentPage--;
      if (progress.currentPage > 0) {
        this.iterate(progress, username, to, 3);
      } else {
        progress.state = 'COMPLETED';
      }
      // sometimes lastfm returns a 500, retry a few times.
    }, () => retry > 0 ? this.iterate(progress, username, to, retry--) : undefined);
  }

  private get(username: string, to: string, page: number): Observable<Response> {
    const params = new HttpParams()
      .append('method', 'user.getrecenttracks')
      .append('api_key', this.KEY)
      .append('user', username)
      .append('format', 'json')
      .append('limit', '200')
      .append('to', to)
      .append('from', '36875258')
      .append('page', String(page));

    return this.http.get<Response>(this.API, {params});
  }

  private parseDate(input: string): Date {
    const d = parseInt(input.substr(0, 2), 0);
    const m = this.MONTHS.indexOf(input.substr(3, 3));
    const y = parseInt(input.substr(7, 4), 0);
    const hh = parseInt(input.substr(13, 2), 0);
    const mm = parseInt(input.substr(16, 2), 0);
    return new Date(y, m, d, hh, mm);
  }
}
