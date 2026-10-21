import { Pipe, PipeTransform } from '@angular/core';

/** Formats a duration in milliseconds as days, hours and minutes, leaving out the units that are zero. */
@Pipe({
  name: 'playtime',
})
export class PlaytimePipe implements PipeTransform {
  transform(ms: number | undefined): string {
    const minutes = Math.round((ms || 0) / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const rest = minutes % 60;
    const parts = [
      days ? `${days.toLocaleString()}d` : '',
      hours ? `${hours}h` : '',
      rest || !(days || hours) ? `${rest}m` : '',
    ];
    return parts.filter(p => p).join(' ');
  }
}
