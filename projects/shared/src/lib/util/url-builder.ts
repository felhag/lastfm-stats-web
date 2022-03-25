import { Constants } from 'projects/shared/src/lib/app/model';

export class UrlBuilder {
  static artist(username: string, artist: string): string {
    return this.base(username) + '/music/' + encodeURIComponent(artist);
  }

  static album(username: string, artist: string, album: string): string {
    const urlAlbum = encodeURIComponent(album);
    return `${this.artist(username, artist)}/${urlAlbum}`;
  }

  static track(username: string, artist: string, track: string): string {
    const urlTrack = encodeURIComponent(track);
    return `${this.artist(username, artist)}/_/${urlTrack}`;
  }

  static artistMonth(username: string, artist: string, month: string): string {
    return this.month(username, month, UrlBuilder.artist(username, artist));
  }

  static albumMonth(username: string, artist: string, album: string, month: string): string {
    return this.month(username, month, UrlBuilder.album(username, artist, album));
  }

  static trackMonth(username: string, artist: string, track: string, month: string): string {
    return this.month(username, month, UrlBuilder.track(username, artist, track));
  }

  static range(username: string, from: Date, to: Date): string {
    return `${this.base(username)}?from=${this.dateUrlParameter(from)}&to=${this.dateUrlParameter(to)}`;
  }

  static day(username: string, day: Date): string {
    return `${this.base(username)}?from=${this.dateUrlParameter(day)}&rangetype=1day`;
  }

  static dayArtist(username: string, day: number, artist: string): string {
    return `${this.artist(username, artist)}?from=${this.dateUrlParameter(new Date(day))}&rangetype=1day`;
  }

  static week(username: string, weekYear: string): string {
    const start = this.weekAsDate(weekYear);
    const dow = start.getDay();
    start.setDate(dow <= 4 ? start.getDate() - start.getDay() + 1 : start.getDate() + 8 - start.getDay());
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return this.range(username, start, end);
  }

  static weekAsDate(weekYear: string): Date {
    const week = parseInt(weekYear.substring(1, 3));
    const year = parseInt(weekYear.substring(weekYear.length - 4));
    return new Date(year, 0, 1 + (week - 1) * 7);
  }

  static month(username: string, month: string, baseUrl?: string): string {
    const split = month.split(' ');
    const url = baseUrl || this.base(username);
    return `${url}?from=${split[1]}-${Constants.MONTHS.indexOf(split[0]) + 1}-01&rangetype=1month`;
  }

  private static dateUrlParameter(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  private static base(username: string): string {
    return `https://www.last.fm/user/${username}/library`;
  }
}
