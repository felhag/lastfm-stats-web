import {TempStats} from '../stats-builder.service';

export abstract class AbstractChart {
  abstract options: Highcharts.Options;
  updateFlag = false;
  chart?: Highcharts.Chart;

  abstract update(stats: TempStats): void;
}

