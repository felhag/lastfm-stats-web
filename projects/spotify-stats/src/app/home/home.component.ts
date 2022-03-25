import { Component, ChangeDetectionStrategy } from '@angular/core';
import * as JSZip from 'jszip';
import { Scrobble } from 'projects/shared/src/lib/app/model';
import { BehaviorSubject } from 'rxjs';

interface JSONEntry {
  endTime: string;
  artistName: string,
  trackName: string,
  msPlayed: number
}

interface ParsedEntry {
  first: Date;
  last: Date;
  name: string;
  plays: Scrobble[];
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  files = new BehaviorSubject<ParsedEntry[]>([]);

  onSelect(event: any): void {
    const fileList: File[] = event.addedFiles;
    fileList.forEach(file => {
      const name = file.name.toLowerCase();
      if (name.endsWith('.zip')) {
        this.unzip(file);
      } else if (name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onloadend = () => this.addJson(file.name, reader.result as string);
        reader.readAsText(file);
      } else {
        // fail
      }
    });
  }

  private unzip(file: File): void {
    new JSZip().loadAsync(file).then((zip) => {
      Object.keys(zip.files)
        .filter(z => z.startsWith('MyData/StreamingHistory'))
        .forEach((filename) => {
          zip.files[filename].async('string').then(data => this.addJson(filename.substring('MyData/'.length), data));
        });
    });
  }

  private addJson(name: string, json: string): void {
    const parsed: JSONEntry[] = JSON.parse(json);
    const plays: Scrobble[] = parsed.map(s => ({
      artist: s.artistName,
      track: s.trackName,
      album: '',
      date: new Date(s.endTime)
    }));
    const first = plays[0].date;
    const last = plays[plays.length - 1].date;
    const current = this.files.value;
    current.push({name, first, last, plays});
    current.sort((a, b) => a.first.getTime() - b.first.getTime());
    this.files.next(current);
  }

  onRemove(event: any, $event: MouseEvent) {
    const current = this.files.value;
    current.splice(current.indexOf(event), 1);
    this.files.next(current);
    $event.stopPropagation();
  }

  go(): void {

  }
}
