import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
    selector: 'app-info-dialog',
    templateUrl: './info-dialog.component.html',
    imports: [
        A11yModule,
        MatButtonModule,
        MatDialogModule
    ],
    styleUrls: ['./info-dialog.component.scss']
})
export class InfoDialogComponent {
  constructor(public dialogRef: MatDialogRef<InfoDialogComponent>) { }
}
