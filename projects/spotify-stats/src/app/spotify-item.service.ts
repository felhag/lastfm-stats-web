import { Service, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { Scrobble } from '../../../shared/src/lib/app/model';
import { ScrobbleStore } from '../../../shared/src/lib/service/scrobble.store';

@Service()
export class SpotifyItemService extends AbstractItemRetriever {
  private router = inject(Router);

  retrieveFor(username: string, imported: Scrobble[], store: ScrobbleStore): void {
    if (imported.length === 0) {
      this.router.navigate(['/']);
      return;
    }

    store.updateUser({
      name: username,
      playcount: String(imported.length),
      registered: {unixtime: String(imported[0].date.getTime())},
      url: 'https://open.spotify.com/user/' + username,
      image: []
    });
    store.finish('COMPLETED');
  }
}
