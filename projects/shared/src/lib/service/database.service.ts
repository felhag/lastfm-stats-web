import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Observable, from, switchMap, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { App, Scrobble } from '../app/model';

export interface DbUser {
  id?: number;
  username: string;
}

export interface DbUserScrobble extends Scrobble {
  id?: number;
  userId: number;
}

class AppDB extends Dexie {
  users!: Table<DbUser, number>;
  scrobbles!: Table<DbUserScrobble, number>;

  constructor(databaseName: string) {
    super(databaseName);
  }
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: AppDB;

  constructor(app: App) {
    this.db = new AppDB(app === App.lastfm ? 'lastfmstats' : 'spotifystats');
    this.db.version(1).stores({
      users: '++id,&username',
      scrobbles: '++id,userId,artist,album,track,date',
    });
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
    return from(this.db.users.get({username}));
  }

  getUsers(): Observable<DbUser[]> {
    return from(this.db.users.toArray());
  }

  getScrobbles(userId: number): Observable<DbUserScrobble[]> {
    return from(this.db.transaction('r', this.db.scrobbles, async () => this.db.scrobbles.where('userId').equals(userId).toArray()));
  }

  addScrobbles(username: string, scrobbles: Scrobble[]): Observable<number> {
    return this.findOrCreateUser(username).pipe(
      // first delete all saved scrobbles from db
      switchMap(userId =>
        combineLatest([of(userId), this.getScrobbles(userId).pipe(
          map(scrobbles => scrobbles.map(s => s.id!)),
          switchMap(ids => from(this.db.scrobbles.bulkDelete(ids)))
        )]).pipe(map(([userId]) => userId))),
      // then create new entries for all known scrobbles
      switchMap(userId => {
        const dbScrobbles = scrobbles.map(scrobble => ({...scrobble, userId} as DbUserScrobble));
        return from(this.db.scrobbles.bulkAdd(dbScrobbles));
      })
    );
  }
}
