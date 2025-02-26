import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgxCsvParser, NgxCsvParserModule } from 'ngx-csv-parser';
import { Export, Scrobble } from 'projects/shared/src/lib/app/model';
import { Subject, BehaviorSubject } from 'rxjs';
import { ScrobbleImporter } from '../../../../shared/src/lib/service/scrobble-importer.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { DbLoadButtonComponent } from '../../../../shared/src/lib/db-load-button/db-load-button.component';
import { ButtonsComponent } from '../../../../shared/src/lib/buttons/buttons.component';
import { MatIcon } from "@angular/material/icon";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    NgxCsvParserModule,
    RouterModule,
    DbLoadButtonComponent,
    ButtonsComponent,
    MatIcon,
  ]
})
export class HomeComponent {
  username?: string;
  valid = new BehaviorSubject(true);
  importError = new Subject<string>();

  constructor(private router: Router,
              private ngxCsvParser: NgxCsvParser,
              private importer: ScrobbleImporter) {
  }

  update(ev: Event): void {
    this.username = (ev.target as HTMLInputElement).value;
  }

  go(): void {
    if (this.username) {
      this.start(this.username.trim().toLowerCase(), []);
    } else {
      this.valid.next(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  import(ev: any): void {
    const file = ev.target.files[0];
    const filename: string = file.name;
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);
    if (ext === 'csv') {
      // Parse the file you want to select for the operation along with the configuration
      this.ngxCsvParser.parse(file, {header: false, delimiter: ';'}).subscribe({
        next: (csvArray: any) => {
          const headers = csvArray.splice(0, 1)[0];
          const length = headers.length;
          if (!headers || length < 4 || length > 5) {
            this.importError.next(`Expected 4 or 5 columns but found ${length}.
            Only csv's which are exported from this site are allowed.`);
            return;
          }

          const hasAlbumId = headers.includes('AlbumId');
          const username = headers[length - 1].substr(headers[length - 1].indexOf('#') + 1);
          const scrobbles = (csvArray as any[]).map(arr => ({
            artist: arr[0],
            album: arr[1],
            albumId: hasAlbumId ? arr[2] : undefined,
            track: arr[hasAlbumId ? 3 : 2],
            date: new Date(parseInt(arr[hasAlbumId ? 4 : 3]))
          }));
          this.start(username, scrobbles);
        },
        error: (error: any) => this.importError.next('Can\t parse csv: ' + error.message)
      });
    } else if (ext === 'json') {
      const reader = new FileReader();
      reader.onloadend = () => {
        const parsed = this.parseJSON(reader.result as string);
        if (parsed) {
          const scrobbles = parsed.scrobbles.map(s => ({track: s.track, artist: s.artist, album: s.album, albumId: s.albumId, date: new Date(s.date)}));
          this.start(parsed.username, scrobbles);
        }
      };
      reader.readAsText(file);
    } else {
      this.importError.next('Only csv and json are supported.');
    }
  }

  private start(username: string, scrobbles: Scrobble[]): void {
    this.importer.import(scrobbles);
    this.router.navigate([`/user/${username}`]);
  }

  private parseJSON(data: string): Export | undefined {
    return JSON.parse(data) as Export;
  }

  get christmas(): boolean {
    const date = new Date();
    return date.getMonth() === 11 && [24, 25, 26].indexOf(date.getDate()) >= 0;
  }

  get showInfo(): boolean {
    return new Date() < new Date(2025, 3, 1);
  }
}
