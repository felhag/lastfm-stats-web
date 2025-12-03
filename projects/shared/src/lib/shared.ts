import { EnvironmentProviders, importProvidersFrom, Provider, Type } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { AlbumListsComponent } from './lists/album-lists.component';
import { ArtistListsComponent } from './lists/artist-lists.component';
import { ChartsComponent } from './charts/charts.component';
import { DatasetComponent } from './dataset/dataset.component';
import { ScrobbleListsComponent } from './lists/scrobble-lists.component';
import { StatsComponent } from './stats/stats.component';
import { TrackListsComponent } from './lists/track-lists.component';
import { GeneralComponent } from './general/general.component';
import { NgCircleProgressModule } from "ng-circle-progress";
import { provideHighcharts } from "highcharts-angular";
import { Constants } from "./app/model";
import * as Highcharts from "highcharts";

export class Shared {
  public static routerProvider(home: Type<any>, scrobblesRoute: string): EnvironmentProviders {
    return provideRouter([
      { path: '', component: home },
      {
        path: 'user/:username',
        component: StatsComponent,
        children: [
          {
            path: '',
            redirectTo: 'general',
            pathMatch: 'full'
          }, {
            path: 'general',
            pathMatch: 'full',
            component: GeneralComponent
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
    ]);
  }

  public static ngCircleProvider() {
    return importProvidersFrom(
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
      })
    );
  }

  public static highchartsProvider() {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
    const style = { style: { color: '#fff' } };
    if (darkMode.matches) {
      return provideHighcharts({
        options: {
          chart: {
            backgroundColor: '#424242'
          },
          title: style,
          subtitle: style,
          legend: { itemStyle: { color: '#fff' } },
          xAxis: {
            title: style,
            labels: style
          },
          yAxis: {
            title: style,
            labels: style
          },
          colors: Constants.DARK_COLORS,
          plotOptions: { series: { borderColor: '#424242' } },
          navigation: { buttonOptions: { enabled: false } },
          accessibility: { enabled: false }
        }
      });
    } else {
      return provideHighcharts({
        options: {
          colors: Constants.COLORS,
          navigation: { buttonOptions: { enabled: false } },
          accessibility: { enabled: false }
        }
      })
    }
  }

  static translationsProvider(scrobble: string, scrobbles: string, scrobbled: string): Provider {
    return {
      provide: 'translations', useValue: {
        'translate.scrobble': scrobble,
        'translate.scrobbles': scrobbles,
        'translate.scrobbled': scrobbled,
      }
    }
  }
}
