import { enableProdMode } from '@angular/core';

import { environment } from './environments/environment';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { HttpClient } from '@angular/common/http';
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
      provide: AbstractItemRetriever, useFactory: (http: HttpClient, username: UsernameService) => {
        return environment.production ? new ScrobbleRetrieverService(http, username) : new MockRetrieverService(http, username);
      }, deps: [HttpClient, UsernameService]
    },
    {provide: AbstractUrlService, useExisting: LastfmUrlService},
    {provide: App, useValue: App.lastfm},
    Shared.translationsProvider('scrobble', 'scrobbles', 'scrobbled'),
    Shared.routerProvider(HomeComponent, 'scrobbles'),
    Shared.ngCircleProvider(),
    Shared.highchartsProvider(),
  ],
}).catch(err => console.error(err));
