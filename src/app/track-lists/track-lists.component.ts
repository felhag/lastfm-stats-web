import {Component, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {AbstractListsComponent} from '../abstract-lists.component';
import {Top10Item} from '../lists/lists.component';
import {TempStats} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';

export interface TrackStats {
  unique: Top10Item[];
}

@Component({
  selector: 'app-track-lists',
  templateUrl: './track-lists.component.html',
  styleUrls: ['./track-lists.component.scss']
})
export class TrackListsComponent extends AbstractListsComponent<TrackStats> implements OnInit {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute, snackbar: MatSnackBar) {
    super(builder, settings, route, snackbar);
  }

  protected updateStats(stats: TempStats): void {
    const next = this.emptyStats();
    const monthsValues = Object.values(stats.monthList);
    const tracks: { [month: string]: { [track: string]: number } } = {};
    monthsValues.forEach(m => {
      const curr: { [track: string]: number } = {};
      tracks[m.alias] = curr;
      Object.entries(m.artists).forEach(a => Object.entries(a[1].tracks).forEach(t => curr[a[0] + ' - ' + t[0]] = t[1]));
    });

    next.unique = this.getTop10<string>(tracks, m => Object.keys(tracks[m]).length, k => k, (m, k) => `${m} (${k} unique tracks)`, (m, k) => this.including(tracks[m]), m => this.monthUrl(m));

    this.stats.next(next);
  }

  getTop10<T>(countMap: { [key: string]: any },
              getValue: (k: T) => number,
              getItem: (k: string) => T,
              buildName: (item: T, value: number) => string,
              buildDescription: (item: T, value: number) => string,
              buildUrl?: (item: any) => string
  ): Top10Item[] {
    const keys = Object.keys(countMap);
    keys.sort((a, b) => getValue(getItem(b)) - getValue(getItem(a)));
    return keys.splice(0, this.listSize).map(k => {
      const item = getItem(k);
      const val = getValue(item);
      return {
        amount: val,
        name: buildName(item, val),
        description: buildDescription(item, val),
        url: buildUrl ? buildUrl(item) : undefined
      };
    });
  }

  private including(tracks: { [p: string]: number }): string {
    const keys = Object.keys(tracks);
    keys.sort((a, b) => tracks[b] - tracks[a]);
    return 'Including ' + keys.splice(0, 3).join(', ');
  }

  protected emptyStats(): TrackStats {
    return {
      unique: [],
    };
  }
}
