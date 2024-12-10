import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';

declare const _paq: any[];

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class AppComponent {
  title = 'lastfm-stats-web';

  constructor(router: Router) {
    router.events.subscribe(val => {
      if (val instanceof NavigationEnd) {
        _paq.push(['setCustomUrl', window.location.pathname]);
        _paq.push(['setDocumentTitle', window.location.pathname]);
        _paq.push(['trackPageView']);
      }
    });
  }
}
