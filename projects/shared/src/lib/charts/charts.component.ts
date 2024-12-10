import { Component, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as Highcharts from 'highcharts';
import { TempStats, Constants } from 'projects/shared/src/lib/app/model';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { ArtistScrobbleChart } from 'projects/shared/src/lib/charts/artist-scrobble-chart';
import { ArtistTimelineChart } from 'projects/shared/src/lib/charts/artist-timeline-chart';
import { CumulativeItemsChart } from 'projects/shared/src/lib/charts/cumulative-items-chart';
import { PunchcardChart } from 'projects/shared/src/lib/charts/punchcard-chart';
import { RaceChart } from 'projects/shared/src/lib/charts/race-chart';
import { ScrobbleMomentChart } from 'projects/shared/src/lib/charts/scrobble-moment-chart';
import { ScrobblePerDayChart } from 'projects/shared/src/lib/charts/scrobble-per-day-chart';
import { ScrobbleScatterChart } from 'projects/shared/src/lib/charts/scrobble-scatter-chart';
import { TimelineChart } from 'projects/shared/src/lib/charts/timeline-chart';
import { WordcloudChart } from 'projects/shared/src/lib/charts/wordcloud-chart';
import { MapperService } from '../service/mapper.service';
import { AbstractUrlService } from '../service/abstract-url.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { ChartLoaderDirective } from '../directive/chart-loader.directive';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { LetterChart } from './letter-chart';


const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
if (darkMode.matches) {
  const style = { style: { color: '#fff'} };
  Highcharts.setOptions({
    chart: {
      backgroundColor: '#424242'
    },
    title: style,
    subtitle: style,
    legend: { itemStyle: {color: '#fff'} },
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
  });
} else {
  Highcharts.setOptions({
    colors: Constants.COLORS,
    navigation: { buttonOptions: { enabled: false } },
    accessibility: { enabled: false }
  });
}

@Component({
    selector: 'app-charts',
    templateUrl: './charts.component.html',
    styleUrls: ['./charts.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [TranslatePipe],
    imports: [MatCardModule, ChartLoaderDirective, MatButtonModule, MatTooltipModule, MatIconModule, MatMenuModule]
})
export class ChartsComponent {
  Highcharts: typeof Highcharts = Highcharts;
  charts: AbstractChart[];

  constructor(
    private builder: StatsBuilderService,
    url: AbstractUrlService,
    translate: TranslatePipe,
    mapper: MapperService) {

    this.charts = [
      new TimelineChart(translate),
      new ArtistScrobbleChart(translate, url),
      new ArtistTimelineChart(translate, url, mapper),
      new CumulativeItemsChart(translate, mapper),
      new WordcloudChart(mapper),
      new LetterChart(translate, mapper),
      new PunchcardChart(translate, url),
      new ScrobbleScatterChart(translate),
      new ScrobblePerDayChart(translate),
      new RaceChart(url, mapper),
      new ScrobbleMomentChart(translate, 'hours', Array.from(Array(24).keys()).map(k => `${k}h`), s => s.hours),
      new ScrobbleMomentChart(translate, 'days', Constants.DAYS,
          stats => stats.days,
          (stats, key) => Object.keys(stats.specificDays).filter(d => key === new Date(parseInt(d)).getDay()).length),
      new ScrobbleMomentChart(translate, 'months', Constants.MONTHS,
          stats => stats.months,
        (stats, key) => Object.keys(stats.monthList).filter(month => month.startsWith(key + '-')).length),
    ];

    this.builder.tempStats.pipe(takeUntilDestroyed()).subscribe(stats => this.updateStats(stats));
  }

  private updateStats(stats: TempStats): void {
    this.charts.forEach(c => c.update(stats));
  }
}
