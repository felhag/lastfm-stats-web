import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {ScrobbleRetrieverService, Scrobble} from './scrobble-retriever.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'lastfm-stats-web';
  scrobbles!: Observable<Scrobble[]>;

  constructor(private retriever: ScrobbleRetrieverService) {
  }

  ngOnInit(): void {
    this.scrobbles = this.retriever.retrieveFor('wildcatnl');
  }
}
