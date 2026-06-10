import { Service, inject } from '@angular/core';
import { Router, ActivationEnd } from '@angular/router';
import { map, filter } from 'rxjs/operators';

@Service()
export class UsernameService {
  username?: string;

  constructor() {
    inject(Router).events
      .pipe(
        filter(e => e instanceof ActivationEnd),
        map(e => (e as ActivationEnd).snapshot.params)
      ).subscribe(params => this.username = params['username']);
  }
}
