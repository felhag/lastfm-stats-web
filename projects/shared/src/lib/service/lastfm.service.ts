import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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
  from: string;
  to: string;
  page: number;
  limit: number;
}

@Injectable({providedIn: 'root'})
export class LastfmService {
  private readonly API = 'https://ws.audioscrobbler.com/2.0/';
  private readonly KEY = '2c223bda2fe846bd5c24f9a5d2da834e';

  private readonly http = inject(HttpClient);

  getRecentTracks(params: RecentTracksParams): Observable<LfmRecentTracksResponse> {
    const httpParams = this.params()
      .append('method', 'user.getrecenttracks')
      .append('user', params.user)
      .append('to', params.to)
      .append('from', params.from)
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

  private params() {
    return new HttpParams().append('api_key', this.KEY).append('format', 'json');
  }
}
