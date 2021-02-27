import {Component, OnInit, Input} from '@angular/core';
import {Progress} from '../scrobble-retriever.service';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss']
})
export class ProgressComponent implements OnInit {
  @Input() progress!: Progress;

  constructor() {
  }

  ngOnInit(): void {
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
