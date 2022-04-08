import { Injectable } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AbstractUrlService } from '../../../shared/src/lib/service/abstract-url.service';

@UntilDestroy()
@Injectable({
  providedIn: 'root'
})
export class SpotifyUrlService extends AbstractUrlService {
  album(artist: string, album: string): string {
    return '';
  }

  albumMonth(artist: string, album: string, month: string): string {
    return '';
  }

  artist(artist: string): string {
    return '';
  }

  artistMonth(artist: string, month: string): string {
    return '';
  }

  day(day: Date): string {
    return '';
  }

  dayArtist(day: number, artist: string): string {
    return '';
  }

  month(month: string, baseUrl?: string): string {
    return '';
  }

  range(from: Date, to: Date): string {
    return '';
  }

  track(artist: string, track: string): string {
    return '';
  }

  trackMonth(artist: string, track: string, month: string): string {
    return '';
  }

  week(weekYear: string): string {
    return '';
  }
}
