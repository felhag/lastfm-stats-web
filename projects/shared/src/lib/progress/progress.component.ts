import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Export, App, Constants } from 'projects/shared/src/lib/app/model';
import { take, Observable, map, combineLatest, switchMap, Subject } from 'rxjs';
import { DatabaseService } from '../service/database.service';
import { ScrobbleManager } from '../service/scrobble-manager.service';
import { ScrobbleStore } from '../service/scrobble.store';
import { TranslatePipe } from '../service/translate.pipe';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TranslatePipe],
})
export class ProgressComponent {
  saveInDb$ = new Subject<number>();

  constructor(public scrobbles: ScrobbleStore,
              private manager: ScrobbleManager,
              private database: DatabaseService,
              private translate: TranslatePipe,
              private app: App) {
  }

  get percentage(): Observable<number> {
    return this.scrobbles.state$.pipe(map(state => ((state.totalPages - state.currentPage) / state.totalPages) * 100));
  }

  get currentPage(): Observable<number> {
    return this.scrobbles.state$.pipe(map(state => state.totalPages - state.currentPage));
  }

  get eta(): Observable<string> {
    return this.scrobbles.state$.pipe(
      map(state => (state.pageLoadTime || 3000) * state.currentPage / 1000),
      map(timeInSeconds => `~ ${Math.ceil(timeInSeconds / 60)} minutes`)
    );
  }

  get isLastfm(): boolean {
    return this.app === App.lastfm;
  }

  get spotifySummary(): Observable<string> {
    return combineLatest([this.scrobbles.state$, this.scrobbles.first, this.scrobbles.last]).pipe(map(([state, first ,last]) => {
      const plays = state.importedScrobbles;
      const diff = last.date.getTime() - first.date.getTime();
      const days = Math.round(diff / Constants.DAY);
      return `<b>${plays}</b> plays in <b>${days}</b> days. That's an average of <b>${Math.round(plays / days)}</b> plays per day!`;
    }));
  }

  saveInDb(): void {
    this.scrobbles.state$.pipe(
      take(1),
      switchMap(state => this.database.addScrobbles(state.user!.name, state.scrobbles)),
    ).subscribe(progress => this.saveInDb$.next(progress));
  }

  exportJSON(): void {
    this.scrobbles.state$.pipe(take(1)).subscribe(state => {
      const data: Export = {
        username: state.user!.name,
        scrobbles: state.scrobbles.map(s => ({track: s.track, artist: s.artist, album: s.album, date: s.date.getTime()}))
      };
      this.export(new Blob([JSON.stringify(data)], {type: 'application/json;charset=utf-8;'}), 'json', state.user!.name);
    });
  }

  exportCSV(): void {
    this.scrobbles.state$.pipe(take(1)).subscribe(state => {
      const hasAlbums = state.scrobbles.some(r => r.album);
      const headers = `Artist;${hasAlbums ? 'Album;' : ''}Track;Date#${state.user!.name}\n`;
      const data = state.scrobbles.map(s =>
        this.csvEntry(s.artist) +
        (hasAlbums ? this.csvEntry(s.album || '') : '') +
        this.csvEntry(s.track) +
        `"${s.date.getTime()}"`).join('\n');
      this.export(new Blob(['\ufeff' + headers + data], {type: 'text/csv;charset=utf-8;'}), 'csv', state.user!.name);
    });
  }

  private csvEntry(input: string): string {
    return `"${input.replaceAll('"', '""')}";`;
  }

  private export(blob: Blob, ext: string, user: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lastfmstats-${user}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
