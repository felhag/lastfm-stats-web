import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ChartsComponent} from './charts/charts.component';
import {HomeComponent} from './home/home.component';
import {AlbumListsComponent} from './lists/album-lists.component';
import {ArtistListsComponent} from './lists/artist-lists.component';
import {ScrobbleListsComponent} from './lists/scrobble-lists.component';
import {TrackListsComponent} from './lists/track-lists.component';
import {StatsComponent} from './stats/stats.component';

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
      }]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
