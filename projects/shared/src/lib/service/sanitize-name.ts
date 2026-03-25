/** Unicode-aware dash: hyphen, en-dash, em-dash */
const DASH = String.raw`[-\u2013\u2014]`;
const YEAR = String.raw`\d{4}`;
const WORDS = String.raw`(?:\w+\s+)*`;

const SUFFIX_PATTERN = [
  // Remaster
  String.raw`(?:digital(?:ly)?\s+)?(?:${YEAR}\s*[-\u2013\u2014]?\s*)?(?:digital(?:ly)?\s+)?remaster(?:ed|ing)?(?:\s+${YEAR})?(?:\s+version)?`,
  // Remix / Mix
  String.raw`${WORDS}remix`,
  String.raw`(?:${YEAR}\s+)?${WORDS}mix(?:\s+${YEAR})?`,
  // Deluxe
  String.raw`(?:super\s+)?deluxe(?:\s+(?:edition|version))?`,
  // Editions
  String.raw`(?:\d+\w*\s+)?anniversary\s+edition`,
  String.raw`special\s+edition`,
  String.raw`expanded\s+edition`,
  String.raw`collector'?s?\s+edition`,
  // Bonus
  String.raw`bonus(?:\s+track)?`,
  // Versions / edits
  String.raw`album\s+v`,
  String.raw`original(?:\s+version)?`,
  String.raw`${WORDS}version`,
  String.raw`${WORDS}edit`,
  // Recording
  String.raw`(?:mono|stereo)(?:\s+version)?`,
  // Demo / Acoustic / Live
  String.raw`demo(?:\s+version)?`,
  String.raw`acoustic(?:\s+version)?`,
  String.raw`live(?:\s+(?:version|at|in|from)\b[\w\s]*)?\s*`,
  // Soundtrack
  String.raw`from\s+.*soundtrack`,
].join('|');

/**
 * Matches a suffix after a separator at the end of a string.
 * Separators: ` - `, ` – `, ` — `, ` / `, `(...)`, `[...]`
 */
const FULL_PATTERN = new RegExp(
  `(?:\\s+${DASH}\\s+(?:${SUFFIX_PATTERN})|\\s+/\\s+(?:${SUFFIX_PATTERN})|\\s+\\((?:${SUFFIX_PATTERN})\\)|\\s+\\[(?:${SUFFIX_PATTERN})\\])\\s*$`,
  'i'
);

/** Matches feat/ft/featuring/with/w/ in parentheses, brackets, or after a dash. */
const FEAT_PATTERN = new RegExp(
  [
    `\\s+\\((?:feat\\.?|ft\\.?|featuring|with|w/)\\s+[^)]+\\)`,
    `\\s+\\[(?:feat\\.?|ft\\.?|featuring|with|w/)\\s+[^\\]]+\\]`,
    `\\s+${DASH}\\s+(?:feat\\.?|ft\\.?|featuring)\\s+.+`,
  ].join('|') + '\\s*$',
  'i'
);

/**
 * Strips remaster, edition, remix, mix, version, and featuring suffixes from a name.
 * Applied repeatedly to handle stacked suffixes.
 */
export function sanitizeName(name: string): string {
  let result = name;
  let prev: string;
  do {
    prev = result;
    result = result.replace(FULL_PATTERN, '').replace(FEAT_PATTERN, '').trim();
  } while (result !== prev);
  return result;
}
