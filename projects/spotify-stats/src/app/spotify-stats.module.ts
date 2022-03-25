import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
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
    MatListModule,
    MatTooltipModule,
    NgxDropzoneModule,
    RouterModule.forRoot(SharedModule.getRoutesFor(HomeComponent)),
    SharedModule
  ],
  bootstrap: [AppComponent]
})
export class SpotifyStatsModule { }
