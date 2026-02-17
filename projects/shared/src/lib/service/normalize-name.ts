/**
 * Regex pattern matching remaster/edition/version suffixes.
 *
 * Matches these categories (case-insensitive):
 * - Remaster:    "Remaster", "Remastered", "Remastering", "2007 Remaster",
 *                "Remastered 2011", "2011 - Remaster", "Digitally Remastered"
 * - Remix/Mix:   "Remix", "1991 Remix", "Club Remix", "2018 Mix",
 *                "Stereo Mix 2017", "2022 Stereo Mix", "Album Mix"
 * - Deluxe:      "Deluxe", "Deluxe Edition", "Deluxe Version", "Super Deluxe"
 * - Editions:    "Special Edition", "Anniversary Edition", "25th Anniversary Edition",
 *                "Expanded Edition", "Collector's Edition"
 * - Bonus:       "Bonus Track", "Bonus"
 * - Versions:    "Single Version", "Extended Edit", "Radio Edit", "Radio Mix",
 *                "Album Version", "Album V", "Original Version", "Edit",
 *                "Xxxx Version", "Xxxx Edit", "Xxxx Mix", "Xxxx Remix"
 * - Recording:   "Mono", "Mono Version", "Stereo", "Stereo Version"
 * - Demo:        "Demo", "Demo Version"
 * - Acoustic:    "Acoustic", "Acoustic Version"
 * - Live:        "Live", "Live Version", "Live at ..."
 * - Soundtrack:  "from X Soundtrack"
 * - Featuring:   "(feat. ...)", "[feat. ...]", "- feat. ...",
 *                "(with ...)", "[with ...]", "(w/ ...)"
 *
 * Separators: ` - `, ` – ` (en-dash), ` — ` (em-dash), ` / `, `(...)`, `[...]`
 */

/** Unicode-aware dash: hyphen, en-dash, em-dash */
const DASH = String.raw`[-\u2013\u2014]`;

const SUFFIX_PATTERN = [
  // Remaster variants (including "Digitally Remastered", "2011 - Remaster", "Remastering")
  String.raw`(?:digital(?:ly)?\s+)?(?:\d{4}\s*[-\u2013\u2014]?\s*)?(?:digital(?:ly)?\s+)?remaster(?:ed|ing)?(?:\s+\d{4})?(?:\s+version)?`,
  // Remix / Mix variants (including "1991 Remix", "Club Remix", "Album Mix")
  String.raw`(?:\w+\s+)?remix`,
  String.raw`(?:\d{4}\s+)?(?:\w+\s+)?mix(?:\s+\d{4})?`,
  // Deluxe variants
  String.raw`(?:super\s+)?deluxe(?:\s+(?:edition|version))?`,
  // Named editions
  String.raw`(?:\d+\w*\s+)?anniversary\s+edition`,
  String.raw`special\s+edition`,
  String.raw`expanded\s+edition`,
  String.raw`collector'?s?\s+edition`,
  // Bonus
  String.raw`bonus(?:\s+track)?`,
  // Versions / edits (including "Extended Edit", "Alternate Version")
  String.raw`album\s+v`,
  String.raw`original(?:\s+version)?`,
  String.raw`(?:\w+\s+)?version`,
  String.raw`(?:\w+\s+)?edit`,
  // Recording variants
  String.raw`(?:mono|stereo)(?:\s+version)?`,
  // Demo
  String.raw`demo(?:\s+version)?`,
  // Acoustic
  String.raw`acoustic(?:\s+version)?`,
  // Live
  String.raw`live(?:\s+(?:version|at|in|from)\b[\w\s]*)?\s*`,
  // Soundtrack
  String.raw`from\s+.*soundtrack`,
].join('|');

/**
 * Matches a suffix in one of four positions at the end of a string:
 * 1. ` - <suffix>`  or  ` – <suffix>`  or  ` — <suffix>`  (dash-separated)
 * 2. ` / <suffix>`     (slash-separated)
 * 3. ` (<suffix>)`     (parenthesized)
 * 4. ` [<suffix>]`     (bracketed)
 */
const FULL_PATTERN = new RegExp(
  `(?:\\s+${DASH}\\s+(?:${SUFFIX_PATTERN})|\\s+/\\s+(?:${SUFFIX_PATTERN})|\\s+\\((?:${SUFFIX_PATTERN})\\)|\\s+\\[(?:${SUFFIX_PATTERN})\\])\\s*$`,
  'i'
);

/**
 * Matches feat/ft/featuring/with/w/ in parentheses, brackets,
 * or after a dash at end of string.
 */
const FEAT_PATTERN = new RegExp(
  [
    `\\s+\\((?:feat\\.?|ft\\.?|featuring|with|w/)\\s+[^)]+\\)`,
    `\\s+\\[(?:feat\\.?|ft\\.?|featuring|with|w/)\\s+[^\\]]+\\]`,
    `\\s+${DASH}\\s+(?:feat\\.?|ft\\.?|featuring)\\s+.+`,
  ].join('|') + '\\s*$',
  'i'
);

/**
 * Strips remaster, edition, remix, mix, and version suffixes from a track or album name.
 *
 * Applied repeatedly to handle stacked suffixes
 * (e.g. "Song - Remastered (Deluxe Edition)" -> "Song").
 */
export function normalizeName(name: string): string {
  let result = name;
  let prev: string;
  do {
    prev = result;
    result = result.replace(FULL_PATTERN, '').replace(FEAT_PATTERN, '').trim();
  } while (result !== prev);
  return result;
}
