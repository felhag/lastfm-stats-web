import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {Export, Progress} from '../model';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressComponent {
  @Input() progress!: Progress;

  constructor() {
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

  exportJSON(): void {
    const data: Export = {
      username: this.progress.user!.name,
      scrobbles: this.progress.allScrobbles.map(s => ({track: s.track, artist: s.artist, date: s.date.getTime()}))
    };
    this.export(new Blob([JSON.stringify(data)], {type: 'application/json;charset=utf-8;'}), 'json');
  }

  exportCSV(): void {
    const headers = 'Artist;Track;Date#' + this.progress.user!.name + '\n';
    const data = this.progress.allScrobbles.map(s => `"${s.artist.replaceAll('"', '""')}";"${s.track.replaceAll('"', '""')}";"${s.date.getTime()}"`).join('\n');
    this.export(new Blob(['\ufeff' + headers + data], {type: 'text/csv;charset=utf-8;'}), 'csv');
  }

  private export(blob: Blob, ext: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stats-${this.progress.user!.name}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
