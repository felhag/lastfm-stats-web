import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { ScrobbleRetrieverService } from 'projects/lastfm-stats/src/app/scrobble-retriever.service';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { App } from 'projects/shared/src/lib/app/model';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { SharedModule } from 'projects/shared/src/lib/shared.module';
import { AbstractUrlService } from '../../../shared/src/lib/service/abstract-url.service';
import { HomeComponent } from './home/home.component';
import { LastfmUrlService } from './lastfm-url.service';

@NgModule({
  declarations: [
    HomeComponent
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    SharedModule,
    RouterModule.forRoot(SharedModule.getRoutesFor(HomeComponent, 'scrobbles'))
  ],
  providers: [
    { provide: AbstractItemRetriever, useExisting: ScrobbleRetrieverService },
    { provide: AbstractUrlService, useExisting: LastfmUrlService },
    { provide: App, useValue: App.lastfm },
    { provide: 'translations', useValue: {
        'translate.scrobble': 'scrobble',
        'translate.scrobbles': 'scrobbles',
        'translate.scrobbled': 'scrobbled',
      }}
  ],
  bootstrap: [AppComponent]
})
export class LastfmStatsModule { }
