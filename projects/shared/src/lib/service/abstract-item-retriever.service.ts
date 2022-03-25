import { Scrobble, Progress } from 'projects/shared/src/lib/app/model';

export abstract class AbstractItemRetriever {
  imported: Scrobble[] = [];

  abstract retrieveFor(username: string): Progress;

  protected handleImportedItem(scrobbles: Scrobble[], progress: Progress) {
    if (scrobbles.length) {
      progress.loader.next(scrobbles);
      progress.first.next(scrobbles[0]);
      progress.last.next(scrobbles[scrobbles.length - 1]);
    }
  }
}
