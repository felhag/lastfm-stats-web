import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Observable, map, distinctUntilChanged, pairwise, filter, merge } from 'rxjs';
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

@Injectable()
export class ScrobbleStore extends ComponentStore<ScrobbleState> {
  constructor() {
    super({
      scrobbles: [],
      state: 'LOADINGUSER',
      totalPages: 0,
      loadScrobbles: 0,
      importedScrobbles: 0,
      currentPage: 0
    });
  }

  readonly start = this.updater((data: ScrobbleState, scrobbles: Scrobble[]) => {
    return {
      ...data,
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

  readonly scrobbles: Observable<Scrobble[]> = this.select(state => state.scrobbles);
  readonly first = this.scrobbles.pipe(map(scrobbles => scrobbles[0]), distinctUntilChanged());
  readonly last = this.scrobbles.pipe(map(scrobbles => scrobbles[scrobbles.length - 1]), distinctUntilChanged());
  readonly loadingState = this.select(state => state.state);
  readonly user = this.select(state => state.user);

  private readonly imported = this.state$.pipe(filter(s => s.state === 'LOADINGUSER'), map(s => s.scrobbles));
  private readonly pageChunk = this.state$.pipe(
    filter(state => state.state === 'RETRIEVING'),
    map(state => state.scrobbles),
    pairwise(),
    map(([prev, next]) => next.slice(prev.length)),
  );

  readonly chunk = merge(
    this.imported.pipe(map(scrobbles => [scrobbles, false] as [Scrobble[], boolean])),
    this.pageChunk.pipe(map(scrobbles => [scrobbles, true] as [Scrobble[], boolean]))
  );
}
