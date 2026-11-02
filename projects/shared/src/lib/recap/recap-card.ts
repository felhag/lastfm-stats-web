import { Recap, RecapItem } from './recap';

export interface RecapCardLabels {
  username: string;
  /** Plural noun, e.g. 'scrobbles' or 'plays'. */
  noun: string;
  site: string;
}

const WIDTH = 1080;
const HEIGHT = 1920;
const PADDING = 96;
const FONT = 'Roboto, "Helvetica Neue", sans-serif';

/**
 * Draws the shareable recap card in story format (9:16), so it can be posted as-is on
 * Instagram/WhatsApp/etc. Drawn manually instead of rasterizing DOM to avoid extra dependencies.
 */
export async function drawRecapCard(recap: Recap, labels: RecapCardLabels): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#1a237e');
  bg.addColorStop(0.55, '#6a1b9a');
  bg.addColorStop(1, '#d81b60');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Decorative circles
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#fff';
  circle(ctx, WIDTH - 80, 260, 320);
  circle(ctx, 60, HEIGHT - 220, 260);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';

  let y = PADDING + 60;
  text(ctx, `${labels.username}'s`, PADDING, y, 300, 56);
  y += 150;
  text(ctx, `${recap.year} recap`, PADDING, y, 500, 140);

  y += 230;
  text(ctx, recap.total.toLocaleString(), PADDING, y, 500, 180);
  y += 70;
  text(ctx, `${labels.noun}${recap.ongoing ? ' so far' : ''}`, PADDING, y, 400, 52, 0.85);

  y += 150;
  const colWidth = (WIDTH - PADDING * 3) / 2;
  list(ctx, 'Top artists', recap.topArtists, PADDING, y, colWidth);
  list(ctx, 'Top tracks', recap.topTracks, PADDING * 2 + colWidth, y, colWidth);

  y += 720;
  const stats: [string, string][] = [
    [String(recap.daysListened), 'days listened'],
    [String(recap.newArtists), 'new artists'],
    [String(recap.longestStreak?.length ?? 0), 'day streak'],
  ];
  const statWidth = (WIDTH - PADDING * 2) / stats.length;
  stats.forEach(([value, label], i) => {
    const x = PADDING + statWidth * i;
    text(ctx, value, x, y, 500, 96);
    text(ctx, label, x, y + 56, 400, 40, 0.85);
  });

  text(ctx, labels.site, PADDING, HEIGHT - PADDING, 500, 44, 0.75);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject('Could not render image'), 'image/png'));
}

function list(ctx: CanvasRenderingContext2D, title: string, items: RecapItem[], x: number, y: number, width: number): void {
  text(ctx, title.toUpperCase(), x, y, 500, 36, 0.75);
  items.forEach((item, i) => {
    const top = y + 90 + i * 125;
    text(ctx, `${i + 1}`, x, top, 500, 52, 0.6);
    text(ctx, item.name, x + 56, top, 500, 44, 1, width - 56);
    if (item.sub) {
      text(ctx, item.sub, x + 56, top + 44, 300, 32, 0.75, width - 56);
    }
  });
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, weight: number, size: number, alpha = 1, maxWidth?: number): void {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.globalAlpha = alpha;
  ctx.fillText(maxWidth ? ellipsis(ctx, value, maxWidth) : value, x, y);
  ctx.globalAlpha = 1;
}

function ellipsis(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (ctx.measureText(value).width <= maxWidth) {
    return value;
  }
  let end = value.length;
  while (end > 0 && ctx.measureText(value.slice(0, end) + '…').width > maxWidth) {
    end--;
  }
  return value.slice(0, end) + '…';
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
