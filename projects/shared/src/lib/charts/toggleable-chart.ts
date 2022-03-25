import { PlotOptions } from 'highcharts';
import * as Highcharts from 'highcharts';
import { ItemType, TempStats } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';

export abstract class ToggleableChart extends AbstractChart {
  protected type: ItemType = 'artist';
  protected stats?: TempStats;
  toolbar?: HTMLElement;
  toggles?: NodeListOf<HTMLButtonElement>;

  update(stats: TempStats) {
    this.stats = stats;
  }

  changeType(type: ItemType): void {
    this.type = type;
    this.update(this.stats!);
  }

  get plotOptions(): PlotOptions {
    return {bar: {custom: {component: this}}};
  }

  get events(): Highcharts.ChartEventsOptions {
    return {
      render(): void {
        const chart = this;
        const custom = chart.options.plotOptions!.bar!.custom!;
        const component = custom.component as ToggleableChart;
        if (!component.toolbar) {
          component.toolbar = document.getElementById('cumulative-scrobbles-toolbar')!.cloneNode(true) as HTMLElement;
          component.toggles = component.toolbar.querySelectorAll('.toggle') as NodeListOf<HTMLButtonElement>;

          const toggleTypes: ItemType[] = ['artist', 'album', 'track']
          component.toggles.forEach((button, idx) => button.onclick = () => {
            component.toggles?.forEach(t => t.classList.remove('mat-primary'));
            button.classList.add('mat-primary');
            component.changeType(toggleTypes[idx])
          });
          chart.container.parentNode!.appendChild(component.toolbar);
        }
      }
    };
  }
}
