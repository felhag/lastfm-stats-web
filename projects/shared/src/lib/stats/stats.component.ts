import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { State, App, User } from 'projects/shared/src/lib/app/model';
import { ConfComponent } from 'projects/shared/src/lib/conf/conf.component';
import { AbstractItemRetriever } from 'projects/shared/src/lib/service/abstract-item-retriever.service';
import { SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { UsernameService } from 'projects/shared/src/lib/service/username.service';
import { combineLatest, Observable, take, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { DateColorsService } from '../service/date-colors.service';
import { ScrobbleManager } from '../service/scrobble-manager.service';
import { ScrobbleStore } from '../service/scrobble.store';

@UntilDestroy()
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ScrobbleManager, ScrobbleStore, DateColorsService, StatsBuilderService]
})
export class StatsComponent implements OnInit, OnDestroy {
  readonly tabs: string[];
  private activeTab: string = 'artists';
  private start?: [number, number, number];
  settingCount = new Observable<number>();
  state$!: Observable<State>;
  user$!: Observable<User | undefined>;

  constructor(private retriever: AbstractItemRetriever,
              private builder: StatsBuilderService,
              private scrobbles: ScrobbleStore,
              private manager: ScrobbleManager,
              public settings: SettingsService,
              private usernameService: UsernameService,
              private router: Router,
              private dialog: MatDialog,
              private app: App,) {
    if (this.app === App.lastfm) {
      this.tabs = ['artists', 'albums', 'tracks', 'scrobbles', 'charts', 'dataset'];
    } else  {
      this.tabs = ['artists', 'tracks', 'plays', 'charts', 'dataset'];
    }
  }

  ngOnInit(): void {
    this.rebuild();
    this.manager.start(this.usernameService.username!);
    this.state$ = this.scrobbles.state;
    this.user$ = this.scrobbles.user;

    this.settingCount = combineLatest([
      this.settings.dateRangeStart,
      this.settings.dateRangeEnd,
      this.settings.artists,
      this.settings.minScrobbles]).pipe(map(([start, end, artists, min]) => {
      return (start || end ? 1 : 0) + (artists.length ? 1 : 0) + (min ? 1 : 0);
    }));
  }

  ngOnDestroy(): void {
    this.scrobbles.finish('INTERRUPTED');
  }

  rebuild(): void {
    this.builder.rebuild.next();
  }

  showContent(state: State): boolean {
    return state === 'INTERRUPTED' || state === 'COMPLETED' || state === 'RETRIEVING' || state === 'LOADSTUCK';
  }

  openSettings(): void {
    combineLatest([this.scrobbles.scrobbles, this.settings.state$]).pipe(
      take(1),
      switchMap(([scrobbles, settings]) => {
        const width = window.innerWidth;
        const minWidth = width > 1200 ? 1000 : width - 48;
        const data = {scrobbles, settings};
        return this.dialog.open(ConfComponent, {minWidth, data}).afterClosed();
      })
    ).subscribe(result => this.settings.update(result));
  }

  get username(): string {
    return this.usernameService.username!;
  }

  swipeStart(ev: TouchEvent): void {
    this.start = this.getSwipeEventData(ev);
  }

  swipeEnd(ev: TouchEvent): void {
    if (!this.start) {
      return;
    }
    const swipe = this.getSwipeEventData(ev);
    const duration = new Date().getTime() - this.start[0];
    const distanceX = swipe[1] - this.start[1];
    const distanceY = swipe[2] - this.start[2];
    if (duration > 100                                    // Long enough
      && Math.abs(distanceX) > 100                        // Far enough
      && Math.abs(distanceX) > Math.abs(distanceY) * 3) { // Horizontal enough
      const current = this.tabs.indexOf(this.activeTab);
      const next = this.tabs[current + (distanceX > 0 ? -1 : 1)];
      if (next) {
        this.router.navigate(['user', this.username, next]);
      }
    }
  }

  private getSwipeEventData(ev: TouchEvent): [number, number, number] {
    const touch = ev.changedTouches[0];
    return [new Date().getTime(), touch.clientX, touch.clientY];
  }

  activeChange(active: boolean, tab: string) {
    if (active) {
      this.activeTab = tab;
    }
  }

  get isLastfm(): boolean {
    return this.app === App.lastfm;
  }
}
