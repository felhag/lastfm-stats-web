import { Pipe, PipeTransform } from '@angular/core';
import { Artist } from "../app/model";

@Pipe({
    name: 'filterByYear',
})
export class FilterByYearPipe implements PipeTransform {
  transform(artists: Artist[], years: [number, number, number, boolean][]): Artist[] {
    const selected = years.filter(year => year[3])
    if (!selected.length) {
      return [];
    }
    return artists
      .filter(artist => selected.every(year => artist.scrobbles.some(s => s >= year[1] && s < year[2])))
      .sort((a, b) => b.scrobbles.length - a.scrobbles.length);
  }
}
