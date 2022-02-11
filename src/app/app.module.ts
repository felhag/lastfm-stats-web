import {ScrollingModule} from '@angular/cdk/scrolling';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatBadgeModule} from '@angular/material/badge';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatNativeDateModule} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatSliderModule} from '@angular/material/slider';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import {MatTabsModule} from '@angular/material/tabs';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HighchartsChartModule} from 'highcharts-angular';
import { TableVirtualScrollModule } from 'ng-table-virtual-scroll';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {ButtonsComponent} from './buttons/buttons.component';
import {ChartsComponent} from './charts/charts.component';
import {ConfComponent} from './conf/conf.component';
import {HomeComponent} from './home/home.component';
import {ArtistListsComponent} from './lists/artist-lists.component';
import {ScrobbleListsComponent} from './lists/scrobble-lists.component';
import {TrackListsComponent} from './lists/track-lists.component';
import {ProgressComponent} from './progress/progress.component';
import {StatsComponent} from './stats/stats.component';
import {Top10listComponent} from './lists/top10list/top10list.component';
import { AlbumListsComponent } from './lists/album-lists.component';
import { DatasetComponent } from './dataset/dataset.component';

@NgModule({
  declarations: [
    AppComponent,
    ArtistListsComponent,
    ButtonsComponent,
    ChartsComponent,
    ConfComponent,
    HomeComponent,
    ProgressComponent,
    ScrobbleListsComponent,
    StatsComponent,
    Top10listComponent,
    TrackListsComponent,
    AlbumListsComponent,
    DatasetComponent,
  ],
    imports: [
        AppRoutingModule,
        BrowserAnimationsModule,
        BrowserModule,
        CommonModule,
        HighchartsChartModule,
        HttpClientModule,
        MatAutocompleteModule,
        MatBadgeModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatDatepickerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatNativeDateModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
        MatSliderModule,
        MatSnackBarModule,
        MatTabsModule,
        MatTooltipModule,
        ReactiveFormsModule,
        ScrollingModule,
        MatTableModule,
        TableVirtualScrollModule,
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
