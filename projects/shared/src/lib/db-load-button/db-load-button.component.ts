import { Component, ViewEncapsulation } from '@angular/core';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { Router, RouterModule } from '@angular/router';
import { take, Subject, startWith, switchMap, Observable } from 'rxjs';
import { DbUser, DatabaseService } from '../service/database.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  standalone: true,
  selector: 'app-db-load-button',
  templateUrl: './db-load-button.component.html',
  styleUrls: ['./db-load-button.component.scss'],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    RouterModule,
    MatTooltipModule
  ],
  encapsulation: ViewEncapsulation.None
})
export class DbLoadButtonComponent {
  userDeleted = new Subject<string>();
  dbUsers: Observable<DbUser[]>;

  constructor(private database: DatabaseService, private router: Router) {
    this.dbUsers = this.userDeleted.pipe(startWith(undefined), switchMap(() => this.database.getUsers()));
  }

  goFromDb($event: MatSelectChange): void {
    const user: DbUser = $event.value;
    this.router.navigate([`/user/${user.username}`]);
  }

  deleteFromDb($event: MouseEvent, username: string): void {
    $event.preventDefault();
    $event.stopPropagation();
    this.database.delete(username).pipe(take(1)).subscribe(() => this.userDeleted.next(username));
  }
}
