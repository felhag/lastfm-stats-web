import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { SpotifyStatsModule } from 'projects/spotify-stats/src/app/spotify-stats.module';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(SpotifyStatsModule)
  .catch(err => console.error(err));
