import { ChangeDetectionStrategy, Component, computed, inject, Signal, TemplateRef, ViewChild } from '@angular/core';
import { ScrobbleStore } from '../service/scrobble.store';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '../service/translate.pipe';
import { Artist, Constants, TempStats } from '../app/model';
import { StatsBuilderService } from '../service/stats-builder.service';
import { EddingtonUtil } from '../service/eddington.util';
import { MatCard, MatCardContent } from '@angular/material/card';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from "@angular/material/dialog";
import { MatButton, MatIconButton } from "@angular/material/button";
import { MatList, MatListItem } from "@angular/material/list";
import { MatIcon } from "@angular/material/icon";
import { MatChipListbox, MatChipOption } from "@angular/material/chips";
import { FilterByYearPipe } from "../pipe/filter-by-year.pipe";
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from "@angular/material/snack-bar";

@Component({
  selector: 'app-general',
  imports: [
    DatePipe,
    DecimalPipe,
    FilterByYearPipe,
    MatButton,
    MatCard,
    MatCardContent,
    MatChipListbox,
    MatChipOption,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatIcon,
    MatIconButton,
    MatList,
    MatListItem,
    NgTemplateOutlet,
    TranslatePipe,
  ],
  templateUrl: './general.component.html',
  styleUrl: './general.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralComponent {
  @ViewChild('everyYearArtists') everyYearArtistsDialog!: TemplateRef<Artist[]>;
  readonly values: (seen: { [key: string]: Artist }) => Artist[] = Object.values;
  readonly count: (seen: {}) => number = seen => Object.keys(seen).length;

  private readonly scrobbles = inject(ScrobbleStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly stats = inject(StatsBuilderService);

  readonly user$ = toSignal(this.scrobbles.user);
  readonly tempStats$ = toSignal(this.stats.tempStats);
  readonly first = computed(() => this.tempStats$()?.first);
  readonly last = computed(() => this.tempStats$()?.last);
  readonly days$ = computed(() => {
    const first = this.first();
    return first ? Math.ceil((new Date().setHours(23,59,59,59) - first.date.getTime()) / Constants.DAY) : 0;
  });

  readonly years$: Signal<[number, number, number, boolean][]> = computed(() => {
    const stats = this.tempStats$();
    if (!stats?.first || !stats.last) {
      return [];
    }

    const first = stats.first!.date.getFullYear();
    return [...Array(stats.last!.date.getFullYear() - first + 1).keys()]
      .map(i => i + first)
      .map(year => [year, new Date(year, 0, 1).getTime(), new Date(year, 11, 31).getTime(), true]);
  });

  private openSnackbar?: MatSnackBarRef<TextOnlySnackBar>;

  openEveryYearArist(stats: TempStats) {
    const data = {stats};
    this.dialog.open(this.everyYearArtistsDialog, {data});
  }

  oneHitWonders(stats: TempStats) {
    return Object.values(stats.seenArtists).filter(a => a.tracks.length === 1).length;
  }

  tracksWithoutAlbum(stats: TempStats) {
    return Object.values(stats.seenTracks)
      .filter(t => t.withAlbum < t.scrobbles.length)
      .length;
  }

  scrobblesWithoutAlbum(stats: TempStats) {
    return Object.values(stats.seenTracks)
      .map(t => t.scrobbles.length - t.withAlbum)
      .reduce((a, b) => a + b, 0);
  }

  getEddington(stats: TempStats) {
    return EddingtonUtil.calcEddington(EddingtonUtil.counts(stats));
  }

  nextEddington(stats: TempStats) {
    const counts = EddingtonUtil.counts(stats);
    const eddington = EddingtonUtil.calcEddington(counts);
    return (counts[eddington] || 0) + 1;
  }

  cutOver(stats: TempStats) {
    const counts = Object.values(stats.seenArtists).map(a => a.scrobbles.length).sort((a, b) => b - a);
    for (let i = 0; i < counts.length; i++) {
      if (i >= counts[i]) {
        return i
      }
    }
    return -1;
  }

  mostPopularMonth(stats: TempStats) {
    return Object.values(stats.monthList).sort(((a, b) => b.count - a.count))[0];
  }

  max(counts: { [key: number]: number }): number {
    const keys = Object.keys(counts);
    return keys.length ? keys.reduce((a: any, b: any) => counts[a] > counts[b] ? a : b) as any as number : 0;
  }

  min(counts: { [key: number]: number }): number {
    const keys = Object.keys(counts);
    return keys.length ? keys.reduce((a: any, b: any) => counts[a] < counts[b] ? a : b) as any as number : 0;
  }

  protected readonly open = open;

  missing(artist: Artist, years: [number, number, number, boolean][]) {
    const deselected = years.filter(year => !year[3])
    if (!deselected.length) {
      return undefined;
    }
    return deselected
      .filter(year => !artist.scrobbles.some(s => s >= year[1] && s < year[2]))
      .map(year => year[0])
      .join(', ');
  }

  openExplanation(explanation: string): void {
    if (this.openSnackbar) {
      this.openSnackbar?.dismiss();
    } else {
      this.openSnackbar = this.snackbar.open(explanation, 'Got it!', {
        duration: 10000
      });
      this.openSnackbar.afterDismissed().subscribe(() => this.openSnackbar = undefined);
    }
  }
}
