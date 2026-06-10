import { Component, Input, inject } from '@angular/core';
import { MatIcon, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { App } from '../app/model';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html',
  imports: [
    MatIcon,
    MatTooltip,
    RouterLink,
    MatIconButton
  ],
    styleUrls: ['./buttons.component.scss']
})
export class ButtonsComponent {
  private matIconRegistry = inject(MatIconRegistry);
  private domSanitizer = inject(DomSanitizer);
  private app = inject(App as any) as App;

  @Input() showHome = true;

  constructor() {
    this.addIcons('github', 'ko-fi', 'reddit');
  }

  private addIcons(...icons: string[]): void {
    icons.forEach(icon => {
      this.matIconRegistry.addSvgIcon(
        icon,
        this.domSanitizer.bypassSecurityTrustResourceUrl(`assets/${icon}_icon.svg`)
      );
    });
  }

  get isLastFm(): boolean {
    return this.app === App.lastfm;
  }

  open(url: string) {
    window.open(url, '_blank');
  }
}
