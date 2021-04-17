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
  dateRangeStart: BehaviorSubject<Date>;
  dateRangeEnd: BehaviorSubject<Date>;

  constructor() {
    this.autoUpdate = this.init('auto-update', true, v => v === 'true');
    this.listSize = this.init('list-size', 10, v => parseInt(v));

    this.dateRangeStart = this.init('date-range-start', undefined, v => new Date(parseInt(v)), d => String(d.getTime()));
    this.dateRangeEnd = this.init('date-range-end', undefined, v => new Date(parseInt(v)), d => String(d.getTime()));
  }

  private init<T>(key: string, def: any, parse: (value: string) => any, toString: (value: any) => string = v => String(v)): BehaviorSubject<any> {
    const value = localStorage.getItem(key);
    const sub = new BehaviorSubject(value ? parse(value) : def);
    sub.pipe(untilDestroyed(this))
      .subscribe(v => v === def ? localStorage.removeItem(key) : localStorage.setItem(key, toString(v)));
    return sub;
  }
}
