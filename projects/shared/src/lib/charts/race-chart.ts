import * as Highcharts from 'highcharts';
import { PointOptionsObject, SeriesOptionsType } from 'highcharts';
import { TempStats, Month, ItemType, StreakItem } from 'projects/shared/src/lib/app/model';
import { AbstractChart } from 'projects/shared/src/lib/charts/abstract-chart';
import { AbstractUrlService } from '../service/abstract-url.service';
import { MapperService } from '../service/mapper.service';
import { ExportService } from "../service/export-service";

export class RaceChart extends AbstractChart {
  private readonly defaultSpeed = 2000;

  protected type: ItemType = 'artist';
  protected stats?: TempStats;

  colors: {[key: string]: string} = {};
  months: Month[] = [];
  items: { [p: string]: StreakItem } = {};
  current = -1;
  timer?: number;
  toolbar?: HTMLElement;
  button?: HTMLElement;
  tooltip?: HTMLElement;
  input?: HTMLInputElement;
  speedText?: HTMLElement;
  speed = this.defaultSpeed;
  recorder?: MediaRecorder;
  windowMode: 'cumulative' | 'rolling' = 'rolling';
  windowSize = 12;

  constructor(url: AbstractUrlService, private mapper: MapperService, private exportService: ExportService) {
    super();
    this.options = {
      chart: {
        animation: {
          duration: this.speed
        },
        spacingTop: 24,
        height: 800,
        events: {
          render: event => {
            if (!this.toolbar) {
              this.toolbar = document.getElementById('race-chart-toolbar')!;
              this.speedText = this.toolbar.querySelector('.current') as HTMLElement;
              this.button = this.toolbar.querySelector('.play mat-icon') as HTMLElement;
              this.tooltip = this.toolbar.querySelector('.tooltip') as HTMLElement;
              this.input = this.toolbar.querySelector('input') as HTMLInputElement;
              this.input.onchange = (ev: any) => this.changeRange(parseInt(ev.target.value));
              this.input.oninput = (ev: any) => this.showTooltip(parseInt(ev.target.value));

              const menu = (this.toolbar!.querySelector('.toolbar-menu') as HTMLButtonElement);
              (this.toolbar.querySelector('.play') as HTMLButtonElement).onclick = () => this.toggle();
              (this.toolbar.querySelector('.rewind') as HTMLButtonElement).onclick = () => this.changeSpeed(() => this.speed * 2);
              (this.toolbar.querySelector('.forward') as HTMLButtonElement).onclick = () => this.changeSpeed(() => this.speed / 2);
              (this.toolbar.querySelector('.open') as HTMLButtonElement).onclick = () => menu.classList.toggle('open');

              const toggleToolbar = document.getElementById('toggleable-scrobbles-toolbar')!.cloneNode(true) as HTMLElement;
              const toggles = toggleToolbar.querySelectorAll('.toggle') as NodeListOf<HTMLButtonElement>;
              const toggleTypes: ItemType[] = ['artist', 'album', 'track']
              toggles.forEach((button, idx) => button.onclick = () => {
                toggles?.forEach(t => t.classList.remove('mat-primary'));
                button.classList.add('mat-primary');
                this.changeType(toggleTypes[idx]);
              });
              toggleToolbar.classList.remove('toolbar');
              menu.appendChild(toggleToolbar);

              // Window mode controls
              const modeCumulativeBtn = menu.querySelector('.mode-cumulative') as HTMLButtonElement;
              const modeRollingBtn = menu.querySelector('.mode-rolling') as HTMLButtonElement;
              const windowConfigDiv = menu.querySelector('.window-config') as HTMLElement;
              const windowSizeSpan = menu.querySelector('.window-size-value') as HTMLElement;

              modeCumulativeBtn.onclick = () => {
                modeCumulativeBtn.classList.add('mat-primary');
                modeRollingBtn.classList.remove('mat-primary');
                windowConfigDiv.style.display = 'none';
                this.changeWindowMode('cumulative');
              };

              modeRollingBtn.onclick = () => {
                modeRollingBtn.classList.add('mat-primary');
                modeCumulativeBtn.classList.remove('mat-primary');
                windowConfigDiv.style.display = 'block';
                this.changeWindowMode('rolling');
              };

              (menu.querySelector('.window-decrease') as HTMLButtonElement).onclick = () => {
                this.changeWindowSize(this.windowSize - 1);
                windowSizeSpan.innerText = String(this.windowSize);
              };

              (menu.querySelector('.window-increase') as HTMLButtonElement).onclick = () => {
                this.changeWindowSize(this.windowSize + 1);
                windowSizeSpan.innerText = String(this.windowSize);
              };

              const chart = event.target as any as Highcharts.Chart;
              chart.container.parentNode!.appendChild(this.toolbar);
            }
            this.updateSlider();
          }
        }
      },
      plotOptions: {
        series: {
          animation: false,
          groupPadding: 0,
          pointPadding: 0.1,
          borderWidth: 0
        } as any
      },
      title: {text: 'Race chart (12 months)'},
      xAxis: {type: 'category'},
      yAxis: [{
        opposite: true,
        title: {
          text: undefined
        },
        tickAmount: 5
      }],
      legend: {
        floating: true,
        align: 'right',
        verticalAlign: 'bottom',
        itemStyle: {
          fontWeight: 'bold',
          fontSize: '50px',
        },
        symbolHeight: 0.001,
        symbolWidth: 0.001,
        symbolRadius: 0.001,
      },
      series: [{
        colorByPoint: true,
        dataSorting: {
          enabled: true,
          matchByName: true
        },
        type: 'bar',
        dataLabels: [{
          enabled: true,
          style: {
            color: this.textColor,
            textOutline: 0
          } as any
        }],
        name: '',
        data: [],
        events: {
          click: event => this.openUrl(url.artist(event.point.name))
        }
      }],
      responsive: {
        rules: [{
          condition: {
            maxWidth: 768
          },
          chartOptions: {
            legend: {
              itemStyle: {
                fontSize: '24px',
              }
            }
          }
        }]
      }
    };

    this.animateDataLabels();
  }

  update(stats: TempStats): void {
    this.stats = stats;
    this.months = Object.values(this.stats!.monthList);
    this.items = this.mapper.seen(this.type, this.stats!);
    this.updateSlider();
  }

  private updateSlider(): void {
    if (this.input) {
      this.input.setAttribute('max', String(this.months.length - 1));
    }
  }

  private getData(month: Month): PointOptionsObject[] {
    return Object.values(this.items)
      .map(a => ({name: a.name, count: this.getCountForItem(month, a)}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25)
      .map(a => ({
        y: a.count,
        name: a.name,
        color: this.getColor(a.name)
      }));
  }

  private getColor(name: string): string {
    if (this.colors[name]) {
      return this.colors[name];
    }
    const colors = this.getColors();
    const color = colors[Object.keys(this.colors).length % colors.length];
    this.colors[name] = color;
    return color;
  }

  private getCountForItem(currentMonth: Month, item: StreakItem): number {
    const currentIdx = this.months.indexOf(currentMonth);

    if (this.windowMode === 'cumulative') {
      return this.months.slice(0, currentIdx + 1)
        .reduce((acc, cur) => acc + (this.mapper.monthItem(this.type, cur, item)?.count || 0), 0);
    } else {
      const startIdx = Math.max(0, currentIdx - this.windowSize + 1);
      return this.months.slice(startIdx, currentIdx + 1)
        .reduce((acc, cur) => acc + (this.mapper.monthItem(this.type, cur, item)?.count || 0), 0);
    }
  }

  /**
   * Update the chart. This happens either on updating (moving) the range input,
   * or from a timer when the timeline is playing.
   */
  tick(target: number): void {
    const maxIdx = this.months.length - 1;
    const next = Math.min(target, maxIdx);
    if (next === this.current) {
      return;
    }
    this.current = next;
    if (this.input) {
      this.input.value = String(this.current);
    }

    if (this.current >= maxIdx) { // Auto-pause
      this.pause();
      this.recorder?.stop();
    }

    const month = this.months[this.current];
    const data = this.getData(month);
    const serieData: SeriesOptionsType = {
      type: 'bar',
      name: month.alias,
      data
    };
    this.chart?.series[0].update(serieData);
  }

  toggle(): void {
    if (this.timer) {
      this.pause();
    } else {
      this.play();
    }
  }

  changeSpeed(modify: () => number): void {
    this.speed = Math.min(8000, Math.max(500, modify()));
    this.chart?.update({chart: {animation: {duration: this.speed}}});
    this.speedText!.innerText = String(Math.round(this.defaultSpeed / this.speed * 100) / 100);
    if (this.timer) {
      this.pause();
      this.play();
    }
  }

  changeType(type: ItemType): void {
    this.type = type;
    this.update(this.stats!);
  }

  changeWindowMode(mode: 'cumulative' | 'rolling'): void {
    this.windowMode = mode;
    this.updateTitle();
    this.tick(this.current);
  }

  changeWindowSize(size: number): void {
    this.windowSize = Math.max(1, Math.min(size, 120));
    this.updateTitle();
    if (this.windowMode === 'rolling') {
      this.tick(this.current);
    }
  }

  private updateTitle(): void {
    const titleText = this.windowMode === 'cumulative'
      ? 'Race chart'
      : `Race chart (${this.windowSize} month${this.windowSize > 1 ? 's' : ''})`;
    this.chart?.setTitle({text: titleText});
  }

  changeRange(value: number): void {
    this.tooltip!.style.display = 'none';
    this.tick(value);
  }

  showTooltip(value: number): void {
    const next = Math.min(value, this.months.length - 1);
    this.tooltip!.style.display = 'inline';
    this.tooltip!.innerText = this.months[next].alias;
  }

  protected load(container: HTMLElement): void {
    super.load(container);
    this.tick(0);
  }

  private play(): void {
    this.button!.innerHTML = 'pause';
    this.timer = window.setInterval(() => this.tick(this.current + 1), this.speed);
    this.tick(this.current + 1);
  }

  /**
   * Pause the timeline, either when the range is ended, or when clicking the pause button.
   * Pausing stops the timer and resets the button to play mode.
   */
  private pause(): void {
    this.button!.innerHTML = 'play_arrow';
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private animateDataLabels() {
    const FLOAT = /^-?\d+\.?\d*$/;
    const outer = this;

    // Add animated textSetter, just like fill/strokeSetters
    (Highcharts as any).Fx.prototype.textSetter = function () {
      let startValue = this.start.replace(/ /g, ''),
          endValue = this.end.replace(/ /g, ''),
          currentValue = this.end.replace(/ /g, '');

      if ((startValue || '').match(FLOAT)) {
        startValue = parseInt(startValue, 10);
        endValue = parseInt(endValue, 10);

        // No support for float
        currentValue = Highcharts.numberFormat(
            Math.round(startValue + (endValue - startValue) * this.pos),
            0
        );
      }

      this.elem.endText = this.end;
      this.elem.attr(this.prop, currentValue, null, true);
    };

    // Add textGetter, not supported at all at this moment:
    (Highcharts as any).SVGElement.prototype.textGetter = function () {
      const ct = this.text.element.textContent || '';
      return this.endText ? this.endText : ct.substring(0, ct.length / 2);
    };

    // Temporary change label.attr() with label.animate():
    // In core it's simple change attr(...) => animate(...) for text prop
    (Highcharts as any).wrap(Highcharts.Series.prototype, 'drawDataLabels', function (this: any, proceed: Highcharts.WrapProceedFunction) {
      const attr = Highcharts.SVGElement.prototype.attr;

      if (this.chart === outer.chart) {
        this.points.forEach((point: any) =>
            (point.dataLabels || []).forEach(
                (label: any) =>
                    (label.attr = function (hash: any) {
                      if (hash && hash.text !== undefined && (outer.chart as any).isResizing === 0) {
                        const text = hash.text;
                        hash.text = undefined;
                        return this.attr(hash).animate({text});
                      }
                      return attr.apply(this, [hash]);
                    })
            )
        );
      }

      const ret = proceed.apply(this, []);
      this.points.forEach((p: any) => (p.dataLabels || []).forEach((d: any) => (d.attr = attr)));
      return ret;
    });
  }

  async print(): Promise<void> {
    if (!navigator.mediaDevices.getDisplayMedia){
      super.print();
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
      mediaSource: "screen",
      selfBrowserSurface: "include",
      preferCurrentTab: true
    } as any);

    const track = stream.getVideoTracks()[0];
    track.onended = () => this.recorder!.stop();

    this.recorder = new MediaRecorder(stream, {});

    const chunks: BlobPart[] = [];
    this.recorder.ondataavailable = (event: BlobEvent) =>{
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    this.recorder.onstop = () => {
      const blob = new Blob(chunks, { type: (chunks[0] as any).type });
      this.exportService.downloadFile(blob, 'lastfmstats-race-chart')

      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      this.recorder = undefined;
    };

    this.fullscreen();
    if (!this.timer) {
      this.play();
    }
    this.recorder.start();
  }
}
