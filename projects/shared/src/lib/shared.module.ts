import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule, Type } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Routes, RouterModule } from '@angular/router';
import { HighchartsChartModule } from 'highcharts-angular';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { TableVirtualScrollModule } from 'ng-table-virtual-scroll';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { DbLoadButtonComponent } from './db-load-button/db-load-button.component';
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
    DbLoadButtonComponent,
    ProgressComponent,
    ScrobbleListsComponent,
    StatsComponent,
    Top10listComponent,
    TrackListsComponent,
    TranslatePipe
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
    MatSelectModule,
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
    DbLoadButtonComponent,
    ProgressComponent,
    ScrobbleListsComponent,
    StatsComponent,
    Top10listComponent,
    TrackListsComponent,
  ],
  bootstrap: [AppComponent]
})
export class SharedModule {
  public static getRoutesFor(home: Type<any>, scrobblesRoute: string): Routes {
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
            path: scrobblesRoute,
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
