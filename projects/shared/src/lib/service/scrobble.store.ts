import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Observable, map, distinctUntilChanged, pairwise, takeUntil, filter } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { Scrobble, State, User, ErrorState, CompleteState } from '../app/model';

export interface ScrobbleState {
  scrobbles: Scrobble[];
  user?: User;
  state: State;
  totalPages: number;
  loadScrobbles: number;
  importedScrobbles: number;
  currentPage: number;
  pageLoadTime?: number;
}

@Injectable({providedIn: 'root'})
export class ScrobbleStore extends ComponentStore<ScrobbleState> {
  constructor() {
    super({
      scrobbles: [],
      state: 'COMPLETED',
      totalPages: 0,
      loadScrobbles: 0,
      importedScrobbles: 0,
      currentPage: 0
    });
  }

  readonly start = this.updater((data: ScrobbleState, scrobbles: Scrobble[]) => {
    return {
      ...data,
      state: 'LOADINGUSER',
      scrobbles: [...scrobbles],
      importedScrobbles: scrobbles.length
    };
  });

  readonly updateUser = this.updater((data: ScrobbleState, user: User) => {
    return {
      ...data,
      user,
      state: 'CALCULATINGPAGES'
    };
  });

  readonly totals = this.updater((data: ScrobbleState, page: {totalPages: number, currentPage: number, loadScrobbles: number}) => {
    return {
      ...data,
      ...page,
      state: 'RETRIEVING'
    };
  });

  readonly page = this.updater((data: ScrobbleState, scrobbles: Scrobble[]) => {
    if (data.state === 'INTERRUPTED') {
      return data;
    } else {
      return {
        ...data,
        currentPage: data.currentPage - 1,
        scrobbles: [...data.scrobbles, ...scrobbles]
      };
    }
  });

  readonly finish = this.updater((data: ScrobbleState, state: ErrorState | CompleteState) => {
    return {
      ...data,
      state
    };
  });

  readonly scrobbles: Observable<Scrobble[]> = this.state$.pipe(
    map(state => state.scrobbles),
    distinctUntilChanged()
  );

  readonly first = this.scrobbles.pipe(map(scrobbles => scrobbles[0]), distinctUntilChanged());
  readonly last = this.scrobbles.pipe(map(scrobbles => scrobbles[scrobbles.length - 1]), distinctUntilChanged());
  readonly state = this.select(state => state.state);
  readonly user = this.select(state => state.user);
  readonly chunk = this.scrobbles.pipe(
    startWith([]),
    pairwise(),
    takeUntil(this.state.pipe(filter(state => ['LOADINGUSER', 'CALCULATINGPAGES', 'RETRIEVING'].indexOf(state) < 0))),
    map(([prev, next]) => next.slice(prev.length)),
  );
}
