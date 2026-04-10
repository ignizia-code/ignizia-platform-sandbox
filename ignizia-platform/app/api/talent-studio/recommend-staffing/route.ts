import { NextRequest } from 'next/server';
import { proxyTalentServiceOr503 } from '@/app/api/talent-studio/_shared/proxy';

export async function POST(request: NextRequest) {
  return proxyTalentServiceOr503(request);
}
