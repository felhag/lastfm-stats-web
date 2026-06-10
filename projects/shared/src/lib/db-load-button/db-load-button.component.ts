import { Component, ViewEncapsulation, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { Router } from '@angular/router';
import { take, Subject, startWith, switchMap, Observable } from 'rxjs';
import { DbUser, DatabaseService } from '../service/database.service';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { MatOption } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'app-db-load-button',
    templateUrl: './db-load-button.component.html',
    styleUrls: ['./db-load-button.component.scss'],
    imports: [
        AsyncPipe,
        MatIcon,
        MatIconButton,
        MatOption,
        MatSelect,
        MatTooltip
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    encapsulation: ViewEncapsulation.None
})
export class DbLoadButtonComponent {
  private database = inject(DatabaseService);
  private router = inject(Router);

  userDeleted = new Subject<string>();
  dbUsers: Observable<DbUser[]>;

  constructor() {
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
