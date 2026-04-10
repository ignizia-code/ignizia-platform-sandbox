import type { SensitivityTag, ReviewCategory } from '../types';

export interface SensitivityResult {
  tag: SensitivityTag;
  categories: ReviewCategory[];
  detectedKeywords: string[];
}

// Sensitive: tight restrictions, mandatory review, no external data transfer
const SENSITIVE_KEYWORDS: Record<string, ReviewCategory[]> = {
  invoice: ['Finance'],
  payroll: ['Finance', 'HR'],
  contract: ['Legal'],
  pii: [],
  'social security': [],
  ssn: [],
  secret: [],
  confidential: [],
  password: [],
  credit: ['Finance'],
  bank: ['Finance'],
  salary: ['Finance', 'HR'],
  compensation: ['HR'],
};

// Internal: medium restrictions, internal AI only
const INTERNAL_KEYWORDS: Record<string, ReviewCategory[]> = {
  customer: ['Customer Facing'],
  client: ['Customer Facing'],
  email: ['Customer Facing'],
  vendor: ['Procurement'],
  supplier: ['Procurement'],
  order: ['Customer Facing'],
  shipment: ['Procurement'],
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function classifySensitivity(
  text: string,
  inputsOutputs?: string[]
): SensitivityResult | null {
  const combined = [text, ...(inputsOutputs || [])].join(' ');
  const normalized = normalizeText(combined);

  let highestTag: SensitivityTag = 'public';
  const categories = new Set<ReviewCategory>();
  const detectedKeywords: string[] = [];

  // Check sensitive first (highest priority)
  for (const [keyword, cats] of Object.entries(SENSITIVE_KEYWORDS)) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
    if (pattern.test(normalized)) {
      highestTag = 'sensitive';
      cats.forEach((c) => categories.add(c));
      detectedKeywords.push(keyword);
    }
  }

  // Check internal (only if not already sensitive)
  if (highestTag !== 'sensitive') {
    for (const [keyword, cats] of Object.entries(INTERNAL_KEYWORDS)) {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (pattern.test(normalized)) {
        highestTag = 'internal';
        cats.forEach((c) => categories.add(c));
        detectedKeywords.push(keyword);
      }
    }
  }

  if (highestTag === 'public' && detectedKeywords.length === 0) {
    return null;
  }

  return {
    tag: highestTag,
    categories: Array.from(categories),
    detectedKeywords,
  };
}
