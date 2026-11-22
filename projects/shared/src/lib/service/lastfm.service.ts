import { HttpClient, HttpParams } from '@angular/common/http';
import { DOCUMENT, Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { User } from '../app/model';

export interface LfmArtistInfoResponse {
  artist: {
    name: string;
    mbid?: string;
    tags?: { tag: { name: string }[] };
    stats?: {
      listeners: string;
      playcount: string;
    };
  };
  error?: number;
}

export interface LfmRecentTracksResponse {
  recenttracks: {
    track: LfmTrack[];
    '@attr': {
      page: string;
      total: string;
      totalPages: string;
    };
  };
}

export interface LfmTrack {
  name: string;
  artist: { '#text': string };
  album: { '#text': string; mbid: string };
  date: { uts: number };
  '@attr'?: { nowplaying: 'true' | 'false' };
}

export interface RecentTracksParams {
  user: string;
  from?: string;
  to: string;
  page: number;
  limit: number;
}

const DEFAULT_API = 'https://api.lastfmstats.com/2.0/';

@Service()
export class LastfmService {
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly http = inject(HttpClient);
  private readonly API = this.resolveApiUrl();

  getRecentTracks(params: RecentTracksParams): Observable<LfmRecentTracksResponse> {
    const httpParams = this.params()
      .append('method', 'user.getrecenttracks')
      .append('user', params.user)
      .append('to', params.to)
      .appendAll(params.from ? {from: params.from} : {})
      .append('limit', String(params.limit))
      .append('page', String(params.page));
    return this.http.get<LfmRecentTracksResponse>(this.API, {params: httpParams});
  }

  getArtistInfo(artist: string): Observable<LfmArtistInfoResponse> {
    const httpParams = this.params()
      .append('method', 'artist.getInfo')
      .append('artist', artist)
      .append('autocorrect', '1');
    return this.http.get<LfmArtistInfoResponse>(this.API, {params: httpParams});
  }

  getUserInfo(username: string): Observable<User> {
    const httpParams = this.params()
      .append('method', 'user.getinfo')
      .append('user', username);
    return this.http.get<{user: User}>(this.API, {params: httpParams}).pipe(map(r => r.user));
  }

  private resolveApiUrl(): string {
    const configured = this.document
      ?.querySelector('meta[name="lastfm-api-url"]')
      ?.getAttribute('content')
      ?.trim();
    if (!configured) {
      return DEFAULT_API;
    }
    return configured.endsWith('/') ? configured : `${configured}/`;
  }

  private params() {
    return new HttpParams();
  }
}
