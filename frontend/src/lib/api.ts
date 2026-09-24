// API client — mirrors client/js/api.js behavior exactly

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: unknown;

  constructor(msg: string, status: number, code?: string, fields?: unknown) {
    super(msg);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const opts: RequestInit = { ...options, credentials: 'same-origin' };
  if (opts.body != null && typeof opts.body !== 'string' && !(opts.body instanceof FormData)) {
    opts.headers = { ...opts.headers as Record<string,string>, 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, opts);
  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON */ }
  if (!res.ok) {
    const err = new ApiError(
      (data && (data as any).error?.message) || 'Request failed',
      res.status,
      (data && (data as any).error?.code) as string,
      (data && (data as any).error?.details) as unknown
    );
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Format money from cents
export function fmtMoney(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
  } catch (_) {
    return (cents / 100).toFixed(2) + ' ' + currency;
  }
}

// Format date/time
export function fmtDateTime(value: string): string {
  try { return new Date(value).toLocaleString(); } catch (_) { return String(value); }
}

// Query string param
export function qsParam(name: string): string | null {
  return new URLSearchParams(location.search).get(name);
}

// Debounce
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Toast notifications
let toastZone: HTMLElement | null = null;
export function toast(message: string, type?: 'success' | 'error') {
  if (!toastZone) {
    toastZone = document.createElement('div');
    toastZone.className = 'toast-zone';
    document.body.appendChild(toastZone);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'success' ? ' success' : type === 'error' ? ' error' : '');
  el.textContent = message;
  toastZone.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

// Escape HTML
export function esc(value: unknown): string {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Image compression (WebP, max 1200px)
export async function compressImage(file: File, opts?: { max?: number; quality?: number }): Promise<File> {
  if (!file || !/(image\/(jpeg|png|webp))/.test(file.type)) return file;
  const max = opts?.max || 1200;
  const quality = opts?.quality || 0.75;
  try {
    if (file.type === 'image/webp' && file.size <= 48 * 1024) return file;
    const img = await loadImage(file);
    if (!img?.width || !img?.height) return file;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', quality));
    if (blob && blob.size < file.size) return new File([blob], file.name, { type: 'image/webp' });
    return file;
  } catch (_) { return file; }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null as unknown as HTMLImageElement); };
    img.src = url;
  });
}

// Theme tokens — per-restaurant colors
export interface ThemeTokens {
  '--primary': string;
  '--secondary': string;
  '--primary-dark': string;
  '--primary-light': string;
  '--primary-soft': string;
  '--secondary-dark': string;
  '--secondary-soft': string;
  '--on-primary': string;
  '--on-secondary': string;
}

const DEFAULT_PRIMARY = '#e11d48';
const DEFAULT_SECONDARY = '#111827';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(c =>
    Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')
  ).join('');
}

function mix(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => v + (b[i] - v) * t);
}

function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastText(rgb: number[]): string {
  return luminance(rgb) > 0.5 ? '#111827' : '#ffffff';
}

export function buildThemeTokens(primaryColor?: string, secondaryColor?: string): ThemeTokens {
  const primary = hexToRgb(primaryColor || DEFAULT_PRIMARY) || hexToRgb(DEFAULT_PRIMARY)!;
  const secondary = hexToRgb(secondaryColor || DEFAULT_SECONDARY) || hexToRgb(DEFAULT_SECONDARY)!;
  return {
    '--primary': toHex(primary),
    '--secondary': toHex(secondary),
    '--primary-dark': toHex(mix(primary, [0, 0, 0], 0.22)),
    '--primary-light': toHex(mix(primary, [255, 255, 255], 0.88)),
    '--primary-soft': toHex(mix(primary, [255, 255, 255], 0.92)),
    '--secondary-dark': toHex(mix(secondary, [0, 0, 0], 0.25)),
    '--secondary-soft': toHex(mix(secondary, [255, 255, 255], 0.9)),
    '--on-primary': contrastText(primary),
    '--on-secondary': contrastText(secondary),
  };
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
