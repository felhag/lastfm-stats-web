import {Component, OnInit} from '@angular/core';
import * as Highcharts from 'highcharts';
import {filter} from 'rxjs/operators';
import {ScrobbleRetrieverService} from '../scrobble-retriever.service';
import {StatsBuilderService, TempStats} from '../stats-builder.service';

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss']
})
export class ChartsComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {
    title: {text: 'Artists and scrobbles over time'},
    xAxis: {
      type: 'datetime'
    },
    tooltip: {
      formatter(): string {
        return new Date(this.x).toLocaleString() + '<br><b>' + this.key + '</b><br><span style="color:' + this.point.color + '">\u25CF</span>' + Highcharts.numberFormat(this.y, 0, '', '.');
      }
    },
    yAxis: [{
      title: {
        text: 'Scrobbles',
        style: {
          color: Highcharts.getOptions().colors![2]
        }
      }
    }, {
      gridLineWidth: 0,
      opposite: true,
      title: {
        text: 'Artists',
        style: {
          color: Highcharts.getOptions().colors![0]
        }
      }
    }],
    series: [{
      name: 'Artists',
      data: [],
      type: 'line',
    }, {
      name: 'Scrobbles',
      data: [],
      type: 'line',
    }]
  };
  updateFlag = false;

  constructor(private builder: StatsBuilderService) {
  }

  ngOnInit(): void {
    this.builder.tempStats.pipe(filter(s => !!s.last)).subscribe(stats => this.updateStats(stats));
  }

  private updateStats(stats: TempStats): void {
    let i = 0;
    const uniqueArtists: Highcharts.PointOptionsObject[] = [];
    for (const month of Object.values(stats.monthList)) {
      for (const scrobble of month.newArtists) {
        i++;
        if (i % 100 === 0) {
          uniqueArtists.push({
            x: scrobble.date.getTime(),
            y: i,
            name: scrobble.artist
          });
        }
      }
    }

    const scrobbles = stats.scrobbleMilestones.map((scrobble, idx) => ({
      x: scrobble.date.getTime(),
      y: idx * 1000,
      name: scrobble.artist + ' - ' + scrobble.track
    }));

    this.chartOptions.series![0] = {
      name: 'Unique Artists',
      type: 'line',
      yAxis: 1,
      data: uniqueArtists
    };

    this.chartOptions.series![1] = {
      name: 'Scrobbles',
      type: 'line',
      data: scrobbles
    };

    this.updateFlag = true;
  }
}
