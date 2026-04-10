import { NextResponse } from 'next/server';
import { listPersonas } from '@/lib/personas';

export async function GET() {
  const personas = listPersonas();
  return NextResponse.json(personas);
}
