import {Component, OnInit, ChangeDetectionStrategy, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {map, take, filter} from 'rxjs/operators';
import {Progress, Scrobble} from '../model';
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
              private route: ActivatedRoute) {

    this.imported = this.router.getCurrentNavigation()?.extras.state?.scrobbles || [];
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(params => params.get('username')),
      take(1)
    ).subscribe(s => this.username = s || undefined);

    this.progress = this.retriever.retrieveFor(this.username!, this.imported);
    this.progress.loader.pipe(
      untilDestroyed(this),
      filter(() => this.settings.autoUpdate.value),
      map(s => this.applyDate(s))
    ).subscribe(s => this.builder.update(s, true));

    combineLatest([this.settings.listSize, this.settings.dateRangeStart, this.settings.dateRangeEnd])
      .pipe(untilDestroyed(this))
      .subscribe(() => this.rebuild());
  }

  ngOnDestroy(): void {
    this.progress.state.next('INTERRUPTED');
  }

  rebuild(): void {
    this.builder.update(this.applyDate(this.progress.allScrobbles), false);
  }

  private applyDate(scrobbles: Scrobble[]): Scrobble[] {
    const start = this.settings.dateRangeStart.value;
    const end = this.settings.dateRangeEnd.value;
    return scrobbles.filter(s => (!start || s.date >= start) && (!end || s.date <= end));
  }

  showContent(state: State): boolean {
    return state === 'INTERRUPTED' || state === 'COMPLETED' || state === 'RETRIEVING';
  }
}
