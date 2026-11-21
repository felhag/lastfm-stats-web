import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { Scrobble, TempStats } from '../app/model';
import { AbstractUrlService } from './abstract-url.service';
import { MapperService } from './mapper.service';
import { ScrobbleStore } from './scrobble.store';
import { Settings, SettingsService } from './settings.service';
import { StatsBuilderService } from './stats-builder.service';

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    autoUpdate: true,
    listSize: 10,
    minScrobbles: 0,
    dateRangeStart: null,
    dateRangeEnd: null,
    artistsInclude: true,
    artists: [],
    filterRemasters: false,
    ...overrides,
  };
}

function makeScrobble(overrides: Partial<Scrobble> = {}): Scrobble {
  return {
    artist: 'David Bowie',
    album: 'The Rise and Fall of Ziggy Stardust',
    albumId: '',
    track: 'Starman',
    date: new Date(2024, 0, 1, 12, 0),
    ...overrides,
  };
}

function createHarness(initialSettings: Settings = makeSettings()) {
  const state$ = new BehaviorSubject<Settings>(initialSettings);
  const urlStub = {
    artist: (a: string) => a,
    album: (a: string, b: string) => `${a}/${b}`,
    track: (a: string, t: string) => `${a}/${t}`,
  };

  const injector = Injector.create({
    providers: [
      { provide: DestroyRef, useValue: { onDestroy: () => () => {} } },
      { provide: SettingsService, useValue: { state$ } },
      { provide: AbstractUrlService, useValue: urlStub },
      { provide: MapperService, useFactory: () => new MapperService(), deps: [] },
      { provide: ScrobbleStore, useFactory: () => new ScrobbleStore(), deps: [] },
    ],
  });

  const mapper = injector.get(MapperService);
  const store = injector.get(ScrobbleStore);
  const builder = runInInjectionContext(injector, () => new StatsBuilderService());
  const build = (scrobbles: Scrobble[], settings: Settings, acc?: TempStats): TempStats => {
    const target = acc ?? (builder as any).emptyStats();
    return builder.update(scrobbles, settings, target);
  };

  return { builder, mapper, store, state$, build };
}

describe('StatsBuilderService (filterRemasters)', () => {
  it('keeps remastered and case-variant items separate when filterRemasters is false', () => {
    const { build } = createHarness();
    const scrobbles = [
      makeScrobble({ track: 'Starman', album: 'Ziggy Stardust', date: new Date(2024, 0, 1) }),
      makeScrobble({ track: 'Starman - 2012 Remaster', album: 'Ziggy Stardust (2012 Remaster)', date: new Date(2024, 0, 2) }),
      makeScrobble({ artist: 'david bowie', track: 'starman', album: 'ziggy stardust', date: new Date(2024, 0, 3) }),
    ];

    const stats = build(scrobbles, makeSettings({ filterRemasters: false }));

    expect(Object.keys(stats.seenTracks)).toHaveLength(3);
    expect(Object.keys(stats.seenAlbums)).toHaveLength(3);
    expect(Object.keys(stats.seenArtists)).toHaveLength(2);
    expect(stats.trackStreak.streaks).toHaveLength(0);
    expect(stats.trackStreak.current?.length).toBe(1);
  });

  it('centralizes sanitization on sanitizedScrobble for tracks, streaks, gaps, and undated scrobbles', () => {
    const { build } = createHarness();
    const settings = makeSettings({ filterRemasters: true });
    const scrobbles = [
      makeScrobble({ track: 'Starman - 2012 Remaster', album: 'Ziggy Stardust (Deluxe Edition)', date: new Date(2024, 0, 1) }),
      makeScrobble({ artist: 'david bowie', track: 'starman', album: 'ziggy stardust', date: new Date(2024, 0, 2) }),
      makeScrobble({ track: 'Starman (Live at Wembley)', album: 'Ziggy Stardust [Remastered]', date: new Date(2024, 0, 20) }),
      makeScrobble({ track: 'Starman (Acoustic)', album: 'Ziggy Stardust', date: new Date(0) }),
    ];

    const stats = build(scrobbles, settings);

    const tracks = Object.values(stats.seenTracks);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('David Bowie - Starman');
    expect(tracks[0].shortName).toBe('Starman');
    expect(tracks[0].scrobbles).toHaveLength(3);
    expect(tracks[0].undated).toBe(1);

    const artists = Object.values(stats.seenArtists);
    expect(artists).toHaveLength(1);
    expect(artists[0].name).toBe('David Bowie');
    expect([...artists[0].tracks]).toEqual(['Starman']);

    // Consecutive streak from Jan 1 + Jan 2 + Jan 20 shares sanitized & canonical track/artist
    expect(stats.trackStreak.current?.length).toBe(3);
    expect(stats.trackStreak.current?.start.track).toBe('Starman');
    expect(stats.trackStreak.current?.start.artist).toBe('David Bowie');
    expect(stats.albumStreak.current?.start.album).toBe('Ziggy Stardust');

    // Gap streak between Jan 2 and Jan 20 matches seenTrack.name without list-level normalization
    expect(stats.betweenTracks.streaks).toHaveLength(1);
    const gap = stats.betweenTracks.streaks[0];
    expect(`${gap.start.artist} - ${gap.start.track}`).toBe(tracks[0].name);
  });

  it('does not trigger false Various artists when albumId is missing and artist casing differs', () => {
    const { build } = createHarness();
    const settings = makeSettings({ filterRemasters: true });
    const scrobbles = [
      makeScrobble({ artist: 'The Cure', album: 'Disintegration (Deluxe Edition)', albumId: '', track: 'Plainsong', date: new Date(2024, 0, 1) }),
      makeScrobble({ artist: 'the cure', album: 'disintegration', albumId: '', track: 'Pictures of You', date: new Date(2024, 0, 2) }),
    ];

    const stats = build(scrobbles, settings);
    const albums = Object.values(stats.seenAlbums);

    expect(albums).toHaveLength(1);
    expect(albums[0].name).toBe('The Cure - Disintegration');
    expect(albums[0].shortName).toBe('Disintegration');
    expect(albums[0].artists).toEqual(['The Cure']);
  });

  it('preserves Various artists grouping by albumId and separates distinct albumIds with same name', () => {
    const { build } = createHarness();
    const settings = makeSettings({ filterRemasters: true });
    const scrobbles = [
      makeScrobble({ artist: 'Dick Dale', album: 'Pulp Fiction', albumId: 'mbid-pulp', track: 'Misirlou', date: new Date(2024, 0, 1) }),
      makeScrobble({ artist: 'Urge Overkill', album: "Pulp Fiction (Collector's Edition)", albumId: 'mbid-pulp', track: 'Girl', date: new Date(2024, 0, 2) }),
      makeScrobble({ artist: 'Weezer', album: 'Weezer', albumId: 'mbid-blue', track: 'Buddy Holly', date: new Date(2024, 0, 3) }),
      makeScrobble({ artist: 'Weezer', album: 'Weezer', albumId: 'mbid-green', track: 'Island in the Sun', date: new Date(2024, 0, 4) }),
    ];

    const stats = build(scrobbles, settings);

    expect(stats.seenAlbums['mbid-pulp'].name).toBe('Various artists - Pulp Fiction');
    expect(stats.seenAlbums['mbid-pulp'].artists).toEqual(['Dick Dale', 'Urge Overkill']);
    expect(stats.seenAlbums['mbid-blue'].scrobbles).toHaveLength(1);
    expect(stats.seenAlbums['mbid-green'].scrobbles).toHaveLength(1);
  });

  it('skips albums that sanitize to an empty string without creating blank entries', () => {
    const { build } = createHarness();
    const settings = makeSettings({ filterRemasters: true });
    const scrobbles = [
      makeScrobble({ album: ' (Remastered)', albumId: '', track: 'Starman', date: new Date(2024, 0, 1) }),
    ];

    const stats = build(scrobbles, settings);

    expect(Object.keys(stats.seenAlbums)).toHaveLength(0);
    expect(stats.seenTracks['David Bowie - Starman'].withAlbum).toBe(0);
  });

  it('keeps monthList keys consistent with MapperService lookups for artist, album, and track', () => {
    const { build, mapper } = createHarness();
    const settings = makeSettings({ filterRemasters: true });
    const scrobbles = [
      makeScrobble({ artist: 'David Bowie', album: 'Heroes (2017 Remaster)', albumId: '', track: 'Heroes - 2017 Remaster', date: new Date(2024, 2, 1) }),
      makeScrobble({ artist: 'david bowie', album: 'heroes', albumId: '', track: 'heroes', date: new Date(2024, 2, 10) }),
    ];

    const stats = build(scrobbles, settings);
    const month = Object.values(stats.monthList)[0];
    const artist = Object.values(stats.seenArtists)[0];
    const album = Object.values(stats.seenAlbums)[0];
    const track = Object.values(stats.seenTracks)[0];

    expect(mapper.monthItem('artist', month, artist)?.count).toBe(2);
    expect(mapper.monthItem('album', month, album)?.count).toBe(2);
    expect(mapper.monthItem('track', month, track)?.count).toBe(2);
  });

  it('preserves canonical casing across incremental update chunks', () => {
    const { build } = createHarness();
    const settings = makeSettings({ filterRemasters: true });

    const stats = build([
      makeScrobble({ artist: 'Radiohead', album: 'OK Computer (Remastered)', track: 'Karma Police - Remastered', date: new Date(2024, 0, 1) }),
    ], settings);

    build([
      makeScrobble({ artist: 'radiohead', album: 'ok computer', track: 'karma police', date: new Date(2024, 0, 2) }),
    ], settings, stats);

    expect(Object.keys(stats.seenArtists)).toEqual(['Radiohead']);
    expect(Object.keys(stats.seenAlbums)).toEqual(['Radiohead - OK Computer']);
    expect(Object.keys(stats.seenTracks)).toEqual(['Radiohead - Karma Police']);
    expect(stats.seenTracks['Radiohead - Karma Police'].scrobbles).toHaveLength(2);
  });

  it('keeps different artists with the same album title separate when albumId is missing', () => {
    const { build } = createHarness();
    const settings = makeSettings({ filterRemasters: true });

    const stats = build([
      makeScrobble({ artist: 'Artist One', album: 'Greatest Hits (Deluxe)', albumId: '', track: 'Intro', date: new Date(2024, 0, 1) }),
      makeScrobble({ artist: 'Artist Two', album: 'Greatest Hits', albumId: '', track: 'Outro', date: new Date(2024, 0, 2) }),
    ], settings);

    expect(Object.keys(stats.seenAlbums)).toEqual([
      'Artist One - Greatest Hits',
      'Artist Two - Greatest Hits',
    ]);
  });

  it('rebuilds tempStats cleanly when filterRemasters setting is toggled', () => {
    const { builder, store, state$ } = createHarness(makeSettings({ filterRemasters: false }));
    let latest!: TempStats;
    const sub = builder.tempStats.subscribe(stats => latest = stats);

    store.start([
      makeScrobble({ track: 'Starman', album: 'Ziggy Stardust', date: new Date(2024, 0, 1) }),
      makeScrobble({ track: 'Starman - 2012 Remaster', album: 'Ziggy Stardust (2012 Remaster)', date: new Date(2024, 0, 2) }),
    ]);
    store.finish('COMPLETED');

    expect(Object.keys(latest.seenTracks)).toHaveLength(2);

    state$.next(makeSettings({ filterRemasters: true }));
    expect(Object.keys(latest.seenTracks)).toEqual(['David Bowie - Starman']);
    expect(latest.seenTracks['David Bowie - Starman'].scrobbles).toHaveLength(2);

    state$.next(makeSettings({ filterRemasters: false }));
    expect(Object.keys(latest.seenTracks)).toHaveLength(2);

    sub.unsubscribe();
  });
});
