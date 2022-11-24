import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatLegacyAutocompleteTrigger as MatAutocompleteTrigger } from '@angular/material/legacy-autocomplete';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Settings } from 'projects/shared/src/lib/service/settings.service';
import { Observable, Subject, BehaviorSubject, combineLatest} from 'rxjs';
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
  filteredArtists!: BehaviorSubject<string[]>;
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

    this.filteredArtists = new BehaviorSubject<string[]>(this.settings.artists);
    this.allArtists = combineLatest([search, this.filteredArtists]).pipe(
      untilDestroyed(this),
      map(([keyword, filtered]) => Object.entries(all)
        .filter(a => !keyword || a[0].toLowerCase().indexOf(keyword) >= 0)
        .filter(a => filtered.indexOf(a[0]) < 0)
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
    const index = this.filteredArtists.value.indexOf(artist);

    if (index >= 0) {
      this.filteredArtists.value.splice(index, 1);
      this.filteredArtists.next(this.filteredArtists.value);
    }
  }

  add(artist: string): void {
    this.filteredArtists.next([...this.filteredArtists.value, artist]);
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

  get closeSettings(): Settings {
    return {...this.data.settings, artists: this.filteredArtists.value};
  }
}
