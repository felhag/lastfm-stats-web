import { Service, inject, signal } from '@angular/core';
import { Observable, catchError, concat, concatMap, defer, from, map, of, switchMap } from 'rxjs';
import { ArtistInfo } from '../app/model';
import { DatabaseService } from './database.service';
import { LastfmService } from './lastfm.service';
import { MusicBrainzClient } from './musicbrainz.client';

export interface EnrichmentProgress {
  done: number;
  total: number;
  current?: string;
}

@Service()
export class EnrichmentService {
  private lfm = inject(LastfmService);
  private mb = inject(MusicBrainzClient);
  private db = inject(DatabaseService);

  private readonly cache = new Map<string, ArtistInfo>();
  readonly info = signal(this.cache, {equal: () => false});

  constructor() {
    this.db.getArtistInfo().subscribe(rows => {
      // skip entries already populated while the DB read was in flight
      rows.forEach(r => { if (!this.cache.has(r.artist)) this.cache.set(r.artist, r); });
      this.info.set(this.cache);
    });
  }

  enrich(artists: string[]): Observable<EnrichmentProgress> {
    return defer(() => {
      const queue = artists.filter(a => this.needsFetch(this.cache.get(a)));
      const total = queue.length;
      let done = 0;
      return from(queue).pipe(
        concatMap(artist => concat(
          of<EnrichmentProgress>({done, total, current: artist}),
          this.processArtist(artist).pipe(map(() => {
            done++;
            return {done, total, current: artist} as EnrichmentProgress;
          }))
        ))
      );
    });
  }

  private processArtist(artist: string): Observable<void> {
    return this.fetchOne(artist, this.cache.get(artist)).pipe(
      switchMap(enriched => {
        this.cache.set(artist, enriched);
        this.info.set(this.cache);
        return this.db.upsertArtistInfo([enriched]).pipe(
          catchError(() => of(undefined)),
          map(() => undefined),
        );
      })
    );
  }

  private needsFetch(info?: ArtistInfo): boolean {
    return !info || !info.lfmFetched || !info.mbid || !info.mbFetched;
  }

  private fetchOne(artist: string, existing?: ArtistInfo): Observable<ArtistInfo> {
    const initial: ArtistInfo = existing ?? {artist, tags: []};

    const afterLfm: Observable<ArtistInfo> = initial.lfmFetched
      ? of(initial)
      : this.fetchLastfm(artist).pipe(
        map(lfm => ({...initial, ...(lfm ?? {}), lfmFetched: Date.now()}))
      );

    return afterLfm.pipe(
      switchMap(result => {
        if (!result.mbid || result.mbFetched) return of(result);
        return this.fetchMb(result.mbid).pipe(
          map(mb => ({...result, ...(mb ?? {}), mbFetched: Date.now()}))
        );
      })
    );
  }

  private fetchLastfm(artist: string): Observable<Partial<ArtistInfo> | undefined> {
    return this.lfm.getArtistInfo(artist).pipe(
      catchError(() => of(undefined)),
      map(res => {
        const a = res?.artist;
        const tags = a?.tags?.tag.map(({ name }) => name.toLowerCase()) || [];
        return {
          mbid: a?.mbid || undefined,
          tags,
        };
      })
    );
  }

  private fetchMb(mbid: string): Observable<{country?: string; area?: string} | undefined> {
    return this.mb.lookupArtist(mbid).pipe(
      catchError(() => of(undefined)),
      map(res => res ? {country: res.country, area: res.area} : undefined)
    );
  }
}
