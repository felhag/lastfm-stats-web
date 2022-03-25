import { Pipe, PipeTransform, Inject } from '@angular/core';

@Pipe({
  name: 'translate'
})
export class TranslatePipe implements PipeTransform {
  constructor(@Inject('translations') private translations: {[key: string]: string}) {
  }

  transform(value: string): string {
    const translation = this.translations[value];
    if (!translation) {
      console.error('Cannot find translation:', value);
    }
    return translation || '';
  }
}
