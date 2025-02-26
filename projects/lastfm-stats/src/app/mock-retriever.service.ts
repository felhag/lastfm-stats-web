import { Injectable } from '@angular/core';
import { Export, Scrobble } from 'projects/shared/src/lib/app/model';
import { ScrobbleStore } from '../../../shared/src/lib/service/scrobble.store';

import * as scrobbles from '../../../../projects/lastfmstats-TestUser.json';
import { ScrobbleRetrieverService } from './scrobble-retriever.service';

@Injectable({
  providedIn: 'root'
})
export class MockRetrieverService extends ScrobbleRetrieverService {
  data: Export = scrobbles;

  retrieveFor(username: string, imported: Scrobble[], store: ScrobbleStore): void {
    if (username.toLowerCase() !== 'testuser') {
      super.retrieveFor(username, imported, store);
    } else {
      store.page(this.data.scrobbles.map(s => ({track: s.track, artist: s.artist, album: s.album, albumId: '', date: new Date(s.date)})));
      store.updateUser({
        name: username,
        url: 'https://www.last.fm/user/' + username,
        playcount: '1891',
        registered: {unixtime: "1083442051"},
        image: []
      });
      store.finish('COMPLETED');
    }
  }
}
