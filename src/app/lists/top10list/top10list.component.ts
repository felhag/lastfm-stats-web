import {Component, Input} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Top10Item} from '../abstract-lists.component';

@Component({
  selector: 'app-top10list',
  templateUrl: './top10list.component.html',
  styleUrls: ['./top10list.component.scss']
})
export class Top10listComponent {
  @Input() title!: string;
  @Input() explanation?: string;
  @Input() list!: Top10Item[];

  constructor(private snackbar: MatSnackBar) {
  }

  get isNumbered(): boolean {
    return this.list.length > 10;
  }

  explain(explanation: string): void {
    this.snackbar.open(explanation, 'Got it!', {
      duration: 10000
    });
  }
}
