import { enableProdMode } from '@angular/core';

import { environment } from './environments/environment';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { LastfmService } from '../../shared/src/lib/service/lastfm.service';
import { UsernameService } from '../../shared/src/lib/service/username.service';
import { ScrobbleRetrieverService } from 'projects/lastfm-stats/src/app/scrobble-retriever.service';
import { MockRetrieverService } from './app/mock-retriever.service';
import { AbstractUrlService } from '../../shared/src/lib/service/abstract-url.service';
import { LastfmUrlService } from './app/lastfm-url.service';
import { App, Constants } from 'projects/shared/src/lib/app/model';
import { bootstrapApplication } from '@angular/platform-browser';

import { HomeComponent } from './app/home/home.component';
import { AppComponent } from '../../shared/src/lib/app/app.component';
import { Shared } from "../../shared/src/lib/shared";
import { provideHighcharts } from "highcharts-angular";

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: AbstractItemRetriever, useFactory: (lfm: LastfmService, username: UsernameService) => {
        return environment.production ? new ScrobbleRetrieverService(lfm, username) : new MockRetrieverService(lfm, username);
      }, deps: [LastfmService, UsernameService]
    },
    {provide: AbstractUrlService, useExisting: LastfmUrlService},
    {provide: App, useValue: App.lastfm},
    Shared.translationsProvider('scrobble', 'scrobbles', 'scrobbled'),
    Shared.routerProvider(HomeComponent, 'scrobbles'),
    Shared.highchartsProvider(),
  ],
}).catch(err => console.error(err));
