import { describe, it, expect } from 'vitest';
import { sanitizeName } from './sanitize-name';

describe('sanitizeName', () => {

  // ── Remaster patterns ──────────────────────────────────────────────

  describe('remaster suffixes', () => {
    it('strips " - Remaster"', () => {
      expect(sanitizeName('Space Oddity - Remaster')).toBe('Space Oddity');
    });

    it('strips " - Remastered"', () => {
      expect(sanitizeName('Space Oddity - Remastered')).toBe('Space Oddity');
    });

    it('strips " - 2007 Remaster"', () => {
      expect(sanitizeName('Is There Life on Mars? - 2007 Remaster')).toBe('Is There Life on Mars?');
    });

    it('strips " - 2015 Remastered"', () => {
      expect(sanitizeName('Heroes - 2015 Remastered')).toBe('Heroes');
    });

    it('strips " - Remastered 2011"', () => {
      expect(sanitizeName('Starman - Remastered 2011')).toBe('Starman');
    });

    it('strips " - 2017 Remastered Version"', () => {
      expect(sanitizeName('Ashes to Ashes - 2017 Remastered Version')).toBe('Ashes to Ashes');
    });

    it('strips " - Remastered Version"', () => {
      expect(sanitizeName('Changes - Remastered Version')).toBe('Changes');
    });

    it('strips "(Remastered)"', () => {
      expect(sanitizeName('Space Oddity (Remastered)')).toBe('Space Oddity');
    });

    it('strips "(2007 Remaster)"', () => {
      expect(sanitizeName('Life on Mars? (2007 Remaster)')).toBe('Life on Mars?');
    });

    it('strips "(Remastered 2011)"', () => {
      expect(sanitizeName('Starman (Remastered 2011)')).toBe('Starman');
    });

    it('strips "(2011 Remastered Version)"', () => {
      expect(sanitizeName('Ziggy Stardust (2011 Remastered Version)')).toBe('Ziggy Stardust');
    });

    it('strips "[Remastered]"', () => {
      expect(sanitizeName('Space Oddity [Remastered]')).toBe('Space Oddity');
    });

    it('strips "[Remastered 2011]"', () => {
      expect(sanitizeName('Heroes [Remastered 2011]')).toBe('Heroes');
    });

    it('strips "[2007 Remaster]"', () => {
      expect(sanitizeName('Changes [2007 Remaster]')).toBe('Changes');
    });

    it('strips "[2011 - Remaster]"', () => {
      expect(sanitizeName('Song [2011 - Remaster]')).toBe('Song');
    });

    it('strips " - Digitally Remastered"', () => {
      expect(sanitizeName('Song - Digitally Remastered')).toBe('Song');
    });

    it('strips "(Digitally Remastered)"', () => {
      expect(sanitizeName('Song (Digitally Remastered)')).toBe('Song');
    });

    it('strips "(2018 Remastering)"', () => {
      expect(sanitizeName('Song (2018 Remastering)')).toBe('Song');
    });

    it('strips " - Remastering"', () => {
      expect(sanitizeName('Song - Remastering')).toBe('Song');
    });
  });

  // ── Deluxe patterns ────────────────────────────────────────────────

  describe('deluxe suffixes', () => {
    it('strips "(Deluxe)"', () => {
      expect(sanitizeName('OK Computer (Deluxe)')).toBe('OK Computer');
    });

    it('strips "(Deluxe Edition)"', () => {
      expect(sanitizeName('Abbey Road (Deluxe Edition)')).toBe('Abbey Road');
    });

    it('strips "(Deluxe Version)"', () => {
      expect(sanitizeName('Random Access Memories (Deluxe Version)')).toBe('Random Access Memories');
    });

    it('strips "(Super Deluxe)"', () => {
      expect(sanitizeName('White Album (Super Deluxe)')).toBe('White Album');
    });

    it('strips "(Super Deluxe Edition)"', () => {
      expect(sanitizeName('White Album (Super Deluxe Edition)')).toBe('White Album');
    });

    it('strips " - Deluxe Edition"', () => {
      expect(sanitizeName('Rumours - Deluxe Edition')).toBe('Rumours');
    });

    it('strips "[Deluxe Edition]"', () => {
      expect(sanitizeName('The Dark Side of the Moon [Deluxe Edition]')).toBe('The Dark Side of the Moon');
    });

    it('strips "[Super Deluxe]"', () => {
      expect(sanitizeName('Let It Be [Super Deluxe]')).toBe('Let It Be');
    });
  });

  // ── Edition patterns ───────────────────────────────────────────────

  describe('edition suffixes', () => {
    it('strips "(Special Edition)"', () => {
      expect(sanitizeName('In Rainbows (Special Edition)')).toBe('In Rainbows');
    });

    it('strips " - Special Edition"', () => {
      expect(sanitizeName('In Rainbows - Special Edition')).toBe('In Rainbows');
    });

    it('strips "(Expanded Edition)"', () => {
      expect(sanitizeName('Disintegration (Expanded Edition)')).toBe('Disintegration');
    });

    it('strips "(Anniversary Edition)"', () => {
      expect(sanitizeName('The Joshua Tree (Anniversary Edition)')).toBe('The Joshua Tree');
    });

    it('strips "(25th Anniversary Edition)"', () => {
      expect(sanitizeName('Nevermind (25th Anniversary Edition)')).toBe('Nevermind');
    });

    it('strips "(30th Anniversary Edition)"', () => {
      expect(sanitizeName('Achtung Baby (30th Anniversary Edition)')).toBe('Achtung Baby');
    });

    it('strips "(50th Anniversary Edition)"', () => {
      expect(sanitizeName('Abbey Road (50th Anniversary Edition)')).toBe('Abbey Road');
    });

    it('strips "[Collector\'s Edition]"', () => {
      expect(sanitizeName("Wish You Were Here [Collector's Edition]")).toBe('Wish You Were Here');
    });

    it('strips "(Collectors Edition)" without apostrophe', () => {
      expect(sanitizeName('Wish You Were Here (Collectors Edition)')).toBe('Wish You Were Here');
    });
  });

  // ── Version / edit patterns ────────────────────────────────────────

  describe('version and edit suffixes', () => {
    it('strips " - Single Version"', () => {
      expect(sanitizeName('Bohemian Rhapsody - Single Version')).toBe('Bohemian Rhapsody');
    });

    it('strips "(Single Version)"', () => {
      expect(sanitizeName('Bohemian Rhapsody (Single Version)')).toBe('Bohemian Rhapsody');
    });

    it('strips " - Single Edit"', () => {
      expect(sanitizeName('Paranoid Android - Single Edit')).toBe('Paranoid Android');
    });

    it('strips " - Radio Edit"', () => {
      expect(sanitizeName('Creep - Radio Edit')).toBe('Creep');
    });

    it('strips "(Radio Edit)"', () => {
      expect(sanitizeName('Creep (Radio Edit)')).toBe('Creep');
    });

    it('strips "(Radio Mix)"', () => {
      expect(sanitizeName('Just Like Heaven (Radio Mix)')).toBe('Just Like Heaven');
    });

    it('strips " - Album Version"', () => {
      expect(sanitizeName('Creep - Album Version')).toBe('Creep');
    });

    it('strips "(Album Version)"', () => {
      expect(sanitizeName('Karma Police (Album Version)')).toBe('Karma Police');
    });

    it('strips " - Edit"', () => {
      expect(sanitizeName('Song - Edit')).toBe('Song');
    });

    it('strips "[Edit]"', () => {
      expect(sanitizeName('Song [Edit]')).toBe('Song');
    });

    it('strips "(Edit)"', () => {
      expect(sanitizeName('Song (Edit)')).toBe('Song');
    });

    it('strips " - Original Version"', () => {
      expect(sanitizeName('Song - Original Version')).toBe('Song');
    });

    it('strips "(Original Version)"', () => {
      expect(sanitizeName('Song (Original Version)')).toBe('Song');
    });

    it('strips " - Original"', () => {
      expect(sanitizeName('Song - Original')).toBe('Song');
    });

    it('strips "(Album V)"', () => {
      expect(sanitizeName('Song (Album V)')).toBe('Song');
    });

    it('strips " - Album V"', () => {
      expect(sanitizeName('Song - Album V')).toBe('Song');
    });

    it('strips " - Extended Edit"', () => {
      expect(sanitizeName('Song - Extended Edit')).toBe('Song');
    });

    it('strips "(Extended Edit)"', () => {
      expect(sanitizeName('Song (Extended Edit)')).toBe('Song');
    });

    it('strips " - Alternate Version"', () => {
      expect(sanitizeName('Song - Alternate Version')).toBe('Song');
    });

    it('strips "(Alternate Version)"', () => {
      expect(sanitizeName('Song (Alternate Version)')).toBe('Song');
    });

    it('strips " - Extended Version"', () => {
      expect(sanitizeName('Song - Extended Version')).toBe('Song');
    });

  });

  // ── Recording variant patterns ─────────────────────────────────────

  describe('mono/stereo suffixes', () => {
    it('strips " - Mono"', () => {
      expect(sanitizeName('Revolution - Mono')).toBe('Revolution');
    });

    it('strips "(Mono)"', () => {
      expect(sanitizeName('Revolution (Mono)')).toBe('Revolution');
    });

    it('strips " - Mono Version"', () => {
      expect(sanitizeName('Revolution - Mono Version')).toBe('Revolution');
    });

    it('strips " - Stereo"', () => {
      expect(sanitizeName('Revolution - Stereo')).toBe('Revolution');
    });

    it('strips "(Stereo)"', () => {
      expect(sanitizeName('Revolution (Stereo)')).toBe('Revolution');
    });

    it('strips "(Stereo Version)"', () => {
      expect(sanitizeName('Revolution (Stereo Version)')).toBe('Revolution');
    });
  });

  // ── Demo patterns ──────────────────────────────────────────────────

  describe('demo suffixes', () => {
    it('strips " - Demo"', () => {
      expect(sanitizeName('Five Years - Demo')).toBe('Five Years');
    });

    it('strips "(Demo)"', () => {
      expect(sanitizeName('Five Years (Demo)')).toBe('Five Years');
    });

    it('strips " - Demo Version"', () => {
      expect(sanitizeName('Five Years - Demo Version')).toBe('Five Years');
    });

    it('strips "(Demo Version)"', () => {
      expect(sanitizeName('Five Years (Demo Version)')).toBe('Five Years');
    });
  });

  // ── Acoustic patterns ─────────────────────────────────────────────

  describe('acoustic suffixes', () => {
    it('strips " - Acoustic"', () => {
      expect(sanitizeName('Everlong - Acoustic')).toBe('Everlong');
    });

    it('strips "(Acoustic)"', () => {
      expect(sanitizeName('Everlong (Acoustic)')).toBe('Everlong');
    });

    it('strips " - Acoustic Version"', () => {
      expect(sanitizeName('Everlong - Acoustic Version')).toBe('Everlong');
    });

    it('strips "(Acoustic Version)"', () => {
      expect(sanitizeName('Everlong (Acoustic Version)')).toBe('Everlong');
    });
  });

  // ── Live patterns ─────────────────────────────────────────────────

  describe('live suffixes', () => {
    it('strips " - Live"', () => {
      expect(sanitizeName('Comfortably Numb - Live')).toBe('Comfortably Numb');
    });

    it('strips "(Live)"', () => {
      expect(sanitizeName('Comfortably Numb (Live)')).toBe('Comfortably Numb');
    });

    it('strips " - Live Version"', () => {
      expect(sanitizeName('Comfortably Numb - Live Version')).toBe('Comfortably Numb');
    });

    it('strips "(Live at Wembley)"', () => {
      expect(sanitizeName('Bohemian Rhapsody (Live at Wembley)')).toBe('Bohemian Rhapsody');
    });

    it('strips "(Live in Tokyo)"', () => {
      expect(sanitizeName('Under Pressure (Live in Tokyo)')).toBe('Under Pressure');
    });

    it('strips "(Live from Madison Square Garden)"', () => {
      expect(sanitizeName('Purple Rain (Live from Madison Square Garden)')).toBe('Purple Rain');
    });

    it('strips " - Live at Very Long Venue Name Here"', () => {
      expect(sanitizeName('Song - Live at The Royal Albert Hall London 2019')).toBe('Song');
    });
  });

  // ── Soundtrack patterns ───────────────────────────────────────────

  describe('soundtrack suffixes', () => {
    it('strips " - from The Lion King Soundtrack"', () => {
      expect(sanitizeName('Circle of Life - from The Lion King Soundtrack')).toBe('Circle of Life');
    });

    it('strips "(from Frozen Soundtrack)"', () => {
      expect(sanitizeName('Let It Go (from Frozen Soundtrack)')).toBe('Let It Go');
    });

    it('strips " - from Motion Picture Soundtrack"', () => {
      expect(sanitizeName('Song - from Motion Picture Soundtrack')).toBe('Song');
    });
  });

  // ── Bonus track patterns ──────────────────────────────────────────

  describe('bonus track suffixes', () => {
    it('strips " - Bonus Track"', () => {
      expect(sanitizeName('Hidden Song - Bonus Track')).toBe('Hidden Song');
    });

    it('strips "(Bonus Track)"', () => {
      expect(sanitizeName('Hidden Song (Bonus Track)')).toBe('Hidden Song');
    });

    it('strips "(Bonus)"', () => {
      expect(sanitizeName('Hidden Song (Bonus)')).toBe('Hidden Song');
    });

    it('strips "[Bonus Track]"', () => {
      expect(sanitizeName('Hidden Song [Bonus Track]')).toBe('Hidden Song');
    });
  });

  // ── Featuring patterns (parenthesized only) ─────────────────────────

  describe('featuring suffixes', () => {
    it('strips "(feat. Artist)"', () => {
      expect(sanitizeName('Song (feat. Artist)')).toBe('Song');
    });

    it('strips "(ft. Artist)"', () => {
      expect(sanitizeName('Song (ft. Artist)')).toBe('Song');
    });

    it('strips "(featuring Artist)"', () => {
      expect(sanitizeName('Song (featuring Artist)')).toBe('Song');
    });

    it('strips "(feat Artist)" without dot', () => {
      expect(sanitizeName('Song (feat Artist)')).toBe('Song');
    });

    it('strips "(ft Artist)" without dot', () => {
      expect(sanitizeName('Song (ft Artist)')).toBe('Song');
    });

    it('strips "(feat. Multiple Artists & Other)"', () => {
      expect(sanitizeName('Song (feat. Artist One & Artist Two)')).toBe('Song');
    });

    it('strips "(ft. Artist) case insensitive', () => {
      expect(sanitizeName('Song (FT. Artist)')).toBe('Song');
    });

    it('strips "(Feat. Artist)" capitalized', () => {
      expect(sanitizeName('Song (Feat. Artist)')).toBe('Song');
    });

    it('strips "(FEATURING ARTIST)" uppercase', () => {
      expect(sanitizeName('Song (FEATURING ARTIST)')).toBe('Song');
    });

    it('does NOT strip "feat." outside parentheses', () => {
      expect(sanitizeName('Song feat. Artist')).toBe('Song feat. Artist');
    });

    it('strips " - feat. Artist" (dash form)', () => {
      expect(sanitizeName('Song - feat. Artist')).toBe('Song');
    });

    it('strips " - ft. Artist" (dash form)', () => {
      expect(sanitizeName('Song - ft. Artist')).toBe('Song');
    });

    it('strips " - featuring Artist" (dash form)', () => {
      expect(sanitizeName('Song - featuring Artist Name')).toBe('Song');
    });

    it('strips feat combined with remaster suffix', () => {
      expect(sanitizeName('Song (feat. Artist) - Remastered')).toBe('Song');
    });

    it('strips remaster combined with feat suffix', () => {
      expect(sanitizeName('Song - Remastered (feat. Artist)')).toBe('Song');
    });

    it('strips "[feat. Artist]"', () => {
      expect(sanitizeName('Song [feat. Artist]')).toBe('Song');
    });

    it('strips "[ft. Artist]"', () => {
      expect(sanitizeName('Song [ft. Artist]')).toBe('Song');
    });

    it('strips "[featuring Artist]"', () => {
      expect(sanitizeName('Song [featuring Artist Name]')).toBe('Song');
    });

    it('strips "(with Artist)"', () => {
      expect(sanitizeName('Song (with Artist)')).toBe('Song');
    });

    it('strips "[with Artist]"', () => {
      expect(sanitizeName('Song [with Artist]')).toBe('Song');
    });

    it('strips "(w/ Artist)"', () => {
      expect(sanitizeName('Song (w/ Artist Name)')).toBe('Song');
    });

    it('strips "(With Multiple Artists)"', () => {
      expect(sanitizeName('Song (With Artist One & Artist Two)')).toBe('Song');
    });
  });

  // ── En-dash / em-dash separators ────────────────────────────────────

  describe('en-dash and em-dash separators', () => {
    it('strips " \u2013 Remastered" (en-dash)', () => {
      expect(sanitizeName('Song \u2013 Remastered')).toBe('Song');
    });

    it('strips " \u2013 2016 Remastered" (en-dash)', () => {
      expect(sanitizeName('I Wish It Would Rain Down \u2013 2016 Remastered')).toBe('I Wish It Would Rain Down');
    });

    it('strips " \u2014 Remastered" (em-dash)', () => {
      expect(sanitizeName('Song \u2014 Remastered')).toBe('Song');
    });

    it('strips " \u2013 Deluxe Edition" (en-dash)', () => {
      expect(sanitizeName('Album \u2013 Deluxe Edition')).toBe('Album');
    });

    it('strips " \u2013 feat. Artist" (en-dash)', () => {
      expect(sanitizeName('Song \u2013 feat. Artist')).toBe('Song');
    });

    it('strips " \u2013 Remix" (en-dash)', () => {
      expect(sanitizeName('Song \u2013 Remix')).toBe('Song');
    });
  });

  // ── Slash separator ───────────────────────────────────────────────

  describe('slash separator', () => {
    it('strips " / Remastered"', () => {
      expect(sanitizeName('Song / Remastered')).toBe('Song');
    });

    it('strips " / Remastered 2011"', () => {
      expect(sanitizeName('Song / Remastered 2011')).toBe('Song');
    });

    it('strips " - Mono / Remastered" (stacked with slash)', () => {
      expect(sanitizeName('Song - Mono / Remastered')).toBe('Song');
    });

    it('strips " / Deluxe Edition"', () => {
      expect(sanitizeName('Album / Deluxe Edition')).toBe('Album');
    });
  });

  // ── Stacked suffixes ──────────────────────────────────────────────

  describe('stacked suffixes', () => {
    it('strips " - Remastered (Deluxe Edition)"', () => {
      expect(sanitizeName('Song - Remastered (Deluxe Edition)')).toBe('Song');
    });

    it('strips "(Remastered) [Deluxe Edition]"', () => {
      expect(sanitizeName('Song (Remastered) [Deluxe Edition]')).toBe('Song');
    });

    it('strips " - 2011 Remaster (Special Edition)"', () => {
      expect(sanitizeName('Song - 2011 Remaster (Special Edition)')).toBe('Song');
    });

    it('strips "(Deluxe Edition) (Remastered)"', () => {
      expect(sanitizeName('Album (Deluxe Edition) (Remastered)')).toBe('Album');
    });

    it('strips " - Live (Remastered 2005)"', () => {
      expect(sanitizeName('Song - Live (Remastered 2005)')).toBe('Song');
    });

    it('strips triple stacked suffixes', () => {
      expect(sanitizeName('Song (Remastered) (Deluxe) [Bonus Track]')).toBe('Song');
    });
  });

  // ── Remix / Mix patterns ──────────────────────────────────────────

  describe('remix and mix suffixes', () => {
    it('strips " - Remix"', () => {
      expect(sanitizeName('Blue Monday - Remix')).toBe('Blue Monday');
    });

    it('strips "(Remix)"', () => {
      expect(sanitizeName('Blue Monday (Remix)')).toBe('Blue Monday');
    });

    it('strips " - 2018 Mix"', () => {
      expect(sanitizeName('Song - 2018 Mix')).toBe('Song');
    });

    it('strips "(2018 Mix)"', () => {
      expect(sanitizeName('Song (2018 Mix)')).toBe('Song');
    });

    it('strips " - Stereo Mix 2017"', () => {
      expect(sanitizeName('Song - Stereo Mix 2017')).toBe('Song');
    });

    it('strips "(Stereo Mix 2017)"', () => {
      expect(sanitizeName('Song (Stereo Mix 2017)')).toBe('Song');
    });

    it('strips " - 2022 Stereo Mix"', () => {
      expect(sanitizeName('Song - 2022 Stereo Mix')).toBe('Song');
    });

    it('strips "(2022 Stereo Mix)"', () => {
      expect(sanitizeName('Song (2022 Stereo Mix)')).toBe('Song');
    });

    it('strips " - Mono Mix"', () => {
      expect(sanitizeName('Song - Mono Mix')).toBe('Song');
    });

    it('strips " - Mix"', () => {
      expect(sanitizeName('Song - Mix')).toBe('Song');
    });

    it('strips " - 1991 Remix"', () => {
      expect(sanitizeName('Little Saint Nick - 1991 Remix')).toBe('Little Saint Nick');
    });

    it('strips "(1991 Remix)"', () => {
      expect(sanitizeName('Little Saint Nick (1991 Remix)')).toBe('Little Saint Nick');
    });

    it('strips "(Album Mix)"', () => {
      expect(sanitizeName('Song (Album Mix)')).toBe('Song');
    });

    it('strips " - Album Mix"', () => {
      expect(sanitizeName('Song - Album Mix')).toBe('Song');
    });

    it('strips " - Club Remix"', () => {
      expect(sanitizeName('Song - Club Remix')).toBe('Song');
    });

    it('strips "(Club Remix)"', () => {
      expect(sanitizeName('Song (Club Remix)')).toBe('Song');
    });

    it('strips " - Extended Remix"', () => {
      expect(sanitizeName('Song - Extended Remix')).toBe('Song');
    });

    it('strips " - Dub Mix"', () => {
      expect(sanitizeName('Song - Dub Mix')).toBe('Song');
    });

    it('strips "(Hot Mix)"', () => {
      expect(sanitizeName('Song (Hot Mix)')).toBe('Song');
    });

    it('strips " - Someone Radio Edit"', () => {
      expect(sanitizeName('Prayer in C - Robin Schulz Radio Edit')).toBe('Prayer in C');
    });
  });

  // ── Case insensitivity ─────────────────────────────────────────────

  describe('case insensitivity', () => {
    it('strips uppercase " - REMASTERED"', () => {
      expect(sanitizeName('Song - REMASTERED')).toBe('Song');
    });

    it('strips mixed case "(remastered 2011)"', () => {
      expect(sanitizeName('Song (remastered 2011)')).toBe('Song');
    });

    it('strips "(DELUXE EDITION)"', () => {
      expect(sanitizeName('Album (DELUXE EDITION)')).toBe('Album');
    });

    it('strips " - radio edit" lowercase', () => {
      expect(sanitizeName('Song - radio edit')).toBe('Song');
    });

    it('strips "[LIVE AT WEMBLEY]"', () => {
      expect(sanitizeName('Song [LIVE AT WEMBLEY]')).toBe('Song');
    });
  });

  // ── No-op / passthrough cases ──────────────────────────────────────

  describe('passthrough (no stripping)', () => {
    it('returns normal track name unchanged', () => {
      expect(sanitizeName('Bohemian Rhapsody')).toBe('Bohemian Rhapsody');
    });

    it('returns name with parenthetical content that is not a suffix', () => {
      expect(sanitizeName('(Don\'t Fear) The Reaper')).toBe('(Don\'t Fear) The Reaper');
    });

    it('returns name with dash that is not a suffix', () => {
      expect(sanitizeName('Semi-Charmed Life')).toBe('Semi-Charmed Life');
    });

    it('returns name with " - " in the middle followed by non-suffix text', () => {
      expect(sanitizeName('Stop - Look - Listen')).toBe('Stop - Look - Listen');
    });

    it('preserves parenthesized non-suffix content', () => {
      expect(sanitizeName('Baba O\'Riley (from Tommy)')).toBe('Baba O\'Riley (from Tommy)');
    });

  });

  // ── Edge cases ─────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty string unchanged', () => {
      expect(sanitizeName('')).toBe('');
    });

    it('handles name with trailing whitespace', () => {
      expect(sanitizeName('Song - Remastered  ')).toBe('Song');
    });

    it('handles suffix-like word in the middle of a name', () => {
      expect(sanitizeName('Remastered Memories of You')).toBe('Remastered Memories of You');
    });

    it('handles name that contains "live" as part of a word', () => {
      expect(sanitizeName('Deliver Me')).toBe('Deliver Me');
    });

    it('handles name that contains "mono" as part of a word', () => {
      expect(sanitizeName('Monochrome')).toBe('Monochrome');
    });

    it('handles name that contains "demo" as part of a word', () => {
      expect(sanitizeName('Democracy')).toBe('Democracy');
    });

    it('handles special regex characters in the name', () => {
      expect(sanitizeName('What Is Life? (Remastered 2014)')).toBe('What Is Life?');
    });

    it('handles brackets and parens in normal name', () => {
      expect(sanitizeName('[#1 Record]')).toBe('[#1 Record]');
    });
  });

  // ── Real-world Last.fm examples ────────────────────────────────────

  describe('real-world Last.fm examples', () => {
    it('David Bowie - Life on Mars remaster', () => {
      expect(sanitizeName('Life on Mars? - 2015 Remaster')).toBe('Life on Mars?');
    });

    it('David Bowie - Space Oddity remaster', () => {
      expect(sanitizeName('Space Oddity - 2015 Remastered')).toBe('Space Oddity');
    });

    it('Radiohead - OK Computer deluxe album', () => {
      expect(sanitizeName('OK Computer (Deluxe Edition)')).toBe('OK Computer');
    });

    it('Pink Floyd - Dark Side remaster album', () => {
      expect(sanitizeName('The Dark Side of the Moon (Remastered)')).toBe('The Dark Side of the Moon');
    });

    it('Beatles - Abbey Road anniversary album', () => {
      expect(sanitizeName('Abbey Road (Super Deluxe Edition)')).toBe('Abbey Road');
    });

    it('Nirvana - Nevermind anniversary', () => {
      expect(sanitizeName('Nevermind (30th Anniversary Edition)')).toBe('Nevermind');
    });

    it('Queen - Bohemian Rhapsody remaster', () => {
      expect(sanitizeName('Bohemian Rhapsody - Remastered 2011')).toBe('Bohemian Rhapsody');
    });

    it('Fleetwood Mac - Dreams single version', () => {
      expect(sanitizeName('Dreams - Single Version')).toBe('Dreams');
    });

    it('Beatles - Revolution mono', () => {
      expect(sanitizeName('Revolution (Mono)')).toBe('Revolution');
    });

    it('Tears for Fears - Head Over Heels live', () => {
      expect(sanitizeName('Head Over Heels (Live at Massey Hall)')).toBe('Head Over Heels');
    });

    it('The Cure - Disintegration expanded album', () => {
      expect(sanitizeName('Disintegration (Expanded Edition)')).toBe('Disintegration');
    });

    it('Led Zeppelin - Stairway to Heaven remaster', () => {
      expect(sanitizeName('Stairway to Heaven - 2012 Remaster')).toBe('Stairway to Heaven');
    });

    it('Oasis - Definitely Maybe deluxe album', () => {
      expect(sanitizeName('Definitely Maybe (Deluxe Edition) (Remastered)')).toBe('Definitely Maybe');
    });

    it('Phil Collins - en-dash remastered', () => {
      expect(sanitizeName('I Wish It Would Rain Down \u2013 2016 Remastered')).toBe('I Wish It Would Rain Down');
    });

    it('Beatles - mono/remastered slash combo', () => {
      expect(sanitizeName('Come Together - Mono / Remastered')).toBe('Come Together');
    });

    it('Beatles - stereo mix with year', () => {
      expect(sanitizeName('Come Together - Stereo Mix 2017')).toBe('Come Together');
    });

    it('track with 2022 stereo mix', () => {
      expect(sanitizeName('A Day in the Life - 2022 Stereo Mix')).toBe('A Day in the Life');
    });

    it('track with year mix', () => {
      expect(sanitizeName('Strawberry Fields Forever - 2018 Mix')).toBe('Strawberry Fields Forever');
    });

    it('track with remix suffix', () => {
      expect(sanitizeName('Blue Monday - Remix')).toBe('Blue Monday');
    });

    it('Beach Boys - Little Saint Nick 1991 Remix', () => {
      expect(sanitizeName('Little Saint Nick - 1991 Remix')).toBe('Little Saint Nick');
    });

    it('track with digitally remastered', () => {
      expect(sanitizeName('Song - Digitally Remastered')).toBe('Song');
    });

    it('track with [2011 - Remaster]', () => {
      expect(sanitizeName('Song [2011 - Remaster]')).toBe('Song');
    });

    it('track with [Edit]', () => {
      expect(sanitizeName('Song [Edit]')).toBe('Song');
    });

    it('track with Album V', () => {
      expect(sanitizeName('Song (Album V)')).toBe('Song');
    });

    it('track with 2018 Remastering', () => {
      expect(sanitizeName('Song (2018 Digital Remastering)')).toBe('Song');
    });

    it('track from soundtrack', () => {
      expect(sanitizeName('Song - from Guardians of the Galaxy Soundtrack')).toBe('Song');
    });

    it('track with original version', () => {
      expect(sanitizeName('Song - Original Version')).toBe('Song');
    });

    it('track with (with Artist)', () => {
      expect(sanitizeName('Under Pressure (with David Bowie)')).toBe('Under Pressure');
    });

    it('track with (w/ Artist)', () => {
      expect(sanitizeName('Song (w/ Someone)')).toBe('Song');
    });
  });
});
