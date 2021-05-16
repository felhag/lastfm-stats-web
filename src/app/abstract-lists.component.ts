import {OnInit, Directive} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {untilDestroyed, UntilDestroy} from '@ngneat/until-destroy';
import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
import {TempStats, Constants} from './model';
import {SettingsService} from './service/settings.service';
import {StatsBuilderService} from './service/stats-builder.service';

@UntilDestroy()
@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AbstractListsComponent<S> implements OnInit {
  stats = new BehaviorSubject<S>(this.emptyStats());
  username?: string;

  protected constructor(private builder: StatsBuilderService,
                        private settings: SettingsService,
                        private route: ActivatedRoute,
                        private snackbar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.builder.tempStats.pipe(untilDestroyed(this)).subscribe(stats => this.updateStats(stats));
    this.route.parent!.paramMap.pipe(untilDestroyed(this), map(params => params.get('username'))).subscribe(name => this.username = name!);
  }

  explain(explanation: string): void{
    this.snackbar.open(explanation, 'Got it!', {
      duration: 10000
    });
  }

  protected get listSize(): number {
    return this.settings.listSize.value;
  }

  protected monthUrl(month: string, baseUrl?: string): string {
    const split = month.split(' ');
    const url = baseUrl || this.rootUrl;
    return `${url}?from=${split[1]}-${Constants.MONTHS.indexOf(split[0]) + 1}-01&rangetype=1month`;
  }

  protected get rootUrl(): string {
    return `https://www.last.fm/user/${this.username}/library`;
  }

  protected abstract updateStats(stats: TempStats): void;

  protected abstract emptyStats(): S;
}
