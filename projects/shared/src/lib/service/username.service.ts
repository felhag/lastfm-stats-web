import { Injectable } from '@angular/core';
import { Router, ActivationEnd } from '@angular/router';
import { map, filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UsernameService {
  username?: string;

  constructor(router: Router) {
    router.events
      .pipe(
        filter(e => e instanceof ActivationEnd),
        map(e => (e as ActivationEnd).snapshot.params)
      ).subscribe(params => this.username = params['username']);
  }
}
