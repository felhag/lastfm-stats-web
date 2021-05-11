import {Component, OnInit, ChangeDetectionStrategy, OnDestroy} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {ActivatedRoute, Router} from '@angular/router';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {map, take, filter} from 'rxjs/operators';
import {ConfComponent} from '../conf/conf.component';
import {Progress, Scrobble, Constants} from '../model';
import {ScrobbleRetrieverService, State} from '../service/scrobble-retriever.service';
import {SettingsService} from '../service/settings.service';
import {StatsBuilderService} from '../service/stats-builder.service';

@UntilDestroy()
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsComponent implements OnInit, OnDestroy {
  progress!: Progress;
  username?: string;
  imported: Scrobble[];

  constructor(private retriever: ScrobbleRetrieverService,
              private builder: StatsBuilderService,
              public settings: SettingsService,
              private router: Router,
              private route: ActivatedRoute,
              private dialog: MatDialog) {

    this.imported = this.router.getCurrentNavigation()?.extras.state?.scrobbles || [];
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(params => params.get('username')),
      take(1)
    ).subscribe(s => this.username = s || undefined);

    this.builder.update([], false);
    this.progress = this.retriever.retrieveFor(this.username!, this.imported);
    this.progress.loader.pipe(
      untilDestroyed(this),
      filter(() => this.settings.autoUpdate.value),
    ).subscribe(s => this.builder.update(s, true));

    if (!this.settings.autoUpdate.value) {
      this.rebuild();
    }
  }

  ngOnDestroy(): void {
    this.progress.state.next('INTERRUPTED');
  }

  rebuild(): void {
    this.builder.update(this.progress.allScrobbles, false);
  }

  showContent(state: State): boolean {
    return state === 'INTERRUPTED' || state === 'COMPLETED' || state === 'RETRIEVING';
  }

  openSettings(): void {
    const width = window.innerWidth;
    const minWidth = width > 1200 ? 1000 : width - 48;
    this.dialog.open(ConfComponent, {data: this.progress, minWidth}).afterClosed().subscribe(() => this.rebuild());
  }
}
