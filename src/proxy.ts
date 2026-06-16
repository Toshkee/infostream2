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

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocale) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|icon$|apple-icon$|.*\\..*).*)'],
};
