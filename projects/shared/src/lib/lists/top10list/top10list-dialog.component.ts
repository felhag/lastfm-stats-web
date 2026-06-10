import { Component, inject, computed, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ListProvider, Top10Item } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { DateColorPipe } from 'projects/shared/src/lib/service/date-color.pipe';

export interface Top10listDialogData {
  title: string;
  explanation?: string;
  list: ListProvider;
}

interface Row {
  item: Top10Item;
  rank: number;
}

@Component({
    selector: 'app-top10list-dialog',
    templateUrl: './top10list-dialog.component.html',
    styleUrls: ['./top10list-dialog.component.scss'],
    imports: [
        AsyncPipe,
        CdkFixedSizeVirtualScroll,
        CdkVirtualForOf,
        CdkVirtualScrollViewport,
        DateColorPipe,
        MatButton,
        MatDialogActions,
        MatDialogClose,
        MatDialogContent,
        MatDialogTitle,
        MatFormField,
        MatIcon,
        MatIconButton,
        MatInput,
        MatLabel,
        MatPrefix,
        MatSuffix,
        FormField,
    ]
})
export class Top10listDialogComponent {
  protected data = inject<Top10listDialogData>(MAT_DIALOG_DATA);
  protected filter = form(signal(''));
  private items: Row[] = this.data.list.slice(this.data.list.count).map((item, idx) => ({item, rank: idx + 1}));

  protected filtered = computed(() => {
    const search = this.filter().value().toLowerCase();
    return search ? this.items.filter(e => e.item.name.toLowerCase().includes(search)) : this.items;
  });
}
