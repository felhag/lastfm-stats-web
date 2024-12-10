import { Component, computed, Inject, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteTrigger, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Settings } from 'projects/shared/src/lib/service/settings.service';
import { Scrobble } from '../app/model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from 'projects/shared/src/lib/service/translate.pipe';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSliderModule } from '@angular/material/slider';

@Component({
    selector: 'app-conf',
    templateUrl: './conf.component.html',
    styleUrls: ['./conf.component.scss'],
    imports: [
        MatAutocompleteModule,
        MatButtonModule,
        MatChipsModule,
        MatDatepickerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatNativeDateModule,
        MatOptionModule,
        MatSliderModule,
        ReactiveFormsModule,
        TranslatePipe
    ]
})
export class ConfComponent {
  @ViewChild(MatAutocompleteTrigger) autocomplete?: MatAutocompleteTrigger;
  private valueSelected = false;
  allArtists!: Signal<[string, number][]>;
  filteredArtists!: WritableSignal<string[]>;
  keyword = signal('');

  startDateCtrl!: FormControl<Date | null>;
  endDateCtrl!: FormControl<Date | null>;
  startDate!: Date;
  endDate = new Date();

  constructor(@Inject(MAT_DIALOG_DATA) public data: {scrobbles: Scrobble[], settings: Settings}) {
    const search = computed(() => this.keyword().toLowerCase());
    const all = this.data.scrobbles
        .map(s => s.artist)
        .reduce((acc: {[key: string]: number}, cur) => (acc[cur] = (acc[cur] || 0) + 1, acc), {})

    this.filteredArtists = signal(this.settings.artists);
    this.allArtists = computed(() => this.filterArtists(all, search(), this.filteredArtists()));
    this.startDate = this.data.scrobbles[0].date;
    this.dateControl('dateRangeStart', 'startDateCtrl');
    this.dateControl('dateRangeEnd', 'endDateCtrl');
  }

  private filterArtists(all: { [key: string]: number }, keyword: string, filtered: string[]) {
    return Object.entries(all)
        .map(([artist, count]) => [artist, count, Math.min(artist.toLowerCase().indexOf(keyword), 1)] as [string, number, number])
        .filter(([artist,,index]) => index >= 0 && filtered.indexOf(artist) < 0)
        .sort((a, b) => b[2] === a[2] ? b[1] - a[1] : a[2] - b[2])
        .map(([artist, count]) => [artist, count] as [string, number])
        .slice(0, 30);
  }

  private dateControl(setting: keyof Settings, field: keyof ConfComponent): void {
    const settings = this.settings as any;
    const ctrl = new FormControl<Date | null>(settings[setting]);
    ctrl.valueChanges.pipe(takeUntilDestroyed()).subscribe(v => (settings)[setting] = v);
    (this as any)[field] = ctrl;
  }

  clearDate(): void {
    this.startDateCtrl.setValue(null);
    this.endDateCtrl.setValue(null);
  }

  remove(artist: string): void {
    const index = this.filteredArtists().indexOf(artist);

    if (index >= 0) {
      this.filteredArtists().splice(index, 1);
      this.filteredArtists.set(this.filteredArtists());
    }
  }

  add(artist: string): void {
    this.filteredArtists.set([...this.filteredArtists(), artist]);
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
    this.keyword.set(($event.target as HTMLInputElement).value);
  }

  updateMinScrobbles(ev: Event): void {
    this.settings.minScrobbles = parseInt((ev.target as HTMLInputElement).value) || 0;
  }

  get settings(): Settings {
    return this.data.settings;
  }

  get closeSettings(): Settings {
    return {...this.data.settings, artists: this.filteredArtists()};
  }
}
