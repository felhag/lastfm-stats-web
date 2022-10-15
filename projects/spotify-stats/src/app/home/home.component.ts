import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import * as JSZip from 'jszip';
import { Scrobble, Constants } from 'projects/shared/src/lib/app/model';
import { InfoDialogComponent } from 'projects/spotify-stats/src/app/info-dialog/info-dialog.component';
import { BehaviorSubject, map, shareReplay, Observable, throttleTime, asyncScheduler } from 'rxjs';
import { ScrobbleStore } from '../../../../shared/src/lib/service/scrobble.store';

interface StreamingHistoryEntry {
  endTime: string;
  artistName: string;
  trackName: string;
  msPlayed: number;
}

interface EndSongEntry {
  ts: string;
  master_metadata_album_artist_name: string;
  master_metadata_album_album_name: string;
  master_metadata_track_name: string;
  ms_played: number;
  username: string;
}

interface ParsedEntry {
  first: Date;
  last: Date;
  name: string;
  total: number;
  plays: Scrobble[];
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly fileHandler: {[key: string]: (json: any[]) => Scrobble[]} = {
    'StreamingHistory': json => this.parseStreamingHistory(json),
    'endsong_': json => this.parseEndSong(json)
  };
  username = new FormControl('', Validators.required);
  files = new BehaviorSubject<ParsedEntry[]>([]);
  deduplicated: Observable<number>;
  submitted = false;

  constructor(private router: Router, private scrobbles: ScrobbleStore, private dialog: MatDialog) {
    this.deduplicated = this.files.pipe(
      throttleTime(0, asyncScheduler, { trailing: true }),
      map(files => files.flatMap(file => file.plays).map(p => JSON.stringify(p))),
      map(plays => plays.length - new Set(plays).size),
      shareReplay(),
    );
  }

  onSelect(event: any): void {
    const fileList: File[] = event.addedFiles;
    fileList.forEach(file => {
      const name = file.name.toLowerCase();
      if (name.endsWith('.zip')) {
        this.unzip(file);
      } else if (name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const handler = Object.keys(this.fileHandler).find(key => new RegExp(key + '\d*.json', 'i').test(name));
          const json = JSON.parse(reader.result as string);
          const parsed = handler ? this.fileHandler[handler](json) : this.guessParse(json);
          if (parsed) {
            this.addEntries(file.name, parsed);
          }
        }
        reader.readAsText(file);
      }
    });
  }

  private unzip(file: File): void {
    new JSZip().loadAsync(file).then(zip => {
      Object.keys(zip.files).forEach(filename => {
        const handler = Object.keys(this.fileHandler).find(key => filename.startsWith('MyData/' + key));
        if (filename.startsWith('MyData/Userdata')) {
          zip.files[filename].async('string').then(data => this.username.setValue(JSON.parse(data).username));
        } else if (handler) {
          zip.files[filename].async('string').then(data => this.addEntries(filename.substring('MyData/'.length), this.fileHandler[handler](JSON.parse(data))));
        }
      });
    });
  }

  private parseStreamingHistory(parsed: StreamingHistoryEntry[]): Scrobble[] {
    return parsed
      .filter(s => s.msPlayed > Constants.MIN_MS_PLAYED)
      .map(s => ({
        artist: s.artistName,
        track: s.trackName,
        album: '',
        date: new Date(s.endTime + ' UTC')
      }));
  }

  private parseEndSong(parsed: EndSongEntry[]): Scrobble[] {
    if (!this.username.value && parsed.length > 0) {
      this.username.setValue(parsed[0].username);
    }

    return parsed
      .filter(s => s.master_metadata_album_artist_name && s.master_metadata_track_name)
      .filter(s => s.ms_played > Constants.MIN_MS_PLAYED)
      .map(s => ({
        artist: s.master_metadata_album_artist_name,
        track: s.master_metadata_track_name,
        album: s.master_metadata_album_album_name,
        date: new Date(s.ts)
      }));
  }

  private guessParse(parsed: any[]): Scrobble[] | undefined {
    if (!parsed?.length) {
      return undefined;
    }

    const first = parsed[0];
    if (first.hasOwnProperty('master_metadata_album_artist_name')) {
      return this.parseEndSong((parsed as EndSongEntry[]));
    } else if (first.hasOwnProperty('artistName')) {
      return this.parseStreamingHistory((parsed as StreamingHistoryEntry[]));
    } else {
      return undefined;
    }
  }

  private addEntries(name: string, plays: Scrobble[]): void {
    plays.sort((a, b) => a.date.getTime() - b.date.getTime());
    const first = plays[0].date;
    const last = plays[plays.length - 1].date;
    const current = this.files.value;
    current.push({name, first, last, plays, total: plays.length});
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
    const plays = this.files.value.flatMap(f => f.plays).sort((a, b) => a.date.getTime() - b.date.getTime());
    if (this.username.valid && plays.length) {
      const handled = new Set();
      this.scrobbles.start(plays.filter(p => {
        const json = JSON.stringify(p);
        if (handled.has(json)) {
          return false;
        } else {
          handled.add(json);
          return p;
        }
      }));
      this.router.navigate([`/user/${this.username.value}`]);
    } else {
      this.submitted = true;
      this.username.markAsTouched();
    }
  }

  openInfoDialog(): void {
    this.dialog.open(InfoDialogComponent);
  }
}
