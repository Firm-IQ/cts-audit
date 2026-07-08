'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

export default function PrintTrigger() {
  const router = useRouter();

  useEffect(() => {
    // Wait a brief moment for styles and layout to stabilize, then open dialog
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-slate-300 hover:text-white"
      >
        <ArrowLeft size={14} /> Back
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => window.print()}
        className="flex items-center gap-1.5"
      >
        <Printer size={14} /> Print Report
      </Button>
    </>
  );
}
