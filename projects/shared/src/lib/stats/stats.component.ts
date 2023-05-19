import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { State, App, User } from 'projects/shared/src/lib/app/model';
import { ConfComponent } from 'projects/shared/src/lib/conf/conf.component';
import { SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { StatsBuilderService } from 'projects/shared/src/lib/service/stats-builder.service';
import { UsernameService } from 'projects/shared/src/lib/service/username.service';
import { combineLatest, Observable, take, switchMap, filter } from 'rxjs';
import { DateColorsService } from '../service/date-colors.service';
import { ScrobbleManager } from '../service/scrobble-manager.service';
import { ScrobbleStore } from '../service/scrobble.store';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { ProgressComponent } from '../progress/progress.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TitleCasePipe, CommonModule } from '@angular/common';
import { ButtonsComponent } from '../buttons/buttons.component';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ScrobbleManager, ScrobbleStore, DateColorsService, StatsBuilderService],
  standalone: true,
  imports: [
    CommonModule,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTabsModule,
    ProgressComponent,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TitleCasePipe,
    ButtonsComponent
  ]
})
export class StatsComponent implements OnInit, OnDestroy {
  readonly tabs: string[];
  private activeTab: string = 'artists';
  private start?: [number, number, number];
  state$!: Observable<State>;
  user$!: Observable<User | undefined>;

  constructor(private builder: StatsBuilderService,
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
    this.manager.start(this.usernameService.username!);
    this.state$ = this.scrobbles.loadingState;
    this.user$ = this.scrobbles.user;
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

  isStuck(state: State): boolean {
    return state === 'USERNOTFOUND' || state === 'LOADFAILEDDUEPRIVACY' || state === 'LOADFAILED';
  }

  openSettings(): void {
    combineLatest([this.scrobbles.scrobbles, this.settings.state$]).pipe(
      take(1),
      switchMap(([scrobbles, settings]) => {
        const width = window.innerWidth;
        const minWidth = width > 1200 ? 1000 : width - 48;
        const data = {scrobbles, settings};
        return this.dialog.open(ConfComponent, {minWidth, data}).afterClosed();
      }),
      filter(result => !!result)
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

  getContentStateFor(state: State): string {
    switch (state) {
      case 'LOADINGUSER': return `🔎 Looking for ${this.username}...`;
      case 'CALCULATINGPAGES': return `👨‍🔬 ${this.username} found, calculating pages...`;
      case 'USERNOTFOUND': return `Username ${this.username} not found 😥`;
      case 'LOADFAILEDDUEPRIVACY': return '🔏 Your recent listening information is not publicly visible. You can change this&nbsp;<a href="https://last.fm/settings/privacy" target="_blank">here</a>.';
      case 'LOADFAILED': return 'Can\'t reach lastfm API. Maybe there is an adblocker which is blocking the requests?';
      default: return '';
    }
  }
}
