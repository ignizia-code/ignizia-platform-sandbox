import { NextRequest } from 'next/server';
import { proxyTalentServiceOr503 } from '@/app/api/talent-studio/_shared/proxy';

export async function GET(request: NextRequest) {
  return proxyTalentServiceOr503(request);
}

export async function PATCH(request: NextRequest) {
  return proxyTalentServiceOr503(request);
}

export async function DELETE(request: NextRequest) {
  return proxyTalentServiceOr503(request);
}
