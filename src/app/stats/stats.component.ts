import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable, BehaviorSubject, Subject} from 'rxjs';
import {map, shareReplay, switchMap, tap, take} from 'rxjs/operators';
import {ScrobbleRetrieverService, Progress, Scrobble} from '../scrobble-retriever.service';
import {StatsBuilderService} from '../stats-builder.service';

export interface Top10Item {
  name: string;
  amount: number;
  description?: string;
  date?: string;
}

export interface Stats {
  scrobbleStreak: Top10Item[];
  notListenedStreak: Top10Item[];
  betweenArtists: Top10Item[];
  ongoingBetweenArtists: Top10Item[];
  weeksPerArtist: Top10Item[];
  weekStreakPerArtist: Top10Item[];
  newArtistsPerMonth: Top10Item[];
  mostListenedNewArtist: Top10Item[];
  uniqueArtists: Top10Item[];
  avgTrackPerArtistAsc: Top10Item[];
  avgTrackPerArtistDesc: Top10Item[];
  scrobbledHours: Top10Item[];
  scrobbledDays: Top10Item[];
  scrobbledMonths: Top10Item[];
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsComponent implements OnInit {
  progress!: Observable<Progress>;
  scrobbles: Scrobble[] = [];
  dateRange?: [Date, Date];

  constructor(private retriever: ScrobbleRetrieverService, private builder: StatsBuilderService, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.progress = this.username.pipe(
      map(name => this.retriever.retrieveFor(name!)),
      shareReplay()
    );
    this.progress.pipe(
      switchMap(p => p.loader),
      tap(s => this.scrobbles.push(...s)),
      map(s => s.filter(a => !this.dateRange || (a.date >= this.dateRange![0] && a.date <= this.dateRange![1]))),
    ).subscribe(s => this.builder.update(s, true));
  }

  get username(): Observable<string | null> {
    return this.route.paramMap.pipe(map(params => params.get('username')));
  }

  export(): void {
    const data = JSON.stringify(this.scrobbles);
    const blob = new Blob(['\ufeff' + data], { type: 'application/json;charset=utf-8;' });
    const dwldLink = document.createElement('a');
    const url = URL.createObjectURL(blob);
    dwldLink.setAttribute('href', url);
    dwldLink.setAttribute('download', 'stats.json');
    document.body.appendChild(dwldLink);
    dwldLink.click();
    document.body.removeChild(dwldLink);
  }

  import(ev: Event): void {
    const reader = new FileReader();
    reader.onloadend = () => {
      const parsed = JSON.parse(reader.result as string) as any[];
      this.scrobbles = parsed.map(s => ({track: s.track, artist: s.artist, date: new Date(s.date)}));
      this.progress.pipe(take(1)).subscribe(p => {
        p.state = 'INTERRUPTED';
        p.totalPages = Math.ceil(this.scrobbles.length / 200);
        p.currentPage = p.totalPages;
        p.total = this.scrobbles.length;
        p.first.next(this.scrobbles[0]);
        p.last.next(this.scrobbles[this.scrobbles.length - 1]);
      });
      this.rebuild(this.scrobbles);
    };
    const files = (ev.target! as any).files as FileList;
    reader.readAsText(files.item(0)!);
  }

  rebuild(scrobbles: Scrobble[]): void {
    this.builder.update(scrobbles, false);
  }

  updateDateRange(range?: [Date, Date]): void {
    this.dateRange = range;
    this.rebuild(this.scrobbles.filter(s => !range || (s.date >= range[0] && s.date <= range[1])));
  }
}
