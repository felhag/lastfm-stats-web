import { Injectable } from '@angular/core';
import { AbstractItemRetriever } from './abstract-item-retriever.service';
import { ScrobbleImporter } from './scrobble-importer.service';
import { ScrobbleStore } from './scrobble.store';
import { StatsBuilderService } from './stats-builder.service';

@Injectable()
export class ScrobbleManager {
  constructor(private importer: ScrobbleImporter,
              private receiver: AbstractItemRetriever,
              private builder: StatsBuilderService,
              private store: ScrobbleStore) {
  }

  start(username: string) {
    const imported = this.importer.get();
    this.store.start(imported);
    this.receiver.retrieveFor(username, imported, this.store);
  }
}
