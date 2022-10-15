import Dexie, { Table } from 'dexie';
import { from, Observable, switchMap, of, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Scrobble } from './model';

export interface DbUser {
  id?: number;
  username: string;
}

export interface DbUserScrobble extends Scrobble {
  id?: number;
  userId: number;
}

export class AppDB extends Dexie {
  users!: Table<DbUser, number>;
  scrobbles!: Table<DbUserScrobble, number>;

  constructor() {
    super('lastfmstats');
    this.version(1).stores({
      users: '++id,&username',
      scrobbles: '++id,userId,artist,album,track,date',
    });
  }

  private findOrCreateUser(input: string): Observable<number> {
    const username = input.trim().toLowerCase();
    return from(this.transaction('rw', this.users, async () => {
      return this.users
        .get({username})
        .then(user => {
          if (user?.id) {
            return user.id;
          } else {
            return this.users.add({username});
          }
        })
    }));
  }

  getUsers(): Observable<DbUser[]> {
    return from(this.users.toArray());
  }

  getScrobbles(userId: number): Observable<DbUserScrobble[]> {
    return from(this.transaction('r', this.scrobbles, async () => this.scrobbles.where('userId').equals(userId).toArray()));
  }

  addScrobbles(username: string, scrobbles: Scrobble[]): Observable<number> {
    return this.findOrCreateUser(username).pipe(
      // first delete all saved scrobbles from db
      switchMap(userId =>
        combineLatest([of(userId), this.getScrobbles(userId).pipe(
          map(scrobbles => scrobbles.map(s => s.id!)),
          switchMap(ids => from(this.scrobbles.bulkDelete(ids)))
        )]).pipe(map(([userId]) => userId))),
      // then create new entries for all known scrobbles
      switchMap(userId => {
        const dbScrobbles = scrobbles.map(scrobble => ({...scrobble, userId} as DbUserScrobble));
        return from(this.scrobbles.bulkAdd(dbScrobbles));
      })
    );
  }
}

export const db = new AppDB();
