import { Component, inject, computed, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ListProvider, Top10Item } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { DateColorPipe } from 'projects/shared/src/lib/service/date-color.pipe';
import { matchesFilter, SearchFieldComponent } from 'projects/shared/src/lib/search-field/search-field.component';

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
        MatIcon,
        SearchFieldComponent,
    ]
})
export class Top10listDialogComponent {
  protected data = inject<Top10listDialogData>(MAT_DIALOG_DATA);
  protected filter = signal('');
  private items: Row[] = this.data.list.slice(this.data.list.count).map((item, idx) => ({item, rank: idx + 1}));

  protected filtered = computed(() => {
    const search = this.filter();
    return search ? this.items.filter(e => matchesFilter(search, e.item.name)) : this.items;
  });
}
