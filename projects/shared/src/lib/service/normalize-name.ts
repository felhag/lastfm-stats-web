/**
 * Regex pattern matching remaster/edition/version suffixes.
 *
 * Matches these categories (case-insensitive):
 * - Remaster:    "Remaster", "Remastered", "2007 Remaster", "Remastered 2011", "2011 Remastered Version"
 * - Remix/Mix:   "Remix", "2018 Mix", "Stereo Mix 2017", "2022 Stereo Mix"
 * - Deluxe:      "Deluxe", "Deluxe Edition", "Deluxe Version", "Super Deluxe"
 * - Editions:    "Special Edition", "Anniversary Edition", "25th Anniversary Edition",
 *                "Expanded Edition", "Collector's Edition"
 * - Bonus:       "Bonus Track", "Bonus"
 * - Versions:    "Single Version", "Single Edit", "Radio Edit", "Radio Mix", "Album Version"
 * - Recording:   "Mono", "Mono Version", "Stereo", "Stereo Version"
 * - Demo:        "Demo", "Demo Version"
 * - Acoustic:    "Acoustic", "Acoustic Version"
 * - Live:        "Live", "Live Version", "Live at ..."
 * - Featuring:   "(feat. ...)", "(ft. ...)", "- feat. ..."
 *
 * Separators: ` - `, ` – ` (en-dash), ` — ` (em-dash), ` / `, `(...)`, `[...]`
 */

/** Unicode-aware dash: hyphen, en-dash, em-dash */
const DASH = String.raw`[-\u2013\u2014]`;

const SUFFIX_PATTERN = [
  // Remaster variants
  String.raw`(?:\d{4}\s+)?remaster(?:ed)?(?:\s+\d{4})?(?:\s+version)?`,
  // Remix / Mix variants
  String.raw`remix`,
  String.raw`(?:\d{4}\s+)?(?:(?:stereo|mono)\s+)?mix(?:\s+\d{4})?`,
  // Deluxe variants
  String.raw`(?:super\s+)?deluxe(?:\s+(?:edition|version))?`,
  // Named editions
  String.raw`(?:\d+\w*\s+)?anniversary\s+edition`,
  String.raw`special\s+edition`,
  String.raw`expanded\s+edition`,
  String.raw`collector'?s?\s+edition`,
  // Bonus
  String.raw`bonus(?:\s+track)?`,
  // Single / radio / album versions
  String.raw`single\s+(?:version|edit)`,
  String.raw`radio\s+(?:edit|mix)`,
  String.raw`album\s+version`,
  // Recording variants
  String.raw`(?:mono|stereo)(?:\s+version)?`,
  // Demo
  String.raw`demo(?:\s+version)?`,
  // Acoustic
  String.raw`acoustic(?:\s+version)?`,
  // Live
  String.raw`live(?:\s+(?:version|at|in|from)\b[\w\s]*)?\s*`,
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

/** Matches feat/ft/featuring in parentheses or after a dash/en-dash/em-dash at end of string. */
const FEAT_PATTERN = new RegExp(
  `(?:\\s+\\((?:feat\\.?|ft\\.?|featuring)\\s+[^)]+\\)|\\s+${DASH}\\s+(?:feat\\.?|ft\\.?|featuring)\\s+.+)\\s*$`,
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
