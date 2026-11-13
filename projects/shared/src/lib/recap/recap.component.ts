import { afterNextRender, Component, computed, effect, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { combineLatest, distinctUntilChanged, filter, map } from 'rxjs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { App, APP_DOMAINS, Constants, StreakItem } from '../app/model';
import { MapperService } from '../service/mapper.service';
import { AbstractUrlService } from '../service/abstract-url.service';
import { ScrobbleStore } from '../service/scrobble.store';
import { SettingsService } from '../service/settings.service';
import { StatsBuilderService } from '../service/stats-builder.service';
import { ExportService } from '../service/export-service';
import { TranslatePipe } from '../service/translate.pipe';
import { UsernameService } from '../service/username.service';
import { ProgressComponent } from '../progress/progress.component';
import { buildRecap, Recap, RecapItem, recapYears, RecapSession } from './recap';
import { ARTIST_COLORS, RecapChartDirective, recapCharts } from './recap-charts';
import { CountUpDirective } from './count-up.directive';
import { RecapNavComponent } from './recap-nav.component';
import { canvasToBlob, drawRecapCard } from './recap-card';
import { canCaptureSlides, captureSlides } from './recap-capture';

@Component({
  selector: 'app-recap',
  imports: [
    CountUpDirective,
    DatePipe,
    DecimalPipe,
    MatButton,
    MatChip,
    MatChipSet,
    MatIcon,
    MatIconButton,
    MatTooltip,
    ProgressComponent,
    RecapChartDirective,
    RecapNavComponent,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './recap.component.html',
  styleUrls: ['./recap.component.scss', './recap-slides.scss'],
  host: {
    'tabindex': '-1',
    '(keydown.escape)': 'close()',
    '(wheel)': 'onWheel($event)',
    '[class.capturing]': 'capturing()',
  },
})
export class RecapComponent {
  readonly monthNames = Constants.MONTHS;
  readonly weekdayNames = Constants.DAYS;
  readonly artistColors = ARTIST_COLORS;

  private readonly store = inject(ScrobbleStore);
  private readonly settings = inject(SettingsService);
  private readonly builder = inject(StatsBuilderService);
  private readonly exportService = inject(ExportService);
  private readonly translate = inject(TranslatePipe);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly app = inject(App as any) as App;
  private readonly mapper = inject(MapperService);
  private readonly urls = inject(AbstractUrlService);
  /** The host is the scroll container of the slides. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly slides = viewChildren('slide', {read: ElementRef<HTMLElement>});
  readonly slideElements = computed(() => this.slides().map(s => s.nativeElement));

  readonly username = inject(UsernameService).username!;

  /**
   * Recap is only built once loading is done, rebuilding it on every page would be wasteful.
   * The artist filter applies, but the date range doesn't: new artists, rank changes and the comparison with the
   * previous year need the history before the recap year, and a recap that silently stops halfway is misleading.
   */
  private readonly scrobbles = toSignal(combineLatest([
    this.store.state$.pipe(filter(s => s.state === 'COMPLETED' || s.state === 'INTERRUPTED' || s.state === 'LOADSTUCK')),
    this.settings.state$.pipe(
      map(s => ({...s, dateRangeStart: null, dateRangeEnd: null})),
      // other settings don't affect the recap, so don't rebuild it for them
      distinctUntilChanged((a, b) => a.artistsInclude === b.artistsInclude
        && a.artists.length === b.artists.length && a.artists.every((artist, i) => artist === b.artists[i])),
    )
  ]).pipe(map(([state, settings]) => this.builder.filterWith(state.scrobbles, settings))));

  private readonly yearParam = toSignal(this.route.paramMap.pipe(map(p => p.get('year'))));

  readonly years = computed(() => recapYears(this.scrobbles() ?? []));
  readonly year = computed(() => parseInt(this.yearParam() ?? '') || undefined);
  readonly recap = computed<Recap | undefined>(() => {
    const scrobbles = this.scrobbles();
    const year = this.year();
    return scrobbles && year ? buildRecap(scrobbles, year) : undefined;
  });

  private readonly noun = this.translate.transform('translate.scrobbles');
  readonly charts = computed(() => {
    const recap = this.recap();
    return recap?.total ? recapCharts(recap, this.noun) : undefined;
  });

  /** Wheel events are ignored until this time, so one gesture (including trackpad inertia) moves one step. */
  private wheelLock = 0;

  readonly cardUrl = signal<string | undefined>(undefined);
  readonly canShare = signal(false);
  readonly canCapture = canCaptureSlides();
  readonly capturing = signal(false);
  readonly downloadingAll = signal(false);
  private card?: Blob;

  constructor() {
    // The host is the scroll container: focus it so arrow keys/space scroll the slides right away.
    afterNextRender(() => this.element.focus());
    effect(() => {
      this.year();
      this.element.scrollTo({top: 0});
    });

    effect(onCleanup => {
      const recap = this.recap();
      let url: string | undefined;
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
      this.cardUrl.set(undefined);
      if (!recap?.total) {
        return;
      }
      drawRecapCard(recap, {username: this.username, noun: this.noun, site: this.site})
        .then(canvasToBlob)
        .then(blob => {
          if (cancelled) {
            return;
          }
          this.card = blob;
          url = URL.createObjectURL(blob);
          this.cardUrl.set(url);
          this.canShare.set(!!navigator.canShare?.({files: [this.cardFile(blob)]}));
        });
    });
  }

  close(): void {
    this.router.navigate(['/user', this.username]);
  }

  next(): void {
    this.scrollTo(this.slideElements()[1]);
  }

  /**
   * Browsers snap a small wheel scroll back to the closest step, so wheel scrolling is taken over to always move
   * a full step in the scrolled direction. Touch and keyboard scrolling are left to the native scroll snapping.
   */
  onWheel(event: WheelEvent): void {
    const slides = this.slideElements();
    const direction = Math.sign(event.deltaY);
    if (!slides.length || !direction || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return;
    }
    const height = this.element.clientHeight;
    const current = slides.findLastIndex(s => s.offsetTop <= this.element.scrollTop + height / 2);
    const rect = slides[current].getBoundingClientRect();
    // a step taller than the screen scrolls normally until its edge is reached
    if (direction > 0 ? rect.bottom > height + 1 : rect.top < -1) {
      return;
    }
    event.preventDefault();
    const now = performance.now();
    if (now < this.wheelLock) {
      // keep ignoring while the gesture (or its inertia) continues
      this.wheelLock = Math.max(this.wheelLock, now + 150);
      return;
    }
    const target = slides[current + direction];
    if (target) {
      this.wheelLock = now + 700;
      this.scrollTo(target);
    }
  }

  private scrollTo(slide?: HTMLElement): void {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    slide?.scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});
  }

  download(): void {
    if (this.card) {
      this.exportService.downloadFile(this.card, this.cardFile(this.card).name);
    }
  }

  /** Every slide as a story-sized image, plus the share card, in a single zip. */
  async downloadAll(): Promise<void> {
    if (this.downloadingAll()) {
      return;
    }
    this.downloadingAll.set(true);
    const slides = this.slideElements();
    const share = slides[slides.length - 1];
    try {
      const images = await captureSlides(this.element, slides.slice(0, -1), on => this.capturing.set(on));
      // only loaded when it's needed, it would otherwise end up in the initial bundle of lastfm-stats
      const {default: JSZip} = await import('jszip');
      const zip = new JSZip();
      images.forEach((image, i) => zip.file(`${String(i + 1).padStart(2, '0')}-${slideName(slides[i])}.png`, image));
      if (this.card) {
        zip.file(`${String(images.length + 1).padStart(2, '0')}-card.png`, this.card);
      }
      this.exportService.downloadFile(await zip.generateAsync({type: 'blob'}), `${this.filePrefix}.zip`);
    } catch {
      // the user didn't allow capturing the tab
    } finally {
      this.downloadingAll.set(false);
      share.scrollIntoView();
    }
  }

  share(): void {
    if (this.card) {
      navigator.share({files: [this.cardFile(this.card)], title: `My ${this.year()} recap`}).catch(() => {/* cancelled */});
    }
  }

  difference(recap: Recap): number | undefined {
    // an ongoing year is compared with the same part of the previous year
    return recap.previousToDate ? (recap.total - recap.previousToDate) / recap.previousToDate * 100 : undefined;
  }

  hour(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00 - ${String((hour + 1) % 24).padStart(2, '0')}:00`;
  }

  /** A label for the hour most scrobbles happen in. */
  listenerType(hour: number): string {
    if (hour >= 5 && hour < 12) {
      return 'Early bird';
    } else if (hour >= 12 && hour < 18) {
      return 'Afternoon listener';
    } else if (hour >= 18 && hour < 23) {
      return 'Evening listener';
    }
    return 'Night owl';
  }

  duration(session: RecapSession): string {
    const minutes = Math.round((session.end.getTime() - session.start.getTime()) / 60000);
    return minutes < 60 ? `${minutes} minutes` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  // Links to the artist/album/track/date on the platform, null when it has no page for it (e.g. Spotify) so the
  // anchor is rendered without href and looks like plain text.
  artistUrl(name: string): string | null {
    return this.mapper.url('artist', {name} as StreakItem) || null;
  }

  albumUrl(album: RecapItem): string | null {
    return this.mapper.url('album', {artists: [album.sub], shortName: album.name} as unknown as StreakItem) || null;
  }

  trackUrl(track: RecapItem): string | null {
    return this.mapper.url('track', {artist: track.sub, shortName: track.name} as unknown as StreakItem) || null;
  }

  monthUrl(recap: Recap, month: number): string | null {
    return this.urls.month(`${Constants.MONTHS[month]} ${recap.year}`) || null;
  }

  dayUrl(date: Date): string | null {
    return this.urls.day(date) || null;
  }

  rangeUrl(from: Date, to: Date): string | null {
    return this.urls.range(from, to) || null;
  }

  private cardFile(blob: Blob): File {
    return new File([blob], `${this.filePrefix}.png`, {type: 'image/png'});
  }

  private get filePrefix(): string {
    const prefix = this.app === App.lastfm ? 'lastfmstats' : 'spotifystats';
    return `${prefix}-recap-${this.username}-${this.year()}`;
  }

  private get site(): string {
    return APP_DOMAINS[this.app];
  }
}

/** `slide-favourites` → `favourites`. */
function slideName(slide: HTMLElement): string {
  return [...slide.classList].find(c => c.startsWith('slide-'))!.substring('slide-'.length);
}
