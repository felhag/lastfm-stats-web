import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Progress } from 'projects/shared/src/lib/app/model';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { ProgressService } from 'projects/shared/src/lib/service/progress.service';
import { timer, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpotifyItemService extends AbstractItemRetriever {

  constructor(private progress: ProgressService, private router: Router) {
    super();
  }

  retrieveFor(username: string): Progress {
    const progress = this.progress.init(this.imported);
    if (this.imported.length === 0) {
      this.router.navigate(['/']);
      return progress;
    }

    progress.user = {
      name: username,
      playcount: String(this.imported.length),
      registered: {unixtime: String(this.imported[0].date.getTime())},
      url: 'https://open.spotify.com/user/' + username,
      image: []
    };

    timer(0).pipe(take(1)).subscribe(() => {
      this.handleImportedItem(this.imported, progress);
      progress.state.next('COMPLETED');
    });
    return progress;
  }
}
