import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { combineLatest, Observable } from 'rxjs';
import { map, filter, finalize } from 'rxjs/operators';
import { ConfComponent } from '../conf/conf.component';
import { Progress } from '../model';
import { ScrobbleRetrieverService, State } from '../service/scrobble-retriever.service';
import { SettingsService } from '../service/settings.service';
import { StatsBuilderService } from '../service/stats-builder.service';
import { UsernameService } from '../service/username.service';

@UntilDestroy()
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsComponent implements OnInit, OnDestroy {
  progress!: Progress;
  settingCount = new Observable<number>();

  constructor(private retriever: ScrobbleRetrieverService,
              private builder: StatsBuilderService,
              public settings: SettingsService,
              private usernameService: UsernameService,
              private router: Router,
              private dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.builder.update([], false);
    this.progress = this.retriever.retrieveFor(this.username!);
    this.progress.loader.pipe(
      untilDestroyed(this),
      filter((s, idx) => idx === 0 || this.settings.autoUpdate.value),
      finalize(() => this.rebuildWithoutAutoUpdate())
    ).subscribe(s => this.builder.update(s, true));

    this.settingCount = combineLatest([
      this.settings.dateRangeStart,
      this.settings.dateRangeEnd,
      this.settings.artists,
      this.settings.minScrobbles]).pipe(map(([start, end, artists, min]) => {
      return (start || end ? 1 : 0) + (artists.length ? 1 : 0) + (min ? 1 : 0);
    }));
  }

  ngOnDestroy(): void {
    this.progress.state.next('INTERRUPTED');
  }

  private rebuildWithoutAutoUpdate(): void {
    if (!this.settings.autoUpdate.value && this.progress.state.value !== 'INTERRUPTED') {
      this.rebuild();
    } else {
      this.builder.finish();
    }
  }

  rebuild(): void {
    this.builder.update(this.progress.allScrobbles, false);
    this.builder.finish();
  }

  showContent(state: State): boolean {
    return state === 'INTERRUPTED' || state === 'COMPLETED' || state === 'RETRIEVING' || state === 'LOADSTUCK';
  }

  openSettings(): void {
    const width = window.innerWidth;
    const minWidth = width > 1200 ? 1000 : width - 48;
    this.dialog.open(ConfComponent, {minWidth}).afterClosed().subscribe(() => this.rebuild());
  }

  get username(): string {
    return this.usernameService.username!;
  }
}
