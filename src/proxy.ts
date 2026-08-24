import { NextResponse, type NextRequest } from 'next/server';

const locales = ['eng', 'mne'] as const;
const defaultLocale = 'eng';

// Code-based metadata icons emit at extension-less root URLs (`/icon`,
// `/apple-icon`) so the dotted-path matcher exclusion below can't catch them —
// list them here too so they never get a locale redirect into a 404.
const ROOT_ASSETS = new Set(['/icon', '/apple-icon']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (ROOT_ASSETS.has(pathname)) return;

  // Already locale-prefixed — nothing to do. (The 404 page used to need the
  // matched locale forwarded as a header; it now reads it from the URL on the
  // client so that reading a header can't cost the [lang] segment its static
  // render. See app/[lang]/not-found.tsx.)
  const hasLocalePrefix = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocalePrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
  // 308 permanent — the locale root is the canonical home; tells crawlers to
  // consolidate signals on /eng instead of treating the hop as temporary.
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|icon$|apple-icon$|.*\\..*).*)'],
};
