import {Component, AfterViewInit} from '@angular/core';
import * as Highcharts from 'highcharts';
import {filter, startWith} from 'rxjs/operators';
import {TempStats} from '../model';
import {StatsBuilderService} from '../stats-builder.service';
import {AbstractChart} from './abstract-chart';
import {ArtistScrobbleChart} from './artist-scrobble-chart';
import {ArtistTimelineChart} from './artist-timeline-chart';
import {TimelineChart} from './timeline-chart';

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss']
})
export class ChartsComponent implements AfterViewInit {
  Highcharts: typeof Highcharts = Highcharts;
  charts: AbstractChart[] = [new TimelineChart(), new ArtistScrobbleChart(), new ArtistTimelineChart()];

  constructor(private builder: StatsBuilderService) {
  }

  ngAfterViewInit(): void {
    this.builder.tempStats.pipe(
      startWith(this.builder.tempStats.value),
      filter(s => !!s.last),
    ).subscribe(stats => this.updateStats(stats));
  }

  private updateStats(stats: TempStats): void {
    this.charts.forEach(c => c.update(stats));
  }
}
