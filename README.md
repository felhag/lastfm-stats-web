## 🎶 Last.fm stats 
A small project to show some additional statistics for last.fm: https://lastfmstats.com.

## 🏆 Features 
- streaks
- lists
- charts
- custom date range
- import/export

## 🐛 Changelog
1.4 (02-08-2021)
- added scrobble count per day chart
- added possibility to adjust speed in race chart
- fixed importing scrobbles with Firefox
- fixed issue which caused loader to get stuck

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
