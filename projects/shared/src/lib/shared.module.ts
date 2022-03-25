import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule, Type } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { Routes, RouterModule } from '@angular/router';
import { HighchartsChartModule } from 'highcharts-angular';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { TableVirtualScrollModule } from 'ng-table-virtual-scroll';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { AlbumListsComponent } from './lists/album-lists.component';
import { ArtistListsComponent } from './lists/artist-lists.component';
import { ButtonsComponent } from './buttons/buttons.component';
import { ChartsComponent } from './charts/charts.component';
import { ConfComponent } from './conf/conf.component';
import { DatasetComponent } from './dataset/dataset.component';
import { DatasetModalComponent } from './dataset/dataset-modal/dataset-modal.component';
import { ProgressComponent } from './progress/progress.component';
import { ScrobbleListsComponent } from './lists/scrobble-lists.component';
import { StatsComponent } from './stats/stats.component';
import { Top10listComponent } from './lists/top10list/top10list.component';
import { TrackListsComponent } from './lists/track-lists.component';

@NgModule({
  declarations: [
    AppComponent,
    AlbumListsComponent,
    ArtistListsComponent,
    ButtonsComponent,
    ChartsComponent,
    ConfComponent,
    DatasetComponent,
    DatasetModalComponent,
    ProgressComponent,
    ScrobbleListsComponent,
    StatsComponent,
    Top10listComponent,
    TrackListsComponent,
  ],
  imports: [
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
      animationDuration: 1000,
      percent: 100,
      maxPercent: 100,
      radius: 60,
      renderOnClick: false,
      showUnits: false,
      startFromZero: true,
      titleColor: 'currentColor',
      outerStrokeColor: 'var(--primaryColor)',
      innerStrokeColor: 'var(--primaryColorContrast)'
    }),
    MatCheckboxModule,
    RouterModule
  ],
  exports: [
    AppComponent,
    AlbumListsComponent,
    ArtistListsComponent,
    ButtonsComponent,
    ChartsComponent,
    ConfComponent,
    DatasetComponent,
    DatasetModalComponent,
    ProgressComponent,
    ScrobbleListsComponent,
    StatsComponent,
    Top10listComponent,
    TrackListsComponent,
  ],
  bootstrap: [AppComponent]
})
export class SharedModule {
  public static getRoutesFor(home: Type<any>): Routes {
    return [
      {path: '', component: home},
      {
        path: 'user/:username',
        component: StatsComponent,
        children: [
          {
            path: '',
            redirectTo: 'artists',
            pathMatch: 'full'
          }, {
            path: 'artists',
            pathMatch: 'full',
            component: ArtistListsComponent
          }, {
            path: 'albums',
            pathMatch: 'full',
            component: AlbumListsComponent
          }, {
            path: 'tracks',
            pathMatch: 'full',
            component: TrackListsComponent
          }, {
            path: 'scrobbles',
            pathMatch: 'full',
            component: ScrobbleListsComponent
          }, {
            path: 'charts',
            pathMatch: 'full',
            component: ChartsComponent
          }, {
            path: 'dataset',
            pathMatch: 'full',
            component: DatasetComponent
          }]
      },
    ];
  }

}
