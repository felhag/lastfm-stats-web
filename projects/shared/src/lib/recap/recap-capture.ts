import { canvasToBlob } from './recap-card';

const WIDTH = 1080;
const HEIGHT = 1920;
/** Time for a slide's charts and count-ups to finish animating. */
const SETTLE = 1800;

export function canCaptureSlides(): boolean {
  return !!navigator.mediaDevices?.getDisplayMedia;
}

/**
 * Screenshots every slide by recording the tab, like the race chart does: rasterizing the DOM ourselves would need
 * an extra dependency, and drawing every slide by hand would drift from the page. While capturing, the host is
 * narrowed to a 9:16 frame (see `.capturing`), so every image can be posted as a story as-is.
 */
export async function captureSlides(host: HTMLElement, slides: HTMLElement[], capturing: (on: boolean) => void): Promise<Blob[]> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {displaySurface: 'browser'},
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
  } as DisplayMediaStreamOptions);
  const video = document.createElement('video');
  video.muted = true;
  video.srcObject = stream;
  try {
    await video.play();
    capturing(true);
    // the sharing banner can resize the tab right after the capture starts
    await delay(500);
    const images: Blob[] = [];
    for (const slide of slides) {
      if (stream.getVideoTracks()[0].readyState === 'ended') {
        break; // the user stopped sharing
      }
      slide.scrollIntoView({behavior: 'instant', block: 'start'});
      // charts only start rendering once they're scrolled into view, wait for them before letting them animate
      await until(() => [...slide.querySelectorAll('.chart')].every(chart => chart.querySelector('svg')), 3000);
      await delay(SETTLE);
      // A slide taller than the story (like the favourites, with its three lists) is scaled down to fit in it. Only
      // measured now: charts are rendered once they're scrolled into view, before that they don't take up space.
      const fit = host.clientHeight / slide.offsetHeight;
      if (fit < 1) {
        slide.style.zoom = String(fit);
        // zoomed, the lists can fit next to each other: fill up the story again instead of showing the next slide
        slide.style.minHeight = `${host.clientHeight / fit}px`;
        slide.scrollIntoView({behavior: 'instant', block: 'start'});
        await delay(300);
      }
      images.push(await canvasToBlob(crop(await frame(stream, video), host.getBoundingClientRect())));
      slide.style.zoom = slide.style.minHeight = '';
    }
    return images;
  } finally {
    stream.getTracks().forEach(track => track.stop());
    capturing(false);
  }
}

/** Cuts the host out of the captured tab, which is in device pixels instead of CSS pixels. */
function crop(frame: ImageBitmap | HTMLVideoElement, rect: DOMRect): HTMLCanvasElement {
  const x = ('videoWidth' in frame ? frame.videoWidth : frame.width) / innerWidth;
  const y = ('videoHeight' in frame ? frame.videoHeight : frame.height) / innerHeight;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(frame, rect.left * x, rect.top * y, rect.width * x, rect.height * y, 0, 0, WIDTH, HEIGHT);
  return canvas;
}

/**
 * The current frame of the tab. A video element that isn't on the page isn't kept up to date: it can still show the
 * slide from before its chart was rendered. Where possible the frame is taken from the stream itself instead.
 */
async function frame(stream: MediaStream, video: HTMLVideoElement): Promise<ImageBitmap | HTMLVideoElement> {
  if (typeof ImageCapture !== 'undefined') {
    try {
      return await new ImageCapture(stream.getVideoTracks()[0]).grabFrame();
    } catch {
      // fall back to the video
    }
  }
  return video;
}

async function until(condition: () => boolean, timeout: number): Promise<void> {
  const end = performance.now() + timeout;
  while (!condition() && performance.now() < end) {
    await delay(50);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
