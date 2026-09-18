'use client';

import { useEffect } from 'react';
import { initializeDemoData } from '@/lib/demo-data';

export default function DataInitializer() {
  useEffect(() => {
    initializeDemoData().catch(console.error);
  }, []);

  return null;
}
