import { Injectable, inject } from '@angular/core';
import { switchMap, of } from 'rxjs';
import { AbstractItemRetriever } from './abstract-item-retriever.service';
import { DatabaseService } from './database.service';
import { ScrobbleImporter } from './scrobble-importer.service';
import { ScrobbleStore } from './scrobble.store';

@Injectable()
export class ScrobbleManager {
  private importer = inject(ScrobbleImporter);
  private receiver = inject(AbstractItemRetriever);
  private store = inject(ScrobbleStore);
  private database = inject(DatabaseService);

  /**
   * Starts retrieving scrobbles but first checks if any scrobbles are present from import or db
   */
  start(username: string) {
    const imported = this.importer.get();
    (imported?.length ? of(imported) : this.database.findUser(username).pipe(
      switchMap(user => user ? this.database.getScrobbles(user.id!) : of([])),
    )).subscribe(scrobbles => {
      this.store.start(scrobbles);
      this.receiver.retrieveFor(username, scrobbles, this.store);
    });
  }
}
