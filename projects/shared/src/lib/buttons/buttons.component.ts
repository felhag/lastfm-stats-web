import {Component, Input} from '@angular/core';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import { App } from '../app/model';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html',
  styleUrls: ['./buttons.component.scss']
})
export class ButtonsComponent {
  @Input() showHome = true;

  constructor(private matIconRegistry: MatIconRegistry,
              private domSanitizer: DomSanitizer,
              private app: App) {
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
}
