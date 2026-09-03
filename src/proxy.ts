import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/lib/locales';

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

// `_next/` and `api/` carry a trailing slash on purpose. Without it the
// lookahead also matches any path merely STARTING with those letters, so
// /apiary or /_nextfoo skipped the redirect, reached [lang] with an invalid
// locale and got Next's bare built-in 404 instead of the branded one — the
// root layout calls notFound(), which [lang]/not-found.tsx can't render from
// inside. Dotted paths stay excluded deliberately: /robots.txt, /sitemap.xml
// and /manifest.webmanifest are real root routes and must not be redirected.
export const config = {
  matcher: ['/((?!_next/|api/|favicon.ico|icon$|apple-icon$|.*\\..*).*)'],
};
