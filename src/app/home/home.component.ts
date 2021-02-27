import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  username?: string;

  constructor(private router: Router) {
  }

  update(ev: Event): void {
    this.username = (ev.target as HTMLInputElement).value;
  }

  go(): void {
    if (this.username) {
      this.router.navigateByUrl(`/user/${this.username}`);
    }
  }
}
