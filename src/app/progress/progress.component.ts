import {Component, OnInit, Input, AfterViewInit} from '@angular/core';
import {MDCSlider} from '@material/slider/component';
import {Progress} from '../scrobble-retriever.service';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss']
})
export class ProgressComponent {
  @Input() progress!: Progress;

  constructor() {
  }

  get percentage(): number {
    return (this.currentPage / this.totalPages) * 100;
  }

  get currentPage(): number {
    return this.totalPages - this.progress.currentPage;
  }

  get totalPages(): number {
    return Math.ceil(this.progress.total / 200);
  }
}
