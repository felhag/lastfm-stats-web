import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { App } from 'projects/shared/src/lib/app/model';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { SpotifyItemService } from 'projects/spotify-stats/src/app/spotify-item.service';
import { AbstractUrlService } from '../../../shared/src/lib/service/abstract-url.service';
import { HomeComponent } from './home/home.component';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { NgModule } from '@angular/core';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'projects/shared/src/lib/shared.module';
import { InfoDialogComponent } from './info-dialog/info-dialog.component';
import { SpotifyUrlService } from './spotify-url.service';

@NgModule({
  declarations: [
    HomeComponent,
    InfoDialogComponent
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
    NgxDropzoneModule,
    ReactiveFormsModule,
    RouterModule.forRoot(SharedModule.getRoutesFor(HomeComponent, 'plays')),
    SharedModule
  ],
  providers: [
    { provide: AbstractItemRetriever, useExisting: SpotifyItemService },
    { provide: AbstractUrlService, useExisting: SpotifyUrlService },
    { provide: App, useValue: App.spotify },
    { provide: 'translations', useValue: {
      'translate.scrobble': 'play',
      'translate.scrobbles': 'plays',
      'translate.scrobbled': 'played',
    }}
  ],
  bootstrap: [AppComponent]
})
export class SpotifyStatsModule { }
