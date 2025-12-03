import { enableProdMode } from '@angular/core';

import { environment } from './environments/environment';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { SpotifyItemService } from 'projects/spotify-stats/src/app/spotify-item.service';
import { AbstractUrlService } from '../../shared/src/lib/service/abstract-url.service';
import { SpotifyUrlService } from './app/spotify-url.service';
import { App } from 'projects/shared/src/lib/app/model';
import { bootstrapApplication } from '@angular/platform-browser';
import { Shared } from '../../shared/src/lib/shared';

import { HomeComponent } from './app/home/home.component';
import { AppComponent } from "../../shared/src/lib/app/app.component";

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    {provide: AbstractItemRetriever, useExisting: SpotifyItemService},
    {provide: AbstractUrlService, useExisting: SpotifyUrlService},
    {provide: App, useValue: App.spotify},
    Shared.translationsProvider('play', 'plays', 'played'),
    Shared.routerProvider(HomeComponent, 'plays'),
    Shared.ngCircleProvider(),
    Shared.highchartsProvider(),
  ]
}).catch(err => console.error(err));
