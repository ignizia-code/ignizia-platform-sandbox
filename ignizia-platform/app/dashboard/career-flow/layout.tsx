'use client';

import { CareerProvider } from '@/lib/career-flow/context/CareerContext';

export default function CareerFlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CareerProvider>{children}</CareerProvider>;
}
