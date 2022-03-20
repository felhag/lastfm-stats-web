## 🎶 Last.fm stats 
A small project to show some additional statistics for last.fm: https://lastfmstats.com.

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
npx ng serve
```
If `@angular/cli` is installed globally the `npx` prefix can be left out in the serve command.

## 🐛 Changelog
3.1 (20-03-2022)
- added scrobble scatter chart
- added fullscreen function for charts
- added swiping support for tabs
- clearer race chart toggle (#3)
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
- added consecutive streak lists (pr by m0nkiii)
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
