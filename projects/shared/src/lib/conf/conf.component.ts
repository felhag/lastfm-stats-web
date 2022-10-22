import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Settings } from 'projects/shared/src/lib/service/settings.service';
import { Observable, Subject } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Scrobble } from '../app/model';

@Component({
  selector: 'app-conf',
  templateUrl: './conf.component.html',
  styleUrls: ['./conf.component.scss']
})
@UntilDestroy()
export class ConfComponent implements OnInit {
  @ViewChild(MatAutocompleteTrigger) autocomplete?: MatAutocompleteTrigger;
  private valueSelected = false;
  allArtists!: Observable<[string, number][]>;
  keyword = new Subject<string>();

  startDateCtrl!: FormControl<Date | null>;
  endDateCtrl!: FormControl<Date | null>;
  startDate!: Date;
  endDate = new Date();

  constructor(@Inject(MAT_DIALOG_DATA) public data: {scrobbles: Scrobble[], settings: Settings}) {
  }

  ngOnInit(): void {
    const search = this.keyword.pipe(
      untilDestroyed(this),
      startWith(''),
      map(a => a.toLowerCase())
    );
    const all = this.data.scrobbles
      .map(s => s.artist)
      .reduce((acc: {[key: string]: number}, cur) => (acc[cur] = (acc[cur] || 0) + 1, acc), {})

    this.allArtists = search.pipe(
      untilDestroyed(this),
      map(keyword => Object.entries(all)
        .filter(a => !keyword || a[0].toLowerCase().indexOf(keyword) >= 0)
        .filter(a => this.settings.artists.indexOf(a[0]) < 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30))
    );

    this.startDate = this.data.scrobbles[0].date;
    this.dateControl('dateRangeStart', 'startDateCtrl');
    this.dateControl('dateRangeEnd', 'endDateCtrl');
  }

  private dateControl(setting: keyof Settings, field: keyof ConfComponent): void {
    const settings = this.settings as any;
    const ctrl = new FormControl<Date | null>(settings[setting]);
    ctrl.valueChanges.pipe(untilDestroyed(this)).subscribe(v => (settings)[setting] = v);
    (this as any)[field] = ctrl;
  }

  clearDate(): void {
    this.startDateCtrl.setValue(null);
    this.endDateCtrl.setValue(null);
  }

  remove(artist: string): void {
    const index = this.settings.artists.indexOf(artist);
    if (index >= 0) {
      this.settings.artists.splice(index, 1);
    }
  }

  add(artist: string): void {
    this.settings.artists.push(artist);
    this.valueSelected = true;
  }

  onClose(): void {
    if (this.valueSelected) {
      setTimeout(() => {
        this.autocomplete?.openPanel();
        this.valueSelected = false;
      });
    }
  }

  updateKeyword($event: Event): void {
    this.keyword.next(($event.target as HTMLInputElement).value);
  }

  updateMinScrobbles(ev: Event): void {
    this.settings.minScrobbles = parseInt((ev.target as HTMLInputElement).value) || 0;
  }

  get settings(): Settings {
    return this.data.settings;
  }
}
