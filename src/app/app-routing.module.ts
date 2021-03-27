import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ChartsComponent} from './charts/charts.component';
import {HomeComponent} from './home/home.component';
import {ListsComponent} from './lists/lists.component';
import {StatsComponent} from './stats/stats.component';

const routes: Routes = [
  {path: '', component: HomeComponent},
  {
    path: 'user/:username',
    component: StatsComponent,
    children: [
      {
        path: '',
        redirectTo: 'lists',
        pathMatch: 'full'
      }, {
        path: 'lists',
        pathMatch: 'full',
        component: ListsComponent
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
