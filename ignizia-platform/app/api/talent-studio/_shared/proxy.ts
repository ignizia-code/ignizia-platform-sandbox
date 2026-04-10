import { NextRequest, NextResponse } from 'next/server';

const TALENT_PROXY_HEADER = 'x-talent-service-proxy';

function normalizeBaseUrl(rawBaseUrl: string): string {
  return rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
}

function getTalentServiceBaseUrl(): string | null {
  const raw = process.env.TALENT_SERVICE_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return normalizeBaseUrl(parsed.toString());
  } catch {
    console.warn('Invalid TALENT_SERVICE_BASE_URL. Falling back to local talent handlers.');
    return null;
  }
}

export async function maybeProxyTalentService(request: NextRequest): Promise<NextResponse | null> {
  const baseUrl = getTalentServiceBaseUrl();
  if (!baseUrl) return null;

  // Prevent proxy loops if this service forwards back here.
  if (request.headers.get(TALENT_PROXY_HEADER) === '1') return null;

  const forwardUrl = `${baseUrl}${request.nextUrl.pathname}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);
  headers.set(TALENT_PROXY_HEADER, '1');
  headers.delete('host');
  headers.delete('content-length');

  const response = await fetch(forwardUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    redirect: 'manual',
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function proxyTalentServiceOr503(request: NextRequest): Promise<NextResponse> {
  const proxied = await maybeProxyTalentService(request);
  if (proxied) return proxied;
  return NextResponse.json(
    {
      error: 'Talent service is not configured. Set TALENT_SERVICE_BASE_URL to route Talent write/CRUD operations.',
    },
    { status: 503 },
  );
}
