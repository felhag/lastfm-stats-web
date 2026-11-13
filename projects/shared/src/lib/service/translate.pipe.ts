import { Pipe, PipeTransform, inject } from '@angular/core';

@Pipe({
    name: 'translate',
})
export class TranslatePipe implements PipeTransform {
  private translations = inject<{[key: string]: string}>('translations' as any);

  transform(key: string): string {
    const translation = this.translations[key];
    if (!translation) {
      console.error('Cannot find translation:', key);
    }
    return translation || '';
  }

  capFirst(key: string): string {
    const translated = this.transform(key);
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
}
