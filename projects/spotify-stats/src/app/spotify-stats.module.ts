import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { SharedModule } from 'projects/shared/src/lib/shared.module';
import { HomeComponent } from './home/home.component';

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
    RouterModule.forRoot(SharedModule.getRoutesFor(HomeComponent))
  ],
  bootstrap: [AppComponent]
})
export class SpotifyStatsModule { }
