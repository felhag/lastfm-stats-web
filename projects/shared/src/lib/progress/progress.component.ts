import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Export, Progress, App, Constants } from 'projects/shared/src/lib/app/model';
import { ProgressService } from 'projects/shared/src/lib/service/progress.service';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressComponent {
  constructor(private service: ProgressService, private app: App) {
  }

  get progress(): Progress {
    return this.service.progress;
  }

  get percentage(): number {
    return (this.currentPage / this.totalPages) * 100;
  }

  get currentPage(): number {
    return this.totalPages - this.progress.currentPage;
  }

  get totalPages(): number {
    return this.progress.totalPages;
  }

  get eta(): string {
    const timeInSeconds = (this.progress.pageLoadTime || 3000) * this.progress.currentPage / 1000;
    return `~ ${Math.ceil(timeInSeconds / 60)} minutes`;
  }

  get isLastfm(): boolean {
    return this.app === App.lastfm;
  }

  get spotifySummary(): string {
    const plays = this.progress.importedScrobbles;
    const diff = this.progress.last.value!.date.getTime() - this.progress.first.value!.date.getTime();
    const days = Math.round(diff / Constants.DAY);
    return `<b>${plays}</b> plays in <b>${days}</b> days. That's an average of <b>${Math.round(plays / days)}</b> plays per day!`;
  }

  exportJSON(): void {
    const data: Export = {
      username: this.progress.user!.name,
      scrobbles: this.progress.allScrobbles.map(s => ({track: s.track, artist: s.artist, album: s.album, date: s.date.getTime()}))
    };
    this.export(new Blob([JSON.stringify(data)], {type: 'application/json;charset=utf-8;'}), 'json');
  }

  exportCSV(): void {
    const hasAlbums = this.progress.allScrobbles.some(r => r.album);
    const headers = `Artist;${hasAlbums ? 'Album;' : ''}Track;Date#${this.progress.user!.name}\n`;
    const data = this.progress.allScrobbles.map(s =>
      this.csvEntry(s.artist) +
      (hasAlbums ? this.csvEntry(s.album || '') : '') +
      this.csvEntry(s.track) +
      `"${s.date.getTime()}"`).join('\n');
    this.export(new Blob(['\ufeff' + headers + data], {type: 'text/csv;charset=utf-8;'}), 'csv');
  }

  private csvEntry(input: string): string {
    return `"${input.replaceAll('"', '""')}";`;
  }

  private export(blob: Blob, ext: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lastfmstats-${this.progress.user!.name}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
