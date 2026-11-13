import { Component, inject, input, computed, ViewContainerRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ListProvider } from 'projects/shared/src/lib/lists/abstract-lists.component';
import { SettingsService } from 'projects/shared/src/lib/service/settings.service';
import { DateColorPipe } from 'projects/shared/src/lib/service/date-color.pipe';
import { Top10listDialogComponent, Top10listDialogData } from './top10list-dialog.component';
import { AsyncPipe } from '@angular/common';
import { MatList, MatListItem, MatListItemIcon, MatListItemLine, MatListItemTitle } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';

@Component({
    selector: 'app-top10list',
    templateUrl: './top10list.component.html',
    styleUrls: ['./top10list.component.scss'],
    imports: [
        AsyncPipe,
        DateColorPipe,
        MatCard,
        MatCardContent,
        MatCardHeader,
        MatCardTitle,
        MatIcon,
        MatIconButton,
        MatList,
        MatListItem,
        MatListItemIcon,
        MatListItemLine,
        MatListItemTitle,
    ]
})
export class Top10listComponent {
  title = input.required<string>();
  explanation = input<string>();
  list = input.required<ListProvider>();

  private openSnackbar?: MatSnackBarRef<TextOnlySnackBar>;
  private snackbar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private settings = inject(SettingsService);
  private viewContainerRef = inject(ViewContainerRef);

  private listSize = toSignal(this.settings.listSize, {initialValue: 10});

  displayed = computed(() => this.list().slice(this.listSize()));
  isNumbered = computed(() => this.displayed().length > 10);
  hasMore = computed(() => this.list().count > this.displayed().length);

  explain(explanation: string): void {
    if (this.openSnackbar) {
      this.openSnackbar?.dismiss();
    } else {
      this.openSnackbar = this.snackbar.open(explanation, 'Got it!', {
        duration: 10000
      });
      this.openSnackbar.afterDismissed().subscribe(() => this.openSnackbar = undefined);
    }
  }

  openFullscreen(): void {
    const width = window.innerWidth;
    const minWidth = width > 1200 ? 1000 : width - 48;
    this.dialog.open<Top10listDialogComponent, Top10listDialogData>(Top10listDialogComponent, {
      data: {title: this.title(), explanation: this.explanation(), list: this.list()},
      minWidth,
      autoFocus: false,
      viewContainerRef: this.viewContainerRef
    });
  }
}
