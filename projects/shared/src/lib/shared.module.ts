import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule, Type } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Routes, RouterModule } from '@angular/router';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { AppComponent } from 'projects/shared/src/lib/app/app.component';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { AlbumListsComponent } from './lists/album-lists.component';
import { ArtistListsComponent } from './lists/artist-lists.component';
import { ChartsComponent } from './charts/charts.component';
import { ConfComponent } from './conf/conf.component';
import { DatasetComponent } from './dataset/dataset.component';
import { DatasetModalComponent } from './dataset/dataset-modal/dataset-modal.component';
import { ProgressComponent } from './progress/progress.component';
import { ScrobbleListsComponent } from './lists/scrobble-lists.component';
import { StatsComponent } from './stats/stats.component';
import { Top10listComponent } from './lists/top10list/top10list.component';
import { TrackListsComponent } from './lists/track-lists.component';
import { ChartLoaderDirective } from './directive/chart-loader.directive';

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        CommonModule,
        HttpClientModule,
        ReactiveFormsModule,
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
        RouterModule,
        AlbumListsComponent,
        ArtistListsComponent,
        ChartLoaderDirective,
        ChartsComponent,
        ConfComponent,
        DatasetComponent,
        DatasetModalComponent,
        ProgressComponent,
        ScrobbleListsComponent,
        StatsComponent,
        Top10listComponent,
        TrackListsComponent,
        TranslatePipe
    ],
    exports: [
        AppComponent,
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
