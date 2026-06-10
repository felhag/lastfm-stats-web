import { Service, inject } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Observable, from, switchMap, tap, forkJoin, of, concatMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { App, ArtistInfo, Scrobble } from '../app/model';

export interface DbUser {
  id?: number;
  username: string;
}

export interface DbUserScrobble extends Scrobble {
  id?: number;
  userId: number;
}

export interface DbArtistInfo extends ArtistInfo {
  id?: number;
}

class AppDB extends Dexie {
  users!: Table<DbUser, number>;
  scrobbles!: Table<DbUserScrobble, number>;
  artistInfo!: Table<DbArtistInfo, number>;

  constructor(databaseName: string) {
    super(databaseName);
  }
}

@Service()
export class DatabaseService {
  private db: AppDB;

  constructor() {
    const app = inject(App as any) as App;
    this.db = new AppDB(app === App.lastfm ? 'lastfmstats' : 'spotifystats');
    this.db.version(1).stores({
      users: '++id,&username',
      scrobbles: '++id,userId,artist,album,track,date',
    });
    this.db.version(2).stores({
      users: '++id,&username',
      scrobbles: '++id,userId,artist,album,track,date',
      artistInfo: '++id,&artist,mbid',
    });
  }

  getArtistInfo(): Observable<DbArtistInfo[]> {
    return from(this.db.artistInfo.toArray());
  }

  upsertArtistInfo(infos: ArtistInfo[]): Observable<number> {
    if (!infos.length) {
      return of(0);
    }
    return from(this.db.transaction('rw', this.db.artistInfo, async () => {
      const existing = await this.db.artistInfo.where('artist').anyOf(infos.map(i => i.artist)).toArray();
      const byArtist = new Map(existing.map(e => [e.artist, e]));
      const merged: DbArtistInfo[] = infos.map(info => {
        const prev = byArtist.get(info.artist);
        return prev ? {...prev, ...info} : info;
      });
      await this.db.artistInfo.bulkPut(merged);
      return merged.length;
    }));
  }

  private findOrCreateUser(input: string): Observable<number> {
    const username = input.trim().toLowerCase();
    return from(this.db.transaction('rw', this.db.users, async () => {
      return this.db.users
        .get({username})
        .then(user => {
          if (user?.id) {
            return user.id;
          } else {
            return this.db.users.add({username});
          }
        })
    }));
  }

  findUser(username: string): Observable<DbUser | undefined> {
    return from(this.db.users.get({username: username.toLowerCase()}));
  }

  getUsers(): Observable<DbUser[]> {
    return from(this.db.users.toArray());
  }

  getScrobbles(userId: number): Observable<DbUserScrobble[]> {
    return from(this.db.transaction('r', this.db.scrobbles, async () => this.db.scrobbles.where('userId').equals(userId).toArray()));
  }

  addScrobbles(username: string, scrobbles: Scrobble[]): Observable<number> {
    return this.findOrCreateUser(username).pipe(
      switchMap(userId => forkJoin([of(userId), this.getScrobbles(userId)])),
      switchMap(([userId, persisted]) => {
        let maxDate: number | undefined = undefined;
        for (const persist of persisted) {
          const time = persist.date.getTime();
          if (!maxDate || time > maxDate) {
            maxDate = time;
          }
        }

        const dbScrobbles = scrobbles
          .filter(s => !(s as DbUserScrobble).id)
          .filter(s => !maxDate || maxDate < s.date.getTime())
          .map(scrobble => ({...scrobble, userId} as DbUserScrobble));

        const chunkSize = 20000;
        const chunks = [];
        for (let i = 0; i < dbScrobbles.length; i += chunkSize) {
          chunks.push(dbScrobbles.slice(i, i + chunkSize));
        }

        return from(chunks).pipe(
          concatMap(chunk => from(this.db.scrobbles.bulkAdd(chunk))),
          map((_, index) => Math.min(((chunkSize * (index + 1)) / dbScrobbles.length), 1) * 100 )
        );
      })
    );
  }

  delete(username: string): Observable<number> {
    return this.findUser(username).pipe(
      map(user => user!.id!),
      tap(id => this.db.users.delete(id)),
      switchMap(id => from(this.db.transaction('rw', this.db.scrobbles, async () => this.db.scrobbles.where('userId').equals(id).delete())))
    );
  }
}
