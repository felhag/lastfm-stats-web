import { TempStats } from '../model';
import { AbstractChart } from './abstract-chart';
import * as Highcharts from 'highcharts';
import boost from 'highcharts/modules/boost';
boost(Highcharts);

export class ScrobbleScatterChart extends AbstractChart {
  nameMap = new Map<number, string>();
  options: Highcharts.Options = {
    title: {text: 'All scrobbles'},
    chart: {
      type: 'scatter',
      zoomType: 'xy',
      alignTicks: false
    },
    boost: {
      useGPUTranslations: true,
      usePreallocated: true
    },
    xAxis: {
      type: 'datetime',
      gridLineWidth: 1
    },
    yAxis: {
      min: 0,
      max: 23 * 60,
      reversed: true,
      startOnTick: false,
      endOnTick: false,
      title: {text: null},
      labels: {
        formatter(): string {
          return Math.floor(this.value as number / 60).toString().padStart(2, '0') + ':00';
        }
      }
    },
    legend: {enabled: false},
    tooltip: {
      followPointer: false,
      formatter(): string {
        return `${this.series.options.custom!.component.nameMap.get(this.x)} ${new Date(this.x).toLocaleString()}`
      }
    },
    series: [{
      type: 'scatter',
      data: [],
      custom: {component: this},
      marker: {
        radius: 0.5
      }
    }],
    exporting: {
      sourceHeight: 1024,
      sourceWidth: 8096,
      chartOptions: {
        title: {text: ''},
        series: [{
          type: 'scatter',
          marker: {
            radius: 1
          }
        }]
      }
    },
    responsive: {
      rules: [{
        condition: {
          maxWidth: 768
        },
        chartOptions: {
          yAxis: {title: {text: ''}}
        }
      }]
    }
  };

  update(stats: TempStats): void {
    if (!this.chart) {
      return;
    }

    let min = stats.first?.date.getTime()!;
    let max = Array.from(this.nameMap.keys()).pop() || 0;
    Object.values(stats.seenTracks).forEach(track => track.scrobbles.filter(s => s > max).forEach(s => {
      const date = new Date(s);
      this.chart!.series[0].addPoint([s, date.getHours() * 60 + date.getMinutes()], false);
      this.nameMap.set(s, track.name);
    }));

    max = Array.from(this.nameMap.keys()).pop()!;
    this.chart.update({xAxis: {min, max}}, true);
  }
}
