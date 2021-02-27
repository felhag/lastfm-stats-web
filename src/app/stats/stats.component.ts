import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable, BehaviorSubject} from 'rxjs';
import {map, shareReplay, switchMap, tap} from 'rxjs/operators';
import {ScrobbleRetrieverService, Progress, Scrobble} from '../scrobble-retriever.service';
import {StatsBuilderService} from '../stats-builder.service';

export interface Top10Item {
  name: string;
  amount: number;
  description?: string;
  date?: string;
}

export interface Stats {
  // username: string;
  // progress: Progress;
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
  private readonly COLORS = ['rgba(252, 108, 133, .1)', 'rgba(252, 148, 161, .1)', 'rgba(255, 204, 203, .1)', 'rgba(205, 255, 204, .1)', 'rgba(176, 245, 171, .1)', 'rgba(144, 239, 144, .1)'];
  stats = new BehaviorSubject<Stats>({
    scrobbleStreak: [],
    notListenedStreak: [],
    betweenArtists: [],
    ongoingBetweenArtists: [],
    weeksPerArtist: [],
    weekStreakPerArtist: [],
    newArtistsPerMonth: [],
    mostListenedNewArtist: [],
    uniqueArtists: [],
    avgTrackPerArtistAsc: [],
    avgTrackPerArtistDesc: [],
    scrobbledHours: [],
    scrobbledDays: [],
    scrobbledMonths: [],
  });

  dateColors: { [key: number]: string } = [];
  progress!: Observable<Progress>;

  constructor(private retriever: ScrobbleRetrieverService, private builder: StatsBuilderService, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.progress = this.username.pipe(
      map(name => this.retriever.retrieveFor(name!)),
      shareReplay()
    );
    this.progress.pipe(
      switchMap(p => p.loader),
      map(s => s.reverse()),
      map(s => this.builder.update(this.stats.value, s))
    ).subscribe(s => this.stats.next(s));
  }

  get username(): Observable<string | null> {
    return this.route.paramMap.pipe(map(params => params.get('username')));
  }
}
