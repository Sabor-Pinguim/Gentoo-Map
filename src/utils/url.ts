import DOMPurify from 'dompurify';

/** Validação e tratamento seguro de URLs e conteúdo externo. */

export function normalizeUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (/^www\./i.test(s)) s = `https://${s}`;
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(s) && /^[^\s/]+\.[^\s/]+/.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Retorna true apenas para URLs http(s) — bloqueia javascript:, data:, file: etc. */
export function isSafeHttpUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export type EmbedInfo =
  | { type: 'iframe'; provider: 'YouTube' | 'Vimeo'; src: string }
  | { type: 'video'; src: string }
  | { type: 'audio'; src: string }
  | { type: 'external'; src: string };

/**
 * Identifica como um vídeo/áudio externo pode ser exibido. Somente provedores que
 * oferecem players incorporáveis oficiais são usados em iframes (com sandbox);
 * demais endereços são oferecidos para abertura externa.
 */
export function detectEmbed(url: string): EmbedInfo {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { type: 'external', src: url };
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = /^\/(embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname);
      if (m) id = m[2];
    }
    if (id && /^[\w-]{6,20}$/.test(id)) {
      const t = u.searchParams.get('t') ?? u.searchParams.get('start');
      const start = t ? parseInt(t, 10) : 0;
      return {
        type: 'iframe',
        provider: 'YouTube',
        src: `https://www.youtube-nocookie.com/embed/${id}${start > 0 ? `?start=${start}` : ''}`,
      };
    }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = /\/(?:video\/)?(\d{5,12})/.exec(u.pathname);
    if (m) return { type: 'iframe', provider: 'Vimeo', src: `https://player.vimeo.com/video/${m[1]}` };
  }
  const path = u.pathname.toLowerCase();
  if (/\.(mp4|webm|ogv|m4v|mov)$/.test(path)) return { type: 'video', src: url };
  if (/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/.test(path)) return { type: 'audio', src: url };
  return { type: 'external', src: url };
}

/**
 * Sanitiza o HTML das anotações. O editor já restringe a estrutura, mas o HTML também
 * pode vir de importações — por isso é sempre limpo antes de ser usado.
 */
export function sanitizeNotesHtml(html: string): string {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'code', 'pre', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'mark', 'hr', 'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'data-color', 'class'],
    ALLOW_DATA_ATTR: false,
  });
  // Remove links com protocolos não permitidos.
  const tpl = document.createElement('template');
  tpl.innerHTML = clean;
  tpl.content.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (!isSafeHttpUrl(href) && !/^mailto:/i.test(href)) a.removeAttribute('href');
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer nofollow');
  });
  return tpl.innerHTML;
}

export function openExternal(url: string) {
  if (!isSafeHttpUrl(url)) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

