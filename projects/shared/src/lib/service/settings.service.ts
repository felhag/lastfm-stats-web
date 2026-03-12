import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';

type Setting = keyof Settings;
type SettingParser = {key: string, default: any, parse: (value: string) => any, stringify?: (value: any) => string | undefined};
export interface Settings {
  autoUpdate: boolean;
  listSize: number;
  minScrobbles: number;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  artistsInclude: boolean;
  artists: string[];
  filterRemasters: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService extends ComponentStore<Settings> {
  private static readonly parsers: { [key in Setting]: SettingParser } = {
    autoUpdate: {key: 'auto-update', default: true, parse: v => v === 'true'},
    listSize: {key: 'list-size', default: 10, parse: v => parseInt(v)},
    minScrobbles: {key: 'min-scrobbles', default: 0, parse: v => parseInt(v)},
    dateRangeStart: SettingsService.initDate('date-range-start'),
    dateRangeEnd: SettingsService.initDate('date-range-end'),
    artistsInclude: {key: 'artists-include', default: true, parse: v => v === 'true'},
    artists: {key: 'artists', default: [], parse: v => JSON.parse(v), stringify: v => JSON.stringify(v)},
    filterRemasters: {key: 'filter-remasters', default: false, parse: v => v === 'true'}
  };

  constructor() {
    super(SettingsService.create());
  }

  private static create(): Settings {
    return Object.fromEntries(Object.entries(this.parsers).map(([key, parser]) => {
      const value = localStorage.getItem(parser.key);
      return [key, value ? parser.parse(value) : parser.default];
    }) as any[][]);
  }

  private static initDate(key: string): SettingParser {
    return {key, default: null, parse: v => new Date(parseInt(v)), stringify: d => d ? String(d.getTime()) : undefined};
  }

  readonly autoUpdate = this.select(s => s.autoUpdate);
  readonly listSize = this.select(s => s.listSize);
  readonly minScrobbles = this.select(s => s.minScrobbles);
  readonly dateRangeStart = this.select(s => s.dateRangeStart);
  readonly dateRangeEnd = this.select(s => s.dateRangeEnd);
  readonly artistsInclude = this.select(s => s.artistsInclude);
  readonly artists = this.select(s => s.artists);
  readonly filterRemasters = this.select(s => s.filterRemasters);
  readonly count = this.select(
    this.dateRangeStart,
    this.dateRangeEnd,
    this.artists,
    this.minScrobbles,
    this.filterRemasters,
    (start, end, artists, min, filterRemasters) => (start || end ? 1 : 0) + (artists.length ? 1 : 0) + (min ? 1 : 0) + (filterRemasters ? 1 : 0)
  );

  readonly update = this.updater((settings: Settings, newSettings: Partial<Settings>) => {
    Object.entries(newSettings).forEach(([key, value]) => this.updateLocalStorage(SettingsService.parsers[key as Setting], value));
    return {
      ...settings,
      ...newSettings
    }
  });

  private updateLocalStorage(parser: SettingParser, value: any) {
    const parsed = parser.stringify ? parser.stringify(value) : String(value);
    if (value === parser.default) {
      localStorage.removeItem(parser.key);
    } else {
      localStorage.setItem(parser.key, parsed!);
    }
  }
}
