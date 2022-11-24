import { Component, ViewEncapsulation } from '@angular/core';
import { MatLegacySelectChange as MatSelectChange } from '@angular/material/legacy-select';
import { Router } from '@angular/router';
import { take, Subject, startWith, switchMap, Observable } from 'rxjs';
import { DbUser, DatabaseService } from '../service/database.service';

@Component({
  selector: 'app-db-load-button',
  templateUrl: './db-load-button.component.html',
  styleUrls: ['./db-load-button.component.scss'],
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
