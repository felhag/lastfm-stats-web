/** Unicode-aware dash: hyphen, en-dash, em-dash */
const DASH = String.raw`[-–—]`;
const YEAR = String.raw`\d{4}`;
/**
 * A qualifier word: anything without whitespace or brackets, so `B-Front`, `Avicii's`, `7"`, `Hat/Soundtrack`
 * and non-ASCII names such as `Tiësto` all count as one word.
 */
const WORD = String.raw`[^\s()\[\]]+`;

/**
 * The suffixes to strip. After a dash or slash a word may not be a separator itself, otherwise
 * `Stop - Look - Listen Remix` would lose everything after the first dash instead of only `Listen Remix`.
 */
function suffixPattern(bracketed: boolean): string {
  const words = bracketed ? String.raw`(?:${WORD}\s+)*` : String.raw`(?:(?!${DASH}\s|/\s)${WORD}\s+)*`;
  return [
    // Remaster
    String.raw`(?:digital(?:ly)?\s+)?(?:${YEAR}\s*${DASH}?\s*)?(?:digital(?:ly)?\s+)?remaster(?:ed|ing)?(?:\s+${YEAR})?(?:\s+version)?`,
    // Remix / Mix
    String.raw`${words}remix(?:ed)?`,
    String.raw`(?:${YEAR}\s+)?${words}mix(?:\s+${YEAR})?`,
    // Deluxe
    String.raw`(?:super\s+)?deluxe(?:\s+(?:edition|version))?`,
    // Editions
    String.raw`(?:\d+\w*\s+)?anniversary\s+edition`,
    String.raw`special\s+edition`,
    String.raw`expanded\s+edition`,
    String.raw`collector'?s?\s+edition`,
    // Bonus
    String.raw`bonus(?:\s+tracks?)?`,
    // Versions / edits
    String.raw`album\s+v`,
    String.raw`original(?:\s+version)?`,
    String.raw`${words}version`,
    String.raw`${words}edit`,
    // Recording
    String.raw`(?:mono|stereo)(?:\s+version)?`,
    // Demo / Acoustic / Live
    String.raw`demo(?:\s+version)?`,
    String.raw`acoustic(?:\s+version)?`,
    String.raw`live(?:\s+(?:version|at|in|from|on|@)(?=[\s)\]]|$)[^()\[\]]*)?`,
    // Soundtrack
    String.raw`from\s+.*soundtrack`,
  ].join('|');
}

const OPEN = suffixPattern(false);
/** Inside brackets padding and a closing `!` or `.` are allowed: `( Original Mix )`, `(Bonus Track!)`. */
const BRACKETED = String.raw`\s*(?:${suffixPattern(true)})[!.]?\s*`;

/**
 * Matches a suffix after a separator at the end of a string.
 * Separators: ` - `, ` – `, ` — `, ` / `, `(...)`, `[...]`
 */
const FULL_PATTERN = new RegExp(
  `(?:\\s+${DASH}\\s+(?:${OPEN})|\\s+/\\s+(?:${OPEN})|\\s+\\(${BRACKETED}\\)|\\s+\\[${BRACKETED}\\])\\s*$`,
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

/**
 * The key under which spellings of the same artist are grouped: case, accents, hyphens, underscores, slashes and
 * dots are ignored, so `blink 182` / `blink-182`, `Beyonce` / `Beyoncé` and `AC/DC` / `ACDC` end up together.
 */
export function artistKey(artist: string): string {
  const lower = artist.toLowerCase();
  const key = lower
    .replace(/[à-å]/g, 'a')
    .replace(/[è-ë]/g, 'e')
    .replace(/[ì-ï]/g, 'i')
    .replace(/[ò-öø]/g, 'o')
    .replace(/[ù-ü]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/ç/g, 'c')
    .replace(/ñ/g, 'n')
    .replace(/[_-]/g, ' ')
    .replace(/[\/.]/g, '');
  // names made of nothing but punctuation (`...`, `-`) would otherwise all share one key
  return key.trim() ? key : lower;
}
