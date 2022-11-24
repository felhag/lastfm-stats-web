import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { AbstractUrlService } from '../../../shared/src/lib/service/abstract-url.service';
import { App } from 'projects/shared/src/lib/app/model';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home/home.component';
import { LastfmUrlService } from './lastfm-url.service';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ScrobbleRetrieverService } from 'projects/lastfm-stats/src/app/scrobble-retriever.service';
import { SharedModule } from 'projects/shared/src/lib/shared.module';

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
    MatSelectModule,
    MatTooltipModule,
    RouterModule.forRoot(SharedModule.getRoutesFor(HomeComponent, 'scrobbles')),
    SharedModule,
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
