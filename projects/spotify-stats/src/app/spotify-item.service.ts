import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { take } from 'rxjs';
import { ScrobbleStore } from '../../../shared/src/lib/service/scrobble.store';

@Injectable({
  providedIn: 'root'
})
export class SpotifyItemService extends AbstractItemRetriever {

  constructor(private scrobbles: ScrobbleStore, private router: Router) {
    super();
  }

  retrieveFor(username: string): void {
    this.scrobbles.scrobbles.pipe(take(1)).subscribe(scrobbles => {
      if (scrobbles.length === 0) {
        this.router.navigate(['/']);
        return;
      }

      this.scrobbles.updateUser({
        name: username,
        playcount: String(scrobbles.length),
        registered: {unixtime: String(scrobbles[0].date.getTime())},
        url: 'https://open.spotify.com/user/' + username,
        image: []
      });
      this.scrobbles.finish('COMPLETED');
    });
  }
}
