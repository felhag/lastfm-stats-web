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
  //
  // public void setArtist(Map<String, String> artist) {
  // this.artist = artist.get("#text");
}

export interface Scrobble {
  artist: string;
  track: string;
  date: Date;
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

  retrieveFor(username: string): Observable<Scrobble[]> {
    const result = new Subject<Scrobble[]>();
    const to = new Date().toDateString();
    this.get(username, to, 1).subscribe(r => {
      const page = r.recenttracks['@attr'].totalPages;
      this.iterate(result, username, to, page);
    });
    return result;
  }

  private iterate(subject: Subject<Scrobble[]>, username: string, to: string, page: number): void {
    this.get(username, to, page).subscribe(r => {
      console.log('retrieved');
      const tracks: Scrobble[] = r.recenttracks.track.map(t => ({
        track: t.name,
        artist: t.artist['#text'],
        date: t.date ? this.parseDate(t.date['#text']) : new Date()
      }));
      subject.next(tracks);

      const next = page - 1;
      if (next > 0) {
        this.iterate(subject, username, to, next);
      }
    });
  }

  private get(username: string, to: string, page: number): Observable<Response> {
    const params = new HttpParams()
      .append('method', 'user.getrecenttracks')
      .append('api_key', this.KEY)
      .append('user', username)
      .append('format', 'json')
      .append('limit', '200')
      .append('to', to)
      // .append('from', from)
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
