import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HighchartsChartModule } from 'highcharts-angular';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { TableVirtualScrollModule } from 'ng-table-virtual-scroll';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ButtonsComponent } from './buttons/buttons.component';
import { ChartsComponent } from './charts/charts.component';
import { ConfComponent } from './conf/conf.component';
import { DatasetComponent } from './dataset/dataset.component';
import { HomeComponent } from './home/home.component';
import { AlbumListsComponent } from './lists/album-lists.component';
import { ArtistListsComponent } from './lists/artist-lists.component';
import { ScrobbleListsComponent } from './lists/scrobble-lists.component';
import { Top10listComponent } from './lists/top10list/top10list.component';
import { TrackListsComponent } from './lists/track-lists.component';
import { ProgressComponent } from './progress/progress.component';
import { StatsComponent } from './stats/stats.component';
import { DatasetModalComponent } from './dataset/dataset-modal/dataset-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    ArtistListsComponent,
    ButtonsComponent,
    ChartsComponent,
    ConfComponent,
    HomeComponent,
    ProgressComponent,
    ScrobbleListsComponent,
    StatsComponent,
    Top10listComponent,
    TrackListsComponent,
    AlbumListsComponent,
    DatasetComponent,
    DatasetModalComponent,
  ],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    HighchartsChartModule,
    HttpClientModule,
    MatAutocompleteModule,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
    ReactiveFormsModule,
    ScrollingModule,
    TableVirtualScrollModule,
    NgCircleProgressModule.forRoot({
      percent: 100,
      radius: 60,
      renderOnClick: false,
      showUnits: false,
      startFromZero: true,
      titleColor: 'currentColor'
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
