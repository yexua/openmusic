import { useEffect } from 'react';

export const SITE_NAME = 'OpenMusic';

export const DEFAULT_TITLE = 'OpenMusic - 多人实时在线点歌';
export const DEFAULT_DESCRIPTION =
  'OpenMusic 是多人实时在线点歌系统，支持网易云、QQ 音乐、酷狗搜索点歌，房间成员同步播放、歌词滚动、实时聊天与消息点评。';
export const DEFAULT_KEYWORDS =
  '在线点歌,多人听歌,同步播放,网易云,QQ音乐,酷狗,歌词同步,房间点歌,实时聊天,OpenMusic';

export interface PageSeoOptions {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
}

/** 优先使用当前访问域名；构建预渲染或本地开发可设置 VITE_SITE_URL */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';
}

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let el = document.head.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(origin: string) {
  const id = 'openmusic-json-ld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    ...(origin ? { url: `${origin}/` } : {}),
    applicationCategory: 'MusicApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    inLanguage: 'zh-CN',
  };

  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function buildPageTitle(pageTitle?: string) {
  if (!pageTitle) return DEFAULT_TITLE;
  if (pageTitle.includes(SITE_NAME)) return pageTitle;
  return `${pageTitle} - ${SITE_NAME}`;
}

export function applyPageSeo(options: PageSeoOptions = {}) {
  if (typeof document === 'undefined') return;

  const title = buildPageTitle(options.title);
  const description = options.description || DEFAULT_DESCRIPTION;
  const origin = getSiteOrigin();
  const path = options.path ?? window.location.pathname;
  const url = origin ? `${origin}${path}` : path;
  const image = options.image || (origin ? `${origin}/og-cover.png` : '/og-cover.png');
  const robots = options.noindex ? 'noindex, nofollow' : 'index, follow';

  document.title = title;
  upsertMeta('description', description);
  upsertMeta('keywords', DEFAULT_KEYWORDS);
  upsertMeta('robots', robots);

  if (origin) {
    upsertLink('canonical', url);
    upsertJsonLd(origin);
  }

  upsertMeta('og:title', title, 'property');
  upsertMeta('og:description', description, 'property');
  if (origin) upsertMeta('og:url', url, 'property');
  upsertMeta('og:image', image, 'property');
  upsertMeta('og:type', 'website', 'property');
  upsertMeta('og:locale', 'zh_CN', 'property');
  upsertMeta('og:site_name', SITE_NAME, 'property');

  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', title);
  upsertMeta('twitter:description', description);
  upsertMeta('twitter:image', image);
}

export function usePageSeo(options: PageSeoOptions) {
  const { title, description, path, image, noindex } = options;

  useEffect(() => {
    applyPageSeo({ title, description, path, image, noindex });
    return () => applyPageSeo();
  }, [title, description, path, image, noindex]);
}
