import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { AbstractUrlService } from '../../../shared/src/lib/service/abstract-url.service';
import { App } from 'projects/shared/src/lib/app/model';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home/home.component';
import { LastfmUrlService } from './lastfm-url.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ScrobbleRetrieverService } from 'projects/lastfm-stats/src/app/scrobble-retriever.service';
import { SharedModule } from 'projects/shared/src/lib/shared.module';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { MockRetrieverService } from './mock-retriever.service';
import { UsernameService } from '../../../shared/src/lib/service/username.service';

@NgModule({
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    HomeComponent,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    RouterModule.forRoot(SharedModule.getRoutesFor(HomeComponent, 'scrobbles')),
    SharedModule,
  ],
  providers: [
    { provide: AbstractItemRetriever, useFactory: (http: HttpClient, username: UsernameService) => {
        return environment.production ? new ScrobbleRetrieverService(http, username) : new MockRetrieverService(http, username);
      }, deps: [HttpClient, UsernameService]},
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
