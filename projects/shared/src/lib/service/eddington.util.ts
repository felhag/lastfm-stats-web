import { TempStats } from '../app/model';

export class EddingtonUtil {
  public static counts(stats: TempStats) {
    const counts: {[key: number]: number} = {};

    Object.entries(stats.specificDays).forEach(([day, tracks]) => {
      const count = tracks.length;
      if (!counts[count]) {
        counts[count] = 1;
      } else {
        counts[count]++;
      }
    });
    return counts;
  }

  public static calcEddington(counts: {[key: number]: number}): number {
    let sum = 0;
    let eddington = Math.max(...Object.keys(counts).map(c => parseInt(c)));
    while(eddington >= sum) {
      sum += counts[eddington] || 0;
      eddington--;
    }
    return eddington;
  }

  public static eddingtonDataPoint(counts: {[key: number]: number}, eddington: number): number {
    while (!counts[eddington]) {
      eddington--;
    }
    return eddington;
  }
}
