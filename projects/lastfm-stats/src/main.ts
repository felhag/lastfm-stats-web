import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { LastfmStatsModule } from 'projects/lastfm-stats/src/app/lastfm-stats.module';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(LastfmStatsModule)
  .catch(err => console.error(err));
