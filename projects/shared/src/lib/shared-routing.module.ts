import { NgModule } from '@angular/core';
import { AlbumListsComponent } from 'projects/shared/src/lib/lists/album-lists.component';
import { ArtistListsComponent } from 'projects/shared/src/lib/lists/artist-lists.component';
import { ChartsComponent } from 'projects/shared/src/lib/charts/charts.component';
import { DatasetComponent } from 'projects/shared/src/lib/dataset/dataset.component';
import { HomeComponent } from 'projects/shared/src/lib/home/home.component';
import { RouterModule, Routes } from '@angular/router';
import { ScrobbleListsComponent } from 'projects/shared/src/lib/lists/scrobble-lists.component';
import { StatsComponent } from 'projects/shared/src/lib/stats/stats.component';
import { TrackListsComponent } from 'projects/shared/src/lib/lists/track-lists.component';

const routes: Routes = [
  {path: '', component: HomeComponent},
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

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class SharedRoutingModule {
}
