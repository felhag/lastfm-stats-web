import {Injectable} from '@angular/core';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {BehaviorSubject} from 'rxjs';

@UntilDestroy()
@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  autoUpdate: BehaviorSubject<boolean>;
  listSize: BehaviorSubject<number>;
  minScrobbles: BehaviorSubject<number>;
  dateRangeStart: BehaviorSubject<Date | null>;
  dateRangeEnd: BehaviorSubject<Date | null>;
  artistsInclude: BehaviorSubject<boolean>;
  artists: BehaviorSubject<string[]>;

  constructor() {
    this.autoUpdate = this.init('auto-update', true, v => v === 'true');
    this.listSize = this.init('list-size', 10, v => parseInt(v));
    this.minScrobbles = this.init('min-scrobbles', 0, v => parseInt(v));

    this.dateRangeStart = this.initDate('date-range-start');
    this.dateRangeEnd = this.initDate('date-range-end');

    this.artistsInclude = this.init('artists-include', true, v => v === 'true');
    this.artists = this.init('artists', [], v => JSON.parse(v), v => JSON.stringify(v));
  }

  private init(key: string, def: any, parse: (value: string) => any, toString: (value: any) => string | undefined = v => String(v)): BehaviorSubject<any> {
    const value = localStorage.getItem(key);
    const sub = new BehaviorSubject(value ? parse(value) : def);
    sub.pipe(untilDestroyed(this)).subscribe(v => {
      const parsed = toString(v);
      if (parsed === def) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, parsed!);
      }
    });
    return sub;
  }

  private initDate(key: string): BehaviorSubject<Date | null> {
    return this.init(key, undefined, v => new Date(parseInt(v)), d => d ? String(d.getTime()) : undefined);
  }
}
