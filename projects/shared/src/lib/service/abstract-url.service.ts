import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export abstract class AbstractUrlService {
  abstract artist(artist: string): string;

  abstract album(artist: string, album: string): string;

  abstract track(artist: string, track: string): string;

  abstract artistMonth(artist: string, month: string): string;

  abstract albumMonth(artist: string, album: string, month: string): string;

  abstract trackMonth(artist: string, track: string, month: string): string;

  abstract range(from: Date, to: Date): string;

  abstract day(day: Date): string;

  abstract dayArtist(day: number, artist: string): string;

  abstract week(weekYear: string): string;

  abstract month(month: string, baseUrl?: string): string;

  weekAsDate(weekYear: string): Date {
    const week = parseInt(weekYear.substring(1, 3));
    const year = parseInt(weekYear.substring(weekYear.length - 4));
    return new Date(year, 0, 1 + (week - 1) * 7);
  }
}
