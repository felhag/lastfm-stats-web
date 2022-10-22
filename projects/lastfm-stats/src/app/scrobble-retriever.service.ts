import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Scrobble, Constants, User } from 'projects/shared/src/lib/app/model';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { Observable, forkJoin, takeWhile, take } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ScrobbleStore } from '../../../shared/src/lib/service/scrobble.store';

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

interface LoadingState {
  store: ScrobbleStore;
  username: string;
  from: string;
  to: string;
  pageLoadTime?: number;
  totalPages?: number;
  pageSize?: number;
  page?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScrobbleRetrieverService extends AbstractItemRetriever {
  private readonly API = 'https://ws.audioscrobbler.com/2.0/';
  private readonly KEY = '2c223bda2fe846bd5c24f9a5d2da834e';
  artistSanitizer = new Map<string,string>();

  constructor(private http: HttpClient) {
    super();
  }

  retrieveFor(username: string, imported: Scrobble[], store: ScrobbleStore): void {
    const to = new Date().toDateString();

    this.artistSanitizer.clear();
    this.retrieveUser(username).subscribe({
      next: user => {
        store.updateUser(user);

        const from = String(this.determineFrom(user, imported));
        this.start({
          username: user.name,
          pageSize: Constants.API_PAGE_SIZE,
          store, from, to
        });
      },
      error: (e) => store.finish(e.status === 404 ? 'USERNOTFOUND' : 'LOADFAILED')
    });
  }

  private determineFrom(user: User, scrobbles: Scrobble[]): number {
    if (scrobbles.length) {
      return scrobbles[scrobbles.length - 1].date.getTime() / 1000 + 1;
    } else {
      return parseInt(user.registered.unixtime) - 1000;
    }
  }

  private start(loadingState: LoadingState): void {
    loadingState.page = 1;
    this.get(loadingState).subscribe({
      next: response => {
        const page = parseInt(response.recenttracks['@attr'].totalPages);

        // trigger update for imported scrobbles
        // this.handleImportedItem(scrobbles, progress);

        if (page > 0) {
          loadingState.store.totals({
            totalPages: page,
            currentPage: page,
            loadScrobbles: parseInt(response.recenttracks['@attr'].total)
          });

          this.iterate({...loadingState, page, totalPages: page});
        } else {
          this.complete(loadingState);
        }
      },
      error: err => {
        if (err.error?.error === 17) {
          loadingState.store.finish('LOADFAILEDDUEPRIVACY');
        } else if (loadingState.pageSize !== Constants.API_PAGE_SIZE_REDUCED) {
          // restart with a lower page size :/
          this.start({...loadingState, pageSize: Constants.API_PAGE_SIZE_REDUCED});
        } else {
          loadingState.store.finish('LOADFAILED');
        }
      }
    });
  }

  private complete(loadingState: LoadingState) {
    loadingState.store.finish('COMPLETED');
  }

  private retrieveUser(username: string): Observable<User> {
    const params = new HttpParams()
      .append('method', 'user.getinfo')
      .append('api_key', this.KEY)
      .append('user', username)
      .append('format', 'json');

    return this.http.get<{user: User}>(this.API, {params}).pipe(map(u => u.user));
  }

  private iterate(loadingState: LoadingState, retry: number = Constants.RETRIES): void {
    const start = new Date().getTime();

    loadingState.store.state.pipe(
      takeWhile(state => state === 'RETRIEVING'),
      take(1),
      switchMap(() => this.get(loadingState))
    ).subscribe({
      next: r => {
        this.updateTracks(loadingState, r.recenttracks.track);

        if (loadingState.page! > 0) {
          const ms = new Date().getTime() - start;
          const handled = loadingState.totalPages! - loadingState.page! - 1;
          const avgLoadTime = loadingState.pageLoadTime ? loadingState.pageLoadTime * handled : 0;
          loadingState.pageLoadTime = (avgLoadTime + ms) / (handled + 1);
          this.iterate(loadingState);
        } else {
          this.complete(loadingState);
        }
      },
      error: () => {
        if (retry > 0) {
          // sometimes lastfm returns a 500, retry a few times.
          this.iterate(loadingState, retry - 1);
        } else {
          // failed to load data twice. Lastfm is probably not gonna give a decent result, load this page in multiple chunks
          this.retryLowerPageSize(loadingState);
        }
      }
    });
  }

  private retryLowerPageSize(loadingState: LoadingState): void {
    const orgPageSize = loadingState.pageSize!;

    loadingState.store.state$.pipe(
      switchMap(state => {
        const newFrom = String(this.determineFrom(state.user!, state.scrobbles));
        const tempPageSize = loadingState.pageSize === 1000 ? 200 : 125;
        const tempState: LoadingState = {...loadingState, from: newFrom, page: 1, pageSize: tempPageSize};

        // split current page in five or four pages (based on page size)
        return this.get(tempState).pipe(switchMap(r => {
          // build observable for each page and combine result
          const lastPage = parseInt(r.recenttracks['@attr'].totalPages);
          return forkJoin(Array.from(Array(orgPageSize / tempPageSize).keys())
            .map((o, idx) => lastPage - idx)
            .map(page => this.get({...tempState, page})))
            .pipe(map(pages => pages.map(p => p.recenttracks.track).flat()));
        }));
      })
    ).subscribe({
      next: tracks => {
        // add combined chunks to result
        this.updateTracks(loadingState, tracks);

        // restart
        this.iterate(loadingState);
      },
      error: () => loadingState.store.finish('LOADSTUCK')
    });
  }

  private updateTracks(loadingState: LoadingState, response: Track[]): void {
    const tracks: Scrobble[] = response.filter(t => t.date && !(t['@attr']?.nowplaying === 'true')).map(t => ({
      track: t.name,
      artist: this.sanitizeArtist(t.artist['#text']),
      album: t.album['#text'],
      date: new Date(t.date?.uts * 1000)
    })).reverse();
    // if (!progress.first.value) {
    //   progress.first.next(tracks[0]);
    // }
    // progress.last.next(tracks[tracks.length - 1]);
    // progress.loader.next(tracks);
    // progress.allScrobbles.push(...tracks);
    // progress.currentPage--;

    loadingState.page!--;
    loadingState.store.page(tracks);
  }

  private get(loadingState: LoadingState): Observable<Response> {
    const params = new HttpParams()
      .append('method', 'user.getrecenttracks')
      .append('api_key', this.KEY)
      .append('user', loadingState.username)
      .append('format', 'json')
      .append('to', loadingState.to)
      .append('from', loadingState.from)
      .append('limit', String(loadingState.pageSize))
      .append('page', String(loadingState.page));

    return this.http.get<Response>(this.API, {params});
  }

  private sanitizeArtist(artist: string): string {
    const result = this.artistSanitizer.get(artist.toLowerCase());
    if (result) {
      return result;
    } else {
      this.artistSanitizer.set(artist.toLowerCase(), artist);
      return artist;
    }
  }
}
