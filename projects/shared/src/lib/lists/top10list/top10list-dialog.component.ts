import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ScrollingModule } from '@angular/cdk/scrolling';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIcon,
        MatInputModule,
        ReactiveFormsModule,
        ScrollingModule,
        DateColorPipe
    ]
})
export class Top10listDialogComponent {
  protected data = inject<Top10listDialogData>(MAT_DIALOG_DATA);
  protected filter = new FormControl<string>('');
  private items: Row[] = this.data.list.slice(this.data.list.count).map((item, idx) => ({item, rank: idx + 1}));
  private search = toSignal(this.filter.valueChanges, {initialValue: ''});

  protected filtered = computed(() => {
    const search = this.search()?.toLowerCase();
    return search ? this.items.filter(e => e.item.name.toLowerCase().includes(search)) : this.items;
  });
}
