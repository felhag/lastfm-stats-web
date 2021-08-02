import {Component, AfterViewInit, ChangeDetectionStrategy} from '@angular/core';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import * as Highcharts from 'highcharts';
import {TempStats, Constants} from '../model';
import {StatsBuilderService} from '../service/stats-builder.service';
import {AbstractChart} from './abstract-chart';
import {ArtistScrobbleChart} from './artist-scrobble-chart';
import {ArtistTimelineChart} from './artist-timeline-chart';
import {CumulativeArtistChart} from './cumulative-artist-chart';
import {PunchcardChart} from './punchcard-chart';
import {RaceChart} from './race-chart';
import {ScrobbleMomentChart} from './scrobble-moment-chart';
import {ScrobblePerDayChart} from './scrobble-per-day-chart';
import {TimelineChart} from './timeline-chart';
import {WordcloudChart} from './wordcloud-chart';

@UntilDestroy()
@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsComponent implements AfterViewInit {
  Highcharts: typeof Highcharts = Highcharts;
  charts: AbstractChart[] = [
    new TimelineChart(),
    new ArtistScrobbleChart(),
    new ArtistTimelineChart(),
    new CumulativeArtistChart(),
    new WordcloudChart(),
    new PunchcardChart(),
    new ScrobblePerDayChart(),
    new RaceChart(),
    new ScrobbleMomentChart('Scrobbled hours', Array.from(Array(24).keys()).map(k => `${k}h`), s => Object.values(s.hours)),
    new ScrobbleMomentChart('Scrobbled days', Constants.DAYS, s => Object.values(s.days)),
    new ScrobbleMomentChart('Scrobbled months', Constants.MONTHS, s => Object.values(s.months)),
  ];

  constructor(private builder: StatsBuilderService) {
  }

  ngAfterViewInit(): void {
    this.builder.tempStats.pipe(
      untilDestroyed(this),
    ).subscribe(stats => this.updateStats(stats));
  }

  private updateStats(stats: TempStats): void {
    this.charts.forEach(c => c.update(stats));
  }
}
