import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Router} from '@angular/router';
import {NgxCsvParser, NgxCSVParserError} from 'ngx-csv-parser';
import {Subject, BehaviorSubject} from 'rxjs';
import {Export, Scrobble} from '../model';
import {ScrobbleRetrieverService} from '../service/scrobble-retriever.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  username?: string;
  valid = new BehaviorSubject(true);
  importError = new Subject<string>();

  constructor(private router: Router,
              private ngxCsvParser: NgxCsvParser,
              private retriever: ScrobbleRetrieverService) {
  }

  update(ev: Event): void {
    this.username = (ev.target as HTMLInputElement).value;
  }

  go(): void {
    if (this.username) {
      this.router.navigateByUrl(`/user/${this.username.toLowerCase()}`);
    } else {
      this.valid.next(false);
    }
  }

  import(ev: any): void {
    const file = ev.target.files[0];
    const filename: string = file.name;
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);
    if (ext === 'csv') {
      // Parse the file you want to select for the operation along with the configuration
      this.ngxCsvParser.parse(file, { header: false, delimiter: ';' }).subscribe((csvArray: any) => {
        const headers = csvArray.splice(0, 1)[0];
        if (!headers || headers.length !== 3) {
          this.importError.next('Expected 3 columns but found ' + headers.length);
          return;
        }

        const username = headers[2].substr(headers[2].indexOf('#') + 1);
        const scrobbles = (csvArray as any[]).map(arr => ({artist: arr[0], track: arr[1], date: new Date(parseInt(arr[2]))}));
        this.handleImport(username, scrobbles);
      }, (error: NgxCSVParserError) => this.importError.next('Can\t parse csv: ' + error.message));
    } else if (ext === 'json') {
      const reader = new FileReader();
      reader.onloadend = () => {
        const parsed = this.parseJSON(reader.result as string);
        const scrobbles = parsed.scrobbles.map(s => ({track: s.track, artist: s.artist, date: new Date(s.date)}));
        this.handleImport(parsed.username, scrobbles);
      };
      reader.readAsText(file);
    } else {
      this.importError.next('Only csv and json are supported.');
    }
  }

  private handleImport(username: string, scrobbles: Scrobble[]): void {
    this.retriever.imported = scrobbles;
    this.router.navigate([`/user/${username}`]);
  }

  private parseJSON(data: string): Export {
    const parsed = JSON.parse(data);
    if (parsed.username) {
      // 0.3+ format
      return parsed as Export;
    } else {
      // legacy format
      const scrobbles = parsed as any;
      const username = prompt('This looks like the old JSON format. Please enter your username to continue.') || '';
      return {username, scrobbles};
    }
  }
}
