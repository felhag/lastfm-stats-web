import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { LastfmStatsModule } from 'projects/lastfm-stats/src/app/lastfm-stats.module';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(LastfmStatsModule, { applicationProviders: [provideZoneChangeDetection()], })
  .catch(err => console.error(err));
