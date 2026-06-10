import { Component, inject } from '@angular/core';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-info-dialog',
    templateUrl: './info-dialog.component.html',
    imports: [
        MatButton,
        MatDialogActions,
        MatDialogContent,
        MatDialogTitle
    ],
    styleUrls: ['./info-dialog.component.scss']
})
export class InfoDialogComponent {
  dialogRef = inject<MatDialogRef<InfoDialogComponent>>(MatDialogRef);
}
