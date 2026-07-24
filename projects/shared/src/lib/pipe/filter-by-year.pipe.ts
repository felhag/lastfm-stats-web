import { Pipe, PipeTransform } from '@angular/core';
import { StreakItem } from "../app/model";

@Pipe({
    name: 'filterByYear',
})
export class FilterByYearPipe implements PipeTransform {
  transform<T extends StreakItem>(items: T[], years: [number, number, number, boolean][]): T[] {
    const selected = years.filter(year => year[3])
    if (!selected.length) {
      return [];
    }
    return items
      .filter(item => selected.every(year => item.scrobbles.some(s => s >= year[1] && s < year[2])))
      .sort((a, b) => b.scrobbles.length - a.scrobbles.length);
  }
}
