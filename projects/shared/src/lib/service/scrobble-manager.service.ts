import { Injectable } from '@angular/core';
import { switchMap, of } from 'rxjs';
import { AbstractItemRetriever } from './abstract-item-retriever.service';
import { DatabaseService } from './database.service';
import { ScrobbleImporter } from './scrobble-importer.service';
import { ScrobbleStore } from './scrobble.store';
import { StatsBuilderService } from './stats-builder.service';

@Injectable()
export class ScrobbleManager {
  constructor(private importer: ScrobbleImporter,
              private receiver: AbstractItemRetriever,
              private builder: StatsBuilderService,
              private store: ScrobbleStore,
              private database: DatabaseService) {
  }

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
