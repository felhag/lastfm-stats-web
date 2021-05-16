import {Component, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {TempStats, MonthTrack} from '../model';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';
import {AbstractListsComponent, Top10Item} from './abstract-lists.component';

export interface TrackStats {
  unique: Top10Item[];
}

@Component({
  selector: 'app-track-lists',
  templateUrl: './track-lists.component.html',
  styleUrls: ['./lists.component.scss']
})
export class TrackListsComponent extends AbstractListsComponent<TrackStats> implements OnInit {
  constructor(builder: StatsBuilderService, settings: SettingsService, route: ActivatedRoute, snackbar: MatSnackBar) {
    super(builder, settings, route, snackbar);
  }

  protected doUpdate(stats: TempStats, next: TrackStats): void {
    const monthsValues = Object.values(stats.monthList);
    const tracks: { [month: string]: { [track: string]: MonthTrack } } = {};
    monthsValues.forEach(m => {
      const curr: { [track: string]: MonthTrack } = {};
      tracks[m.alias] = curr;
      Object.values(m.artists).forEach(a => Object.values(a.tracks).forEach(t => curr[t.name] = t));
    });

    next.unique = this.getTop10<string>(tracks, m => Object.keys(tracks[m]).length, k => k, (m, k) => `${m} (${k} unique tracks)`, (m, k) => this.including(tracks[m]), m => this.monthUrl(m));
  }

  private including(tracks: { [p: string]: MonthTrack }): string {
    const keys = Object.keys(tracks);
    keys.sort((a, b) => tracks[b].count - tracks[a].count);
    return 'Including ' + keys.splice(0, 3).join(', ');
  }

  protected emptyStats(): TrackStats {
    return {
      unique: [],
    };
  }
}
