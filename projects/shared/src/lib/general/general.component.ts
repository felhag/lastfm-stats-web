import { Component, computed, inject, Signal, signal, TemplateRef, viewChild } from '@angular/core';
import { ScrobbleStore } from '../service/scrobble.store';
import { DatePipe, DecimalPipe, NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import { TranslatePipe } from '../service/translate.pipe';
import { Artist, Constants, ItemType, Month, scrobbleCount, StreakItem } from '../app/model';
import { StatsBuilderService } from '../service/stats-builder.service';
import { MapperService } from '../service/mapper.service';
import { EddingtonUtil } from '../service/eddington.util';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from "@angular/material/dialog";
import { MatButton, MatIconButton } from "@angular/material/button";
import { MatList, MatListItem } from "@angular/material/list";
import { MatIcon } from "@angular/material/icon";
import { MatChip, MatChipListbox, MatChipOption } from "@angular/material/chips";
import { FilterByYearPipe } from "../pipe/filter-by-year.pipe";
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from "@angular/material/snack-bar";
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from "@angular/material/expansion";

interface Anniversary {
  artist: Artist;
  years: number;
  date: Date;
}

/** The numbers shown on the overview cards, derived once per stats emission. */
interface Overview {
  daysListened: number;
  total: number;
  artists: number;
  albums: number;
  tracks: number;
  oneHitWonders: number;
  tracksWithoutAlbum: number;
  scrobblesWithoutAlbum: number;
  eddington: number;
  nextEddington: number;
  cutOver: number;
  popularYear?: { year: string, count: number };
  popularMonth?: Month;
}

@Component({
  selector: 'app-general',
  imports: [
    DatePipe,
    DecimalPipe,
    FilterByYearPipe,
    MatButton,
    MatCard,
    MatCardContent,
    MatChip,
    MatChipListbox,
    MatChipOption,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatIcon,
    MatIconButton,
    MatList,
    MatListItem,
    NgTemplateOutlet,
    TitleCasePipe,
    TranslatePipe,
    MatCardTitle,
    MatCardHeader,
    MatCardSubtitle,
  ],
  templateUrl: './general.component.html',
  styleUrl: './general.component.scss',
})
export class GeneralComponent {
  readonly everyYearArtistsDialog = viewChild<TemplateRef<StreakItem[]>>('everyYearArtists');
  readonly scrobbleCount = scrobbleCount;

  private readonly scrobbles = inject(ScrobbleStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly stats = inject(StatsBuilderService);
  private readonly mapper = inject(MapperService);

  readonly user$ = toSignal(this.scrobbles.user);
  readonly tempStats$ = toSignal(this.stats.tempStats, {equal: () => false});
  readonly first = computed(() => this.tempStats$()?.first);
  readonly last = computed(() => this.tempStats$()?.last);
  readonly seenArtists$ = computed(() => this.valuesOf(this.tempStats$()?.seenArtists));
  readonly seenAlbums$ = computed(() => this.valuesOf(this.tempStats$()?.seenAlbums));
  readonly seenTracks$ = computed(() => this.valuesOf(this.tempStats$()?.seenTracks));

  readonly overview$: Signal<Overview | undefined> = computed(() => {
    const stats = this.tempStats$();
    if (!stats) {
      return undefined;
    }
    const artists = this.seenArtists$();
    const tracks = this.seenTracks$();

    let oneHitWonders = 0;
    for (const artist of artists) {
      if (artist.tracks.size === 1) {
        oneHitWonders++;
      }
    }

    let tracksWithoutAlbum = 0;
    let scrobblesWithoutAlbum = 0;
    for (const track of tracks) {
      const without = scrobbleCount(track) - track.withAlbum;
      if (without > 0) {
        tracksWithoutAlbum++;
        scrobblesWithoutAlbum += without;
      }
    }

    const counts = EddingtonUtil.counts(stats);
    const eddington = EddingtonUtil.calcEddington(counts);

    let popularYear: Overview['popularYear'];
    for (const [year, count] of Object.entries(stats.years)) {
      if (!popularYear || count > popularYear.count) {
        popularYear = {year, count};
      }
    }
    let popularMonth: Month | undefined;
    for (const month of Object.values(stats.monthList)) {
      if (!popularMonth || month.count > popularMonth.count) {
        popularMonth = month;
      }
    }

    return {
      daysListened: Object.keys(stats.specificDays).length,
      total: stats.scrobbleCount + stats.withoutDate,
      artists: artists.length,
      albums: this.seenAlbums$().length,
      tracks: tracks.length,
      oneHitWonders,
      tracksWithoutAlbum,
      scrobblesWithoutAlbum,
      eddington,
      nextEddington: (counts[eddington] || 0) + 1,
      cutOver: this.cutOver(artists),
      popularYear,
      popularMonth,
    };
  });
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

  readonly completedYears$: Signal<[number, number, number, boolean][]> = computed(() => this.years$().slice(1, -1));
  readonly dialogYears = signal<[number, number, number, boolean][]>([]);
  readonly dialogType = signal<ItemType>('artist');
  readonly dialogSeen$: Signal<{ [key: string]: StreakItem }> = computed(() => {
    const stats = this.tempStats$();
    return stats ? this.mapper.seen(this.dialogType(), stats) : {};
  });
  readonly dialogItems$ = computed(() => Object.values(this.dialogSeen$()));

  readonly anniversaries$: Signal<{ today: Anniversary[], upcoming: Anniversary[], past: Anniversary[] }> = computed(() => {
    const stats = this.tempStats$();
    if (!stats) {
      return { today: [], upcoming: [], past: [] };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayMs = todayStart.getTime();
    const buckets = { today: [] as Anniversary[], upcoming: [] as Anniversary[], past: [] as Anniversary[] };

    for (const artist of Object.values(stats.seenArtists)) {
      const firstMs = artist.scrobbles[0];
      if (!firstMs) {
        continue;
      }
      const firstDate = new Date(firstMs);

      let best: { date: Date, daysDiff: number, years: number } | null = null;
      for (const offset of [-1, 0, 1]) {
        const annivYear = todayStart.getFullYear() + offset;
        const years = annivYear - firstDate.getFullYear();
        if (years < 1) {
          continue;
        }
        const date = new Date(annivYear, firstDate.getMonth(), firstDate.getDate());
        const daysDiff = Math.round((date.getTime() - todayMs) / Constants.DAY);
        if (!best || Math.abs(daysDiff) < Math.abs(best.daysDiff)) {
          best = { date, daysDiff, years };
        }
      }
      if (!best) {
        continue;
      }

      const item: Anniversary = { artist, years: best.years, date: best.date };
      if (best.daysDiff === 0) {
        buckets.today.push(item);
      } else if (best.daysDiff > 0 && best.daysDiff <= Constants.ANNIVERSARY_WINDOW_DAYS) {
        buckets.upcoming.push(item);
      } else if (best.daysDiff < 0 && best.daysDiff >= -Constants.ANNIVERSARY_WINDOW_DAYS) {
        buckets.past.push(item);
      }
    }

    const top3 = (arr: Anniversary[]) => arr
      .sort((a, b) => scrobbleCount(b.artist) - scrobbleCount(a.artist))
      .slice(0, 3);
    return { today: top3(buckets.today), upcoming: top3(buckets.upcoming), past: top3(buckets.past) };
  });

  private openSnackbar?: MatSnackBarRef<TextOnlySnackBar>;

  openEveryYear(type: ItemType, onlyCompleted: boolean): void {
    const source = onlyCompleted ? this.completedYears$() : this.years$();
    this.dialogYears.set(source.map(year => [...year] as [number, number, number, boolean]));
    this.dialogType.set(type);
    this.dialog.open(this.everyYearArtistsDialog()!, {data: onlyCompleted});
  }

  /** Replaces the years array so the pure filterByYear pipe sees a new reference and re-runs. */
  toggleYear(year: number, selected: boolean): void {
    this.dialogYears.update(years => years.map(y => y[0] === year ? [y[0], y[1], y[2], selected] : y));
  }

  protected readonly open = open;

  /** The amount of artists with at least that many scrobbles. */
  private cutOver(artists: Artist[]): number {
    const counts = artists.map(a => scrobbleCount(a)).sort((a, b) => b - a);
    for (let i = 0; i < counts.length; i++) {
      if (i >= counts[i]) {
        return i;
      }
    }
    return 0;
  }

  private valuesOf<T>(seen?: { [key: string]: T }): T[] {
    return seen ? Object.values(seen) : [];
  }

  missing(item: StreakItem, years: [number, number, number, boolean][]) {
    const deselected = years.filter(year => !year[3])
    if (!deselected.length) {
      return undefined;
    }
    return deselected
      .filter(year => !item.scrobbles.some(s => s >= year[1] && s < year[2]))
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
