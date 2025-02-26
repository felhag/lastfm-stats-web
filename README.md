## 🎶 Last.fm stats
A small project to show some additional statistics for last.fm and spotify:
- https://lastfmstats.com
- https://spotifystats.app

## 🏆 Features
- streaks
- lists
- charts
- custom date range
- import/export

## 🔨 Development

Setting up a local dev environment:
```
git clone https://github.com/felhag/lastfm-stats-web.git
cd lastfm-stats-web
npm ci
```

Running:

```
ng serve lastfm-stats
ng serve spotify-stats
```

Note: angular cli needs to be installed (```npm install -g @angular/cli```)

Running both projects simultaneously:
```
npm run both
```
This will serve lastfm-stats on http://localhost:4200/ and spotify-stats on http://localhost:4201/

## 🐛 Changelog
6.4 (26-02-2025)
- added support for albums with various artists
- added top 10 for albums with various artists
- added top 10 for tracks without album
- added tracks without album to general tab
- fixed label scrobbles without album on general tab

6.3 (27-12-2024)
- added albums to dataset tabs for spotify stats

6.2 (14-12-2024)
- added filter possibility for every year artists
- improved performance artists tab

6.1 (10-12-2024)
- added highest (monthly) rank to dataset modal
- added every year artists to general tab
- fixed date scatter chart
- fixed testuser for development
- updated to angular 19

6.0 (04-10-2024)
- added general tab
- logarithmic scale for rank chart ([#55][i55])
- fixed username casing in urls ([#57][i57])
- fixed character encoding issue in letter-chart

5.12 (26-07-2024)
- added letter chart
- added testuser data for dev purposes
- fixed spotify-stats import once again
- fixed default dataset sorting  ([#49][i49])
- improved styling spotify-stats import
- updated to angular 18

5.11 (05-04-2024)
- added threshold for biggest climbers/fallers ([#47][i47])
- added albums and tracks to race chart ([#40][i40])
- fixed sorting current month dataset ([#48][i48])
- improved spotify data retrieval info

5.10 (15-10-2023)
- added album support for spotify-stats
- fixed spotify-stats import

5.9 (26-10-2023)
- added Eddington number to scrobbles per day chart
- added clear input dataset search fields
- added support for new spotify export format
- added trend for rank on dataset modal
- fixed date indication relative to date filter
- fixed file import error on home-page
- fixed race chart resizing

5.8 (19-05-2023)
- fixed dataset tab ([#36][i36])
- standalone components

5.7 (08-05-2023)
- added count animation race chart
- removed pause in race chart
- fixed month slider length race chart
- improved order artist filter in config dialog
- updated to angular 16

5.6 (21-04-2023)
- improved responsiveness charts
- fixed xAxis all scrobbles chart ([#35][i35])

5.5 (12-04-2023)
- improved performance tracks list
- improved performance dataset tab
- lazy load charts
- show animation when loading charts

5.4 (26-03-2023)
- added keyboard support for race-chart ([#34][i34], pr by [THeK3nger](https://github.com/THeK3nger))
- added albums to timeline-chart
- fixed sticky header dataset tab

5.3 (12-02-2023)
- updated to angular 15
- prevent invalid page reload when settings are saved
- added back button to (some) content cards ([#32][i32])
- toggleable explanation snackbar ([#30][i30])

5.2 (19-11-2022)
- fixed opening dataset modal
- fixed persisting settings
- fixed applying settings when switching tabs
- fixed casing issue when loading scrobbles from db

5.1 (13-11-2022)
- fixed issue when loading scrobbles
- fixed list size option
- fixed min scrobbles option

5.0 (13-11-2022)
- added support for indexedDB ([#10][i10])
- added min length 3 for wordcloud ([#27][i27])
- added artist/album/track toggle for wordcloud ([#27][i27])
- added toggle to show average for scrobbled days/months
- added buttons to switch between last.fm stats and spotify stats
- added possibility to load scrobbles before account creation date
- removed fallback when importing files without albums
- fixed issue which filtered out too many characters in wordcloud ([#27][i27])

4.3 (31-07-2022)
- added support for extended data zip for spotify
- added option to search for artist OR album/track in dataset

4.2 (03-06-2022)
- fixed name and url for month based lists

4.1 (03-06-2022)
- added golden oldies and latest discoveries list for albums
- added min scrobble count option for more lists
- improved layout scrobble scatter chart
- updated to angular 14

4.0 (10-04-2022)
- made project compatible with spotify as well

3.1 (20-03-2022)
- added scrobble scatter chart
- added fullscreen function for charts
- added swiping support for tabs
- clearer race chart toggle ([#3][i3])
- disabled matomo cookies

3.0 (28-02-2022)
- added dataset tab
- added ranking lists for artists, albums and tracks
- added datalabels/legend when exporting some charts
- race-chart is a little less epileptic
- fixed messy export button for charts in light theme
- fixed matching artists with casing inequalities

2.3 (03-12-2021)
- artist scrobble chart xaxis starts at 50
- fixed timeline chart for artists starting with a number
- fixed drilldown url for usernames starting/ending with whitespace

2.2 (17-11-2021)
- added tooltip to list items
- improved onclick for streak lists
- fixed rounding error in consecutive streak rollover
- fixed an issue where the first scrobble wasn't taken in account for scrobble streaks

2.1 (15-11-2021)
- added consecutive streak lists ([#2][i2], pr by [m0nkiii](https://github.com/m0nkiii))
- added colors to visualize date occurrence
- added toggle between artists/albums/tracks for some charts
- added drilldown possibility for some charts
- added download button for charts
- fixed invalid 'does not contain albums' message
- updated to Angular 13

2.0 (17-10-2021)
- added album statistics
- added dark theme
- added most scrobbled artist on a single day list
- added average delta list
- added latest new artist list
- fixed some charts which didn't work on mobile
- fixed artist name for ongoing gaps between artists list (also showed track name)

1.4 (02-08-2021)
- added scrobble count per day chart
- added possibility to adjust speed in race chart
- fixed importing scrobbles with Firefox
- fixed issue which caused loader to get stuck
- fixed colors in race chart

1.3 (12-07-2021)
- fixed issue when using import and autoupdate was disabled scrobbles were handled twice
- only include artists with 2+ tracks in avg scrobbles per track

1.2 (12-07-2021)
- added artists race chart
- added scrobble count filter for gap charts
- added links to reddit, github and ko-fi
- added list index when list size is greater than 10
- added badges to filter and auto update buttons
- fixed error message when adblocker is bothering
- fixed first scrobble when it's same date as account creation
- fixed track per artist if more than 1000 artists have 50+ scrobbles

1.1 (26-06-2021)
- added punchard (Number of scrobbles)
- improved layout wordcloud
- ongoing gaps are now relative to end date

1.0 (24-05-2021)
- seperate tabs for artists/tracks/scrobbles
- added (ongoing) gaps between tracks
- added weeks per track
- added new/unique tracks in a single month
- added avg scrobble date lists for tracks
- added most scrobbles per day/week
- added list of excluded words for the wordcloud

0.4 (11-05-2021)
- added artist include/exclude filtering possibility
- added cumulative scrobbles for top 25 artists chart
- added wordcloud of artist and track names
- added more colors for most listened artist per month chart
- added starting point for timeline chart
- show detailed error when listening data is hidden due privacy setting
- improved responsiveness for scrobble moment charts
- extended color set for artist timeline chart

0.3 (17-04-2021)
- added golden oldies list (avg scrobble date, sorted ascending)
- added latest discoveries list (avg scrobble date, sorted descending)
- added explanation to some lists
- moved import button to home page
- load new scrobbles after importing
- csv support for importing/exporting
- store settings in localstorage
- show message when adblocker blocks api requests
- improved responsiveness (a bit)
- fixed label color for axis on timeline chart
- fixed issue regarding page size (apparently 1000 doesn't work for some accounts)

0.2 (04-04-2021)
- load data with UTC time zone
- fixed an issue when stats were requested multiple times
- start loading scrobbles from account creation date
- increased page size (200 => 1000)
- show an estimated guess of loading time remaining
- clickable artists/months in lists page
- favicon

0.1 (28-03-2021)
- initial version

[i2]: https://github.com/felhag/lastfm-stats-web/pull/2
[i3]: https://github.com/felhag/lastfm-stats-web/issues/3
[i10]: https://github.com/felhag/lastfm-stats-web/issues/10
[i27]: https://github.com/felhag/lastfm-stats-web/issues/27
[i30]: https://github.com/felhag/lastfm-stats-web/issues/30
[i32]: https://github.com/felhag/lastfm-stats-web/issues/32
[i34]: https://github.com/felhag/lastfm-stats-web/pull/34
[i35]: https://github.com/felhag/lastfm-stats-web/issues/35
[i36]: https://github.com/felhag/lastfm-stats-web/issues/36
[i40]: https://github.com/felhag/lastfm-stats-web/issues/40
[i47]: https://github.com/felhag/lastfm-stats-web/issues/47
[i48]: https://github.com/felhag/lastfm-stats-web/issues/48
[i49]: https://github.com/felhag/lastfm-stats-web/issues/49
[i55]: https://github.com/felhag/lastfm-stats-web/issues/55
[i57]: https://github.com/felhag/lastfm-stats-web/issues/57
