import { Injectable } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Constants } from 'projects/shared/src/lib/app/model';
import { AbstractUrlService } from '../../../shared/src/lib/service/abstract-url.service';
import { UsernameService } from '../../../shared/src/lib/service/username.service';

@UntilDestroy()
@Injectable({
  providedIn: 'root'
})
export class LastfmUrlService extends AbstractUrlService {
  constructor(private readonly usernameService: UsernameService) {
    super();
  }

  artist(artist: string): string {
    return `${this.base}/music/${encodeURIComponent(artist)}`;
  }

  album(artist: string, album: string): string {
    const urlAlbum = encodeURIComponent(album);
    return `${this.artist(artist)}/${urlAlbum}`;
  }

  track(artist: string, track: string): string {
    const urlTrack = encodeURIComponent(track);
    return `${this.artist(artist)}/_/${urlTrack}`;
  }

  artistMonth(artist: string, month: string): string {
    return this.month(month, this.artist(artist));
  }

  albumMonth(artist: string, album: string, month: string): string {
    return this.month(month, this.album(artist, album));
  }

  trackMonth(artist: string, track: string, month: string): string {
    return this.month(month, this.track(artist, track));
  }

  range(from: Date, to: Date): string {
    return `${this.base}?from=${this.dateUrlParameter(from)}&to=${this.dateUrlParameter(to)}`;
  }

  day(day: Date): string {
    return `${this.base}?from=${this.dateUrlParameter(day)}&rangetype=1day`;
  }

  dayArtist(day: number, artist: string): string {
    return `${this.artist(artist)}?from=${this.dateUrlParameter(new Date(day))}&rangetype=1day`;
  }

  week(weekYear: string): string {
    const start = this.weekAsDate(weekYear);
    const dow = start.getDay();
    start.setDate(dow <= 4 ? start.getDate() - start.getDay() + 1 : start.getDate() + 8 - start.getDay());
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return this.range(start, end);
  }

  month(month: string, baseUrl?: string): string {
    const split = month.split(' ');
    const url = baseUrl || this.base;
    return `${url}?from=${split[1]}-${Constants.MONTHS.indexOf(split[0]) + 1}-01&rangetype=1month`;
  }

  private dateUrlParameter(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  private get base(): string {
    return `https://www.last.fm/user/${this.usernameService.username}/library`;
  }
}
