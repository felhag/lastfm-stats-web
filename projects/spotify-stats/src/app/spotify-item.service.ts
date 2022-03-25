import { Injectable } from '@angular/core';
import { Progress } from 'projects/shared/src/lib/app/model';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { ProgressService } from 'projects/shared/src/lib/service/progress.service';
import { timer, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpotifyItemService extends AbstractItemRetriever {

  constructor(private progress: ProgressService) {
    super();
  }

  retrieveFor(username: string): Progress {
    const progress = this.progress.init(this.imported);
    progress.user = {
      name: username,
      playcount: String(this.imported.length),
      registered: {unixtime: ''},
      url: 'https://open.spotify.com/user/' + username,
      image: [{
        '#text': ''
      }]
    };

    timer(0).pipe(take(1)).subscribe(() => {
      this.handleImportedItem(this.imported, progress);
      progress.state.next('COMPLETED');
    });
    return progress;
  }
}
