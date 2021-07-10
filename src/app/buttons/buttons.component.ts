import {Component, Input} from '@angular/core';
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html',
  styleUrls: ['./buttons.component.scss']
})
export class ButtonsComponent {
  @Input() showHome = true;

  constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) {
    this.matIconRegistry.addSvgIcon(
      'github',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/github_icon.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'ko-fi',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/ko-fi_icon.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'reddit',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/reddit_icon.svg')
    );
  }
}
