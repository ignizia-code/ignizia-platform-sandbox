import 'server-only';

const ONET_PRIMARY_BASE_URL: string = 'https://api.v2.onetcenter.org';
const ONET_FALLBACK_BASE_URL: string = 'https://api-v2.onetcenter.org';
const ONET_MAX_PAGE_SIZE = 2000;

type OnetRow = Record<string, unknown>;

type OnetRowsResponse = {
  start?: unknown;
  end?: unknown;
  total?: unknown;
  next?: unknown;
  row?: unknown;
  error?: unknown;
};

export class OnetDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnetDatabaseError';
  }
}

export type OnetTableScanResult = {
  tableId: string;
  totalRowsScanned: number;
  rows: OnetRow[];
};

export type OnetUniqueColumnValuesResult = {
  tableId: string;
  totalRowsScanned: number;
  uniqueValues: string[];
};

type FetchTableOptions = {
  start?: number;
  end?: number;
  filters?: string[];
  sorts?: string[];
};

function getOnetApiKey(): string {
  const apiKey = process.env.ONET_API_KEY;

  if (!apiKey) {
    throw new OnetDatabaseError(
      'Missing ONET_API_KEY. Add ONET_API_KEY to .env.local before opening this page.'
    );
  }

  return apiKey;
}

function buildInitialTableUrl(baseUrl: string, tableId: string, options?: FetchTableOptions): string {
  const start = options?.start ?? 1;
  const end = options?.end ?? ONET_MAX_PAGE_SIZE;
  const query = new URLSearchParams();
  query.set('start', String(start));
  query.set('end', String(end));
  for (const filter of options?.filters ?? []) {
    query.append('filter', filter);
  }
  for (const sort of options?.sorts ?? []) {
    query.append('sort', sort);
  }
  return `${baseUrl.replace(/\/$/, '')}/database/rows/${encodeURIComponent(tableId)}?${query.toString()}`;
}

function toAbsoluteUrl(baseUrl: string, maybeAbsoluteOrRelativeUrl: string): string {
  if (/^https?:\/\//i.test(maybeAbsoluteOrRelativeUrl)) {
    return maybeAbsoluteOrRelativeUrl;
  }

  return `${baseUrl.replace(/\/$/, '')}/${maybeAbsoluteOrRelativeUrl.replace(/^\//, '')}`;
}

async function requestRowsPage(url: string, apiKey: string): Promise<OnetRowsResponse> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new OnetDatabaseError(`Unexpected non-JSON response from O*NET (${response.status}).`);
  }

  if (!response.ok) {
    const apiError =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : 'Unknown API error';

    throw new OnetDatabaseError(`O*NET request failed (${response.status}): ${apiError}`);
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new OnetDatabaseError('Unexpected O*NET response shape: payload is not an object.');
  }

  return payload as OnetRowsResponse;
}

function parseRowsPage(payload: OnetRowsResponse): { rows: OnetRow[]; nextUrl: string | null } {
  if (!Array.isArray(payload.row)) {
    throw new OnetDatabaseError('Unexpected O*NET response shape: missing "row" array.');
  }

  const rows = payload.row.filter((item): item is OnetRow => {
    return typeof item === 'object' && item !== null;
  });

  const hasDroppedInvalidRows = rows.length !== payload.row.length;
  if (hasDroppedInvalidRows) {
    throw new OnetDatabaseError('Unexpected O*NET response shape: some rows are not objects.');
  }

  const nextUrl = typeof payload.next === 'string' && payload.next.length > 0 ? payload.next : null;
  return { rows, nextUrl };
}

async function scanTableWithBaseUrl(
  baseUrl: string,
  tableId: string,
  apiKey: string,
  options?: FetchTableOptions
): Promise<OnetTableScanResult> {
  const allRows: OnetRow[] = [];
  let nextUrl: string | null = buildInitialTableUrl(baseUrl, tableId, options);
  let safetyCounter = 0;

  while (nextUrl) {
    safetyCounter += 1;
    if (safetyCounter > 2000) {
      throw new OnetDatabaseError('Pagination safety limit reached while scanning O*NET table.');
    }

    const pagePayload = await requestRowsPage(nextUrl, apiKey);
    const parsedPage = parseRowsPage(pagePayload);
    allRows.push(...parsedPage.rows);
    nextUrl = parsedPage.nextUrl ? toAbsoluteUrl(baseUrl, parsedPage.nextUrl) : null;
  }

  return {
    tableId,
    totalRowsScanned: allRows.length,
    rows: allRows,
  };
}

export async function fetchAllRowsForTable(
  tableId: string,
  options?: FetchTableOptions
): Promise<OnetTableScanResult> {
  const apiKey = getOnetApiKey();

  try {
    return await scanTableWithBaseUrl(ONET_PRIMARY_BASE_URL, tableId, apiKey, options);
  } catch (primaryError) {
    // Keep this test flow resilient if a project uses api-v2 hostname.
    if (ONET_PRIMARY_BASE_URL === ONET_FALLBACK_BASE_URL) {
      throw primaryError;
    }

    try {
      return await scanTableWithBaseUrl(ONET_FALLBACK_BASE_URL, tableId, apiKey, options);
    } catch (fallbackError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new OnetDatabaseError(
        `Failed to read O*NET table "${tableId}" from both base URLs. Primary error: ${primaryMessage}. Fallback error: ${fallbackMessage}`
      );
    }
  }
}

export async function fetchUniqueColumnValuesForTable(
  tableId: string,
  columnId: string
): Promise<OnetUniqueColumnValuesResult> {
  const scanResult = await fetchAllRowsForTable(tableId);
  const uniqueValues = new Set<string>();

  for (const row of scanResult.rows) {
    const value = row[columnId];
    if (typeof value === 'string' && value.trim().length > 0) {
      uniqueValues.add(value.trim());
    }
  }

  return {
    tableId: scanResult.tableId,
    totalRowsScanned: scanResult.totalRowsScanned,
    uniqueValues: [...uniqueValues].sort((a, b) => a.localeCompare(b)),
  };
}
