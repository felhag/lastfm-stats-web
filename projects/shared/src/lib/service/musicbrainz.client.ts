import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, concatMap, from, lastValueFrom } from 'rxjs';

interface MbArtistResponse {
  id: string;
  name: string;
  country?: string;
  area?: { name: string };
  'begin-area'?: { name: string };
}

export interface MbArtist {
  mbid: string;
  country?: string;
  area?: string;
}

interface QueueItem {
  mbid: string;
  resolve: (value: MbArtist) => void;
  reject: (reason: unknown) => void;
}

@Injectable({providedIn: 'root'})
export class MusicBrainzClient {
  private readonly API = 'https://musicbrainz.org/ws/2';
  // MB asks for 1 req/sec for anonymous clients; 1.05s gives a safety margin.
  private readonly SPACING_MS = 1050;
  private readonly queue = new Subject<QueueItem>();

  constructor(private http: HttpClient) {
    this.queue.pipe(
      concatMap(item => from(this.process(item)))
    ).subscribe();
  }

  lookupArtist(mbid: string): Observable<MbArtist> {
    return new Observable<MbArtist>(observer => {
      this.queue.next({
        mbid,
        resolve: v => { observer.next(v); observer.complete(); },
        reject: e => observer.error(e),
      });
    });
  }

  private async process(item: QueueItem): Promise<void> {
    const start = Date.now();
    try {
      const res = await lastValueFrom(this.http.get<MbArtistResponse>(`${this.API}/artist/${item.mbid}`, {
        params: { fmt: 'json' },
      }));
      item.resolve({
        mbid: res.id,
        country: res.country,
        area: res.area?.name,
      });
    } catch (e) {
      item.reject(e);
    } finally {
      const elapsed = Date.now() - start;
      const wait = this.SPACING_MS - elapsed;
      if (wait > 0) {
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
}
