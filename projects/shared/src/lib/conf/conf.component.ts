import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ProgressService } from 'projects/shared/src/lib/service/progress.service';
import { SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { Observable, combineLatest, BehaviorSubject, Subject, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

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
  startDate = new Date();
  endDate = new Date();

  constructor(public progress: ProgressService,
              public settings: SettingsService) {
  }

  ngOnInit(): void {
    const search = this.keyword.pipe(
      untilDestroyed(this),
      startWith(''),
      map(a => a.toLowerCase())
    );
    const all: { [key: string]: number } = this.progress.progress.allScrobbles
      .map(s => s.artist)
      .reduce((acc: any, cur) => (acc[cur] = (acc[cur] || 0) + 1, acc), {});

    this.allArtists = combineLatest([of(all), this.settings.artists, search]).pipe(
      untilDestroyed(this),
      map(args => Object.entries(all)
        .filter(a => !args[2] || a[0].toLowerCase().indexOf(args[2]) >= 0)
        .filter(a => args[1].indexOf(a[0]) < 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30))
    );

    this.startDate = this.progress.progress.first.value!.date;
    this.startDateCtrl = this.dateControl(this.settings.dateRangeStart);
    this.endDateCtrl = this.dateControl(this.settings.dateRangeEnd);
  }

  private dateControl(sub: BehaviorSubject<Date | null>): FormControl<Date | null> {
    const ctrl = new FormControl<Date | null>(sub.value);
    ctrl.valueChanges.pipe(untilDestroyed(this)).subscribe(v => sub.next(v));
    return ctrl;
  }

  clearDate(): void {
    this.startDateCtrl.setValue(null);
    this.endDateCtrl.setValue(null);
  }

  get filteredArtists(): BehaviorSubject<string[]> {
    return this.settings.artists;
  }

  remove(artist: string): void {
    const index = this.filteredArtists.value.indexOf(artist);

    if (index >= 0) {
      this.filteredArtists.value.splice(index, 1);
      this.filteredArtists.next(this.filteredArtists.value);
    }
  }

  add(artist: MatAutocompleteSelectedEvent): void {
    const value: string = artist.option.value;
    this.filteredArtists.next([...this.filteredArtists.value, value]);
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
    this.settings.minScrobbles.next(parseInt((ev.target as HTMLInputElement).value) || 0);
  }
}
