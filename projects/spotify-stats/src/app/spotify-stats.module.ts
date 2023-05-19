import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { App } from 'projects/shared/src/lib/app/model';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { SpotifyItemService } from 'projects/spotify-stats/src/app/spotify-item.service';
import { AbstractUrlService } from '../../../shared/src/lib/service/abstract-url.service';
import { HomeComponent } from './home/home.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgModule } from '@angular/core';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'projects/shared/src/lib/shared.module';
import { SpotifyUrlService } from './spotify-url.service';

@NgModule({
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
