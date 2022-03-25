import { Pipe, PipeTransform, Inject } from '@angular/core';

@Pipe({
  name: 'translate'
})
export class TranslatePipe implements PipeTransform {
  constructor(@Inject('translations') private translations: {[key: string]: string}) {
  }

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
