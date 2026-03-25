import { Injectable } from '@angular/core';
import { Album, ItemType, Month, StreakItem, TempStats, Track, ZScoreEntry } from '../app/model';
import { MapperService } from './mapper.service';

interface WelfordState {
  count: number;
  mean: number;
  M2: number;
  firstMonthIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class ZScoreService {
  constructor(private mapper: MapperService) {
  }

  compute(stats: TempStats, type: ItemType): Map<string, ZScoreEntry[]> {
    const result = new Map<string, ZScoreEntry[]>();

    const months = Object.values(stats.monthList);
    const seen = this.mapper.seen(type, stats);
    const seenEntries = Object.entries(seen);

    // Initialize Welford state per item
    const states = new Map<string, WelfordState>();
    for (const [key] of seenEntries) {
      states.set(key, {
        count: 0,
        mean: 0,
        M2: 0,
        firstMonthIndex: months.findIndex(v => this.mapper.monthItem(type, v, seen[key]) !== undefined)
      });
    }

    // Process each month chronologically
    months.forEach((month, monthIndex) => {
      const monthEntries: ZScoreEntry[] = [];

      for (const [key, item] of seenEntries) {
        const state = states.get(key)!;

        if (state.firstMonthIndex > monthIndex) {
          continue;
        }

        const plays = this.mapper.countPerMonth(type, month, item) || 0;

        // Update Welford state
        state.count += 1;
        const delta = plays - state.mean;
        state.mean += delta / state.count;
        const delta2 = plays - state.mean;
        state.M2 += delta * delta2;

        // Compute z-score
        let z = 0;
        if (state.count >= 2) {
          const variance = state.M2 / state.count;
          const std = Math.sqrt(variance);
          if (std > 0) {
            z = (plays - state.mean) / std;
          }
        }

        monthEntries.push({
          key,
          artist: this.mapper.shortName(type, item),
          name: item.name,
          plays,
          mean: state.mean,
          std: state.count >= 2 ? Math.sqrt(state.M2 / state.count) : 0,
          z,
          historyCount: state.count
        });
      }

      result.set(month.alias, monthEntries);
    });

    return result;
  }
}
