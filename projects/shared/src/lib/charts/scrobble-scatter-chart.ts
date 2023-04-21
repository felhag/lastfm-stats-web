import * as Highcharts from 'highcharts';
import boost from 'highcharts/modules/boost';
import { TempStats } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { SeriesScatterOptions } from 'highcharts';

boost(Highcharts);

export class ScrobbleScatterChart extends AbstractChart {
  nameMap = new Map<number, string>();

  constructor(translate: TranslatePipe) {
    super();

    this.options = {
      title: {text: 'All ' + translate.transform('translate.scrobbles')},
      chart: {
        type: 'scatter',
        zooming: { type: 'xy' },
        alignTicks: false
      },
      boost: {
        useGPUTranslations: true
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
          return `${this.series.options.custom!.component.nameMap.get(this.x)} ${new Date(this.x as number).toLocaleString()}`
        }
      },
      series: [{
        type: 'scatter',
        data: [],
        custom: {component: this}
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
      plotOptions: {
        scatter: {
          marker: {
            radius: .5
          }
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
        }, {
          condition: {
            minWidth: 1200
          },
          chartOptions: {
            plotOptions: {
              scatter: {
                marker: {
                  radius: 1
                }
              }
            }
          }
        }]
      }
    };
  }

  update(stats: TempStats): void {
    const keys = Array.from(this.nameMap.keys());
    keys.sort();
    let min = stats.first?.date.getTime()!;
    let max = keys.pop() || 0;
    let nameMapMin = keys.shift() || 0;
    Object.values(stats.seenTracks).forEach(track => track.scrobbles.filter(s => s > max || s < nameMapMin).forEach(s => {
      const date = new Date(s);
      const point = [s, date.getHours() * 60 + date.getMinutes()];
      if (this.chart) {
        this.chart!.series[0].addPoint(point, false);
      } else {
        (this.options.series![0] as SeriesScatterOptions).data!.push(point);
      }
      this.nameMap.set(s, track.name);
    }));

    max = Array.from(this.nameMap.keys()).pop()!;
    this.updateXAxis({min, max});
  }
}
