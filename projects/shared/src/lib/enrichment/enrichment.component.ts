import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, Signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import * as Highcharts from 'highcharts';
import 'highcharts/esm/modules/map';
import 'highcharts/esm/modules/full-screen';
import { HighchartsChartComponent } from 'highcharts-angular';
import { Constants, TempStats } from '../app/model';
import { EnrichmentService, EnrichmentProgress } from '../service/enrichment.service';
import { SettingsService } from '../service/settings.service';
import { StatsBuilderService } from '../service/stats-builder.service';
import { TranslatePipe } from '../service/translate.pipe';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

interface ArtistRow {
  artist: string;
  scrobbles: number;
}

@Component({
  selector: 'app-enrichment',
  templateUrl: './enrichment.component.html',
  styleUrls: ['./enrichment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    HighchartsChartComponent,
    MatButton,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatIcon,
    MatIconButton,
    MatProgressBar,
    MatTooltip,
  ],
  providers: [TranslatePipe],
})
export class EnrichmentComponent {
  private readonly stats = inject(StatsBuilderService);
  private readonly enrichment = inject(EnrichmentService);
  private readonly settings = inject(SettingsService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslatePipe);

  readonly mapChart = signal<Highcharts.Chart | undefined>(undefined);
  readonly genreChart = signal<Highcharts.Chart | undefined>(undefined);

  readonly progress = signal<EnrichmentProgress | undefined>(undefined);
  readonly running = signal(false);

  readonly eta = computed<string | undefined>(() => {
    const p = this.progress();
    const remaining = (p?.total || 0) - (p?.done || 0);
    if (!p || remaining <= 0) {
      return undefined;
    }
    const seconds = Math.ceil((Constants.MB_SPACING_MS * remaining) / 1000);
    if (seconds < 60) return `~ ${seconds} seconds`;
    return `~ ${Math.ceil(seconds / 60)} minutes`;
  });

  readonly mapWeightBy = signal<'scrobbles' | 'artists'>('scrobbles');
  readonly genreWeightBy = signal<'scrobbles' | 'artists'>('scrobbles');
  readonly worldTopo = toSignal(this.http.get('https://code.highcharts.com/mapdata/custom/world.topo.json'));

  private readonly tempStats: Signal<TempStats | undefined> = toSignal(this.stats.tempStats, {equal: () => false});
  private readonly minScrobbles = toSignal(this.settings.minScrobbles, {initialValue: 0});

  readonly artistRows = computed<ArtistRow[]>(() => {
    const stats = this.tempStats();
    if (!stats) return [];
    const min = this.minScrobbles();
    return Object.values(stats.seenArtists)
      .filter(a => a.scrobbles.length >= min)
      .map(a => ({artist: a.name, scrobbles: a.scrobbles.length}))
      .sort((a, b) => b.scrobbles - a.scrobbles);
  });

  readonly summary = computed(() => {
    const artists = this.artistRows().map(r => r.artist);
    const infos = this.enrichment.info();
    const loaded = artists.filter(artist => infos.has(artist)).length;
    return {
      artistsTotal: artists.length,
      loaded,
      loadedPercent: artists.length ? Math.round((loaded / artists.length) * 100) : 0,
      withMbid: artists.filter(artist => !!infos.get(artist)?.mbid).length,
      withRegion: artists.filter(artist => !!infos.get(artist)?.country).length,
      withTags: artists.filter(artist => !!infos.get(artist)?.tags?.length).length,
    }
  });

  readonly scrobblesLabel = this.translate.capFirst('translate.scrobbles');
  readonly mapWeightLabel = computed(() => this.mapWeightBy() === 'scrobbles' ? this.scrobblesLabel : 'Artists');
  readonly genreWeightLabel = computed(() => this.genreWeightBy() === 'scrobbles' ? this.scrobblesLabel : 'Artists');

  readonly genreData = computed<{categories: string[]; data: number[]}>(() => {
    const rows = this.artistRows();
    const infos = this.enrichment.info();
    const weight = this.genreWeightBy() === 'scrobbles' ? (row: ArtistRow) => row.scrobbles : () => 1;
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const tag of infos.get(row.artist)?.tags || []) {
        counts.set(tag, (counts.get(tag) ?? 0) + weight(row));
      }
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
    return {
      categories: sorted.map(([name]) => name),
      data: sorted.map(([, value]) => value),
    };
  });

  readonly genreOptions = computed<Highcharts.Options>(() => {
    const initial = untracked(() => this.genreData());
    const label = untracked(() => this.genreWeightLabel());
    return {
      chart: {type: 'bar', height: 400},
      title: {text: 'Tags'},
      legend: {enabled: false},
      xAxis: {categories: initial.categories, title: {text: ''}},
      yAxis: {title: {text: label}, allowDecimals: false},
      series: [{type: 'bar', name: label, data: initial.data}],
      tooltip: {pointFormat: '<b>{point.category}</b>: {point.y} {series.name}'},
    };
  });

  readonly mapReady = computed(() => !!this.worldTopo());

  readonly mapData = computed<{code: string; value: number; topArtists: ArtistRow[]}[]>(() => {
    const rows = this.artistRows();
    const infos = this.enrichment.info();
    const weight = this.mapWeightBy() === 'scrobbles' ? (row: ArtistRow) => row.scrobbles : () => 1;
    const counts = new Map<string, number>();
    const topArtists = new Map<string, ArtistRow[]>();
    for (const row of rows) {
      const info = infos.get(row.artist);
      if (!info?.country) continue;
      const code = info.country.toLowerCase();
      counts.set(code, (counts.get(code) ?? 0) + weight(row));
      const list = topArtists.get(code);
      if (!list) {
        topArtists.set(code, [row]);
      } else if (list.length < 3) {
        list.push(row);
      }
    }
    return Array.from(counts.entries()).map(([code, value]) => ({
      code,
      value,
      topArtists: topArtists.get(code) ?? [],
    }));
  });

  readonly mapOptions = computed<Highcharts.Options>(() => {
    const topo = this.worldTopo();
    if (!topo) return {title: {text: ''}};
    return {
      chart: {map: topo as any, height: 480},
      title: {text: 'Regions'},
      legend: {enabled: false},
      mapNavigation: {enabled: true},
      colorAxis: {min: 1, type: 'logarithmic', minColor: '#e6f4ff', maxColor: '#003366'},
      series: [{
        type: 'map',
        name: untracked(() => this.mapWeightLabel()),
        joinBy: ['hc-key', 'code'],
        data: untracked(() => this.mapData()),
        states: {hover: {color: '#f7a35c'}},
        dataLabels: {enabled: false},
      }],
      tooltip: {
        useHTML: true,
        headerFormat: '',
        pointFormatter: this.tooltipFormatter(),
      },
    };
  });

  constructor() {
    effect(() => {
      const data = this.mapData();
      const label = this.mapWeightLabel();
      this.mapChart()?.series[0]?.update({name: label, data} as any);
    });
    effect(() => {
      const {categories, data} = this.genreData();
      const label = this.genreWeightLabel();
      const chart = this.genreChart();
      if (chart) {
        chart.update({
          chart: { height: Math.max(320, categories.length * 22) },
          xAxis: { categories },
          yAxis: { title: { text: label } },
        }, false);
        chart.series[0].update({ name: label, data } as any, true);
      }
    });
  }

  private tooltipFormatter(): (this: Highcharts.Point) => string {
    const scrobblesLabel = this.scrobblesLabel.toLowerCase();
    return function(this: Highcharts.Point) {
      const point = this as Highcharts.Point & {value?: number; topArtists?: ArtistRow[]};
      const artists = point.topArtists ?? [];
      const list = artists.length
        ? '<ol style="margin: 4px 0 0; padding-left: 20px;">'
          + artists.map(a => `<li>${a.artist} (${a.scrobbles.toLocaleString()} ${scrobblesLabel})</li>`).join('')
          + '</ol>'
        : '';
      const bullet = `<span style="color:${point.color}">●</span> `;
      return `${bullet}<b>${point.name}</b>: ${(point.value ?? 0).toLocaleString()} ${point.series.name.toLowerCase()}${list}`;
    };
  }

  fetch(): void {
    const artists = this.artistRows().map(r => r.artist);
    this.running.set(true);
    this.progress.set({done: 0, total: artists.length});
    this.enrichment.enrich(artists)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => this.progress.set(p),
        error: () => this.running.set(false),
        complete: () => this.running.set(false),
      });
  }
}
