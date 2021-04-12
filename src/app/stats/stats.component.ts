import {Component, OnInit, ChangeDetectionStrategy, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {BehaviorSubject} from 'rxjs';
import {map, take, filter} from 'rxjs/operators';
import {Progress, Scrobble} from '../model';
import {ScrobbleRetrieverService, State} from '../service/scrobble-retriever.service';
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
  dateRange?: [Date, Date];
  autoUpdate = new BehaviorSubject<boolean>(true);

  constructor(private retriever: ScrobbleRetrieverService,
              private builder: StatsBuilderService,
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
    this.rebuild();

    this.progress.loader.pipe(
      untilDestroyed(this),
      filter(() => this.autoUpdate.value),
      map(s => s.filter(a => !this.dateRange || (a.date >= this.dateRange![0] && a.date <= this.dateRange![1]))),
    ).subscribe(s => this.builder.update(s, true));
  }

  ngOnDestroy(): void {
    this.progress.state.next('INTERRUPTED');
  }

  rebuild(): void {
    const filtered = this.progress.allScrobbles.filter(s => !this.dateRange || (s.date >= this.dateRange[0] && s.date <= this.dateRange[1]));
    this.builder.update(filtered, false);
  }

  updateDateRange(range?: [Date, Date]): void {
    this.dateRange = range;
    this.rebuild();
  }

  updateListSize(size: number): void {
    this.builder.listSize = size;
    this.rebuild();
  }

  showContent(state: State): boolean {
    return state === 'INTERRUPTED' || state === 'COMPLETED' || state === 'RETRIEVING';
  }
}
