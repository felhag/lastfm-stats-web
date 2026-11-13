import { Component, input, model } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

export function matchesFilter(search: string, value: string): boolean {
  if (!search) {
    return true;
  }
  let needle = search.toLowerCase();
  const haystack = value.toLowerCase();
  const start = needle.startsWith('^');
  const end = needle.endsWith('$');
  if (start) {
    needle = needle.substring(1);
  }
  if (end) {
    needle = needle.substring(0, needle.length - 1);
  }
  if (start && end) {
    return haystack === needle;
  } else if (start) {
    return haystack.startsWith(needle);
  } else if (end) {
    return haystack.endsWith(needle);
  } else {
    return haystack.includes(needle);
  }
}

@Component({
  selector: 'app-search-field',
  templateUrl: './search-field.component.html',
  styleUrls: ['./search-field.component.scss'],
  imports: [
    FormField,
    MatFormField,
    MatHint,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatSuffix,
  ]
})
export class SearchFieldComponent {
  label = input('Search');
  value = model('');
  protected filter = form(this.value);
}
