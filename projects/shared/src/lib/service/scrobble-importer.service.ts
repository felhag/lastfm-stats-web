import { Service } from '@angular/core';
import { Scrobble } from '../app/model';

@Service()
export class ScrobbleImporter {
  private imported?: Scrobble[];

  constructor() {
  }

  import(imported: Scrobble[]): void {
    this.imported = imported;
  }

  get(): Scrobble[] {
    const result = this.imported;
    this.imported = undefined;
    return result || [];
  }
}
