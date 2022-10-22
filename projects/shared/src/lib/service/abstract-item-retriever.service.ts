import { Scrobble } from '../app/model';
import { ScrobbleStore } from './scrobble.store';

export abstract class AbstractItemRetriever {
  abstract retrieveFor(username: string, imported: Scrobble[], store: ScrobbleStore): void;
}
