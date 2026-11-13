import * as Highcharts from 'highcharts';
import 'highcharts/modules/data-sorting';
import { PointOptionsObject } from 'highcharts';
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
  currentOrder: string[] = [];
  stepTimeouts: number[] = [];
  rafCounters: number[] = [];
  rafArtists = new Set<string>(); // artists whose counts are animated via RAF
  currentStepDuration = 0;        // label position animation duration during step redraws
  timer?: number;
  toolbar?: HTMLElement;
  button?: HTMLElement;
  tooltip?: HTMLElement;
  input?: HTMLInputElement;
  speedText?: HTMLElement;
  speed = this.defaultSpeed;
  recorder?: MediaRecorder;
  windowMode: 'cumulative' | 'rolling' = 'cumulative';
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
              (this.toolbar.querySelector('.step-back') as HTMLButtonElement).onclick = () => this.tick(Math.max(0, this.current - 1));
              (this.toolbar.querySelector('.step-forward') as HTMLButtonElement).onclick = () => this.tick(this.current + 1);
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
      title: {text: 'Race chart'},
      subtitle: {
        text: '',
        floating: true,
        align: 'right',
        verticalAlign: 'bottom',
        style: {
          fontWeight: 'bold',
          fontSize: '50px',
        },
      },
      xAxis: {type: 'category'},
      yAxis: [{
        opposite: true,
        title: {
          text: undefined
        },
        tickAmount: 5,
        max: undefined,
      }],
      legend: {enabled: false},
      series: [{
        colorByPoint: true,
        dataSorting: {
          enabled: true,
          matchByName: false,
          sortKey: 'sortIndex'
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
            subtitle: {
              style: {
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
    this.updateAxisMax();
  }

  private updateAxisMax(): void {
    if (!this.months.length) return;
    // Use the final month to find the highest possible cumulative count
    const lastMonth = this.months[this.months.length - 1];
    const topCount = (this.getData(lastMonth)[0]?.y as number) || 0;
    const axisMax = this.xMax(topCount);
    if (this.chart) {
      this.chart.update({yAxis: [{max: axisMax}]}, false);
    } else {
      // Chart not rendered yet — patch the initial options
      (this.options.yAxis as any)[0].max = axisMax;
    }
  }

  private xMax(value: number): number {
    return Math.ceil(value / 1000) * 1000 || 1000;
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
    const startIdx = this.windowMode === 'cumulative' ? 0 : Math.max(0, currentIdx - this.windowSize + 1);
    return this.months.slice(startIdx, currentIdx + 1)
      .reduce((acc, cur) => acc + (this.mapper.monthItem(this.type, cur, item)?.count || 0), 0);
  }

  /**
   * Update the chart. This happens either on updating (moving) the range input,
   * or from a timer when the timeline is playing.
   */
  tick(target: number, force = false, instant = false): void {
    this.stepTimeouts.forEach(t => clearTimeout(t));
    this.stepTimeouts = [];
    this.rafCounters.forEach(id => cancelAnimationFrame(id));
    this.rafCounters = [];
    this.rafArtists.clear();
    this.currentStepDuration = 0;

    const maxIdx = this.months.length - 1;
    const next = Math.min(target, maxIdx);
    if (next === this.current && !force && !instant) {
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
    const newData = this.getData(month);
    this.chart?.setTitle(undefined, {text: month.alias}, false);

    const newOrder = newData.map(p => p.name as string);

    if (force || instant || !this.chart || this.currentOrder.length === 0) {
      (this.chart?.series[0] as any)?.update({
        type: 'bar',
        name: month.alias,
        data: this.withSortIndices(newData, newOrder)
      }, true, false);
      this.currentOrder = newOrder;
      return;
    }

    // Read the current counts from the series so every artist animates from
    // its previous displayed value (new artists start from 0)
    const oldCounts = new Map<string, number>();
    for (const p of (this.chart.series[0] as any).points || []) {
      oldCounts.set(p.name as string, (p.y as number) || 0);
    }

    // Start RAF counters for ALL artists so labels count up continuously
    newData.forEach(p => {
      const oldCount = oldCounts.get(p.name as string) || 0;
      this.startRafCounter(p.name as string, p.y as number, oldCount);
    });

    this.playSwapAnimation(month.alias, newData, newOrder, oldCounts);
  }

  private withSortIndices(data: PointOptionsObject[], order: string[]): PointOptionsObject[] {
    const n = order.length;
    const indexMap = new Map(order.map((name, i) => [name, n - i]));
    return data.map(p => ({...p, sortIndex: indexMap.get(p.name as string) ?? 0}));
  }

  /**
   * Animate a month transition using count-based keyframes. A bar swaps rank
   * when its interpolated count overtakes a neighbour (the natural race-chart
   * effect) and, crucially, each keyframe also carries an interpolated `y` so
   * the bar *length* grows continuously across the whole transition instead of
   * snapping to its final value up front.
   */
  private playSwapAnimation(
    monthAlias: string,
    newData: PointOptionsObject[],
    newOrder: string[],
    oldCounts: Map<string, number>,
  ): void {
    this.currentOrder = newOrder;
    if (!this.chart) return;
    const easeInOutSine = (p: number) => 0.5 - Math.cos(p * Math.PI) / 2;
    const dataMap = new Map(newData.map(p => [p.name as string, p]));
    const n = newOrder.length;

    const valueAt = (name: string, eased: number): number => {
      const from = oldCounts.get(name) || 0;
      const to = (dataMap.get(name)?.y as number) || 0;
      return from + (to - from) * eased;
    };
    const orderAt = (eased: number): string[] =>
      newOrder.slice().sort((a, b) => valueAt(b, eased) - valueAt(a, eased));

    // Build keyframes at evenly-spaced time slices. The first keyframe is the
    // OLD order; a new keyframe is recorded whenever the order changes, and the
    // final slice (eased === 1, the real new order/counts) is always included.
    const SLICES = 10;
    const keyframes: { time: number; order: string[]; eased: number }[] = [];
    const oldOrder = orderAt(0);
    keyframes.push({ time: 0, order: oldOrder, eased: 0 });

    let prevOrder = oldOrder;
    for (let slice = 1; slice <= SLICES; slice++) {
      const eased = easeInOutSine(slice / SLICES);
      const order = orderAt(eased);
      if (slice === SLICES || JSON.stringify(order) !== JSON.stringify(prevOrder)) {
        keyframes.push({ time: Math.floor(this.speed * slice / SLICES), order, eased });
        prevOrder = order;
      }
    }

    // Establish the new point set at their OLD lengths/positions (new artists
    // enter at 0), so growth starts from where last month ended.
    const baseData = oldOrder
      .filter(name => dataMap.has(name))
      .map((name, i) => ({...dataMap.get(name)!, y: oldCounts.get(name) || 0, sortIndex: n - i}));
    (this.chart.series[0] as any).setData(baseData, true, {duration: 200});

    // Each timeout fires at the START of a segment and animates toward the next
    // keyframe over exactly the segment's wall-clock duration, so motion is
    // continuous and the bars reach full length precisely at month-end.
    for (let j = 1; j < keyframes.length; j++) {
      const fromTime = keyframes[j - 1].time;
      const kf = keyframes[j];
      const duration = Math.max(kf.time - fromTime, 1);
      const t = window.setTimeout(() => {
        if (!this.chart) return;
        const series = this.chart.series[0] as any;
        const byName = new Map<string, any>(series.points.map((p: any) => [p.name, p]));
        kf.order.forEach((name, i) => {
          byName.get(name)?.update({y: valueAt(name, kf.eased), sortIndex: n - i, x: i}, false, false);
        });
        this.currentStepDuration = duration;
        this.chart.redraw({duration} as any);
        this.currentStepDuration = 0;
      }, fromTime);
      this.stepTimeouts.push(t);
    }
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
    this.currentOrder = [];
    this.update(this.stats!);
    this.tick(this.current, true);
  }

  changeWindowMode(mode: 'cumulative' | 'rolling'): void {
    this.windowMode = mode;
    this.updateTitle();
    this.updateAxisMax();
    this.tick(this.current, true);
  }

  changeWindowSize(size: number): void {
    this.windowSize = Math.max(1, Math.min(size, 120));
    this.updateTitle();
    if (this.windowMode === 'rolling') {
      this.updateAxisMax();
      this.tick(this.current, true);
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
    this.tick(value, false, true);
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

  private startRafCounter(name: string, target: number, from = 0): void {
    this.rafArtists.add(name);
    const start = performance.now();
    const duration = this.speed;
    const easeInOutSine = (p: number) => 0.5 - Math.cos(p * Math.PI) / 2;

    const frame = (now: number) => {
      const elapsed = now - start;
      const pos = Math.min(1, elapsed / duration);
      const current = Math.round(from + (target - from) * easeInOutSine(pos));
      const text = Highcharts.numberFormat(current, 0);

      // Re-query the point each frame — safe even if element is recreated
      if (this.chart?.series[0]) {
        for (const p of (this.chart.series[0] as any).points || []) {
          if (p.name === name && p.dataLabels?.[0]?.text?.element) {
            p.dataLabels[0].text.element.textContent = text;
            break;
          }
        }
      }

      if (elapsed < duration && this.chart) {
        this.rafCounters.push(requestAnimationFrame(frame));
      } else {
        this.rafArtists.delete(name);
      }
    };
    this.rafCounters.push(requestAnimationFrame(frame));
  }

  private animateDataLabels() {
    const outer = this;

    // Prevent Highcharts from overwriting text that the RAF counters are animating.
    // All artists are in rafArtists during a tick transition, so label text is
    // exclusively managed by the RAF; Highcharts only updates position/style.
    (Highcharts as any).wrap(Highcharts.Series.prototype, 'drawDataLabels', function (this: any, proceed: Highcharts.WrapProceedFunction) {
      const attr = Highcharts.SVGElement.prototype.attr;

      if (this.chart === outer.chart) {
        this.points.forEach((point: any) => {
          const pointName = point.name as string;
          (point.dataLabels || []).forEach((label: any) => {
            label.attr = function (hash: any) {
              if (hash && typeof hash === 'object') {
                // RAF owns text — clear it so Highcharts doesn't override
                if (hash.text !== undefined && outer.rafArtists.has(pointName)) {
                  hash.text = undefined;
                }
                // Animate label position in sync with the bar during step redraws
                if (outer.currentStepDuration > 0 && !('text' in hash)) {
                  return this.animate(hash, {duration: outer.currentStepDuration});
                }
              }
              return attr.apply(this, [hash]);
            };
          });
        });
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
