"use client";
import { useEffect, useState } from 'react';
import { PublicRoadmap } from './PublicRoadmap';
import { validRoadmap, validLaunchDate } from '@/lib/web51/validation';
import type { PublicRoadmapItem } from './public-roadmap';
import type { Language } from './locale';

export function LivePublicRoadmap({ language }: { language: Language }) {
  const [data, setData] = useState<{ items: PublicRoadmapItem[]; launchDate: string | null; source: 'database' } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/vector/community/roadmap', { cache: 'no-store', credentials: 'omit', signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const result = await response.json();
        if (result.ok && result.source === 'database' && validRoadmap(result.items)
          && validLaunchDate(result.launchDate))
          setData({ items: result.items as unknown as PublicRoadmapItem[], launchDate: result.launchDate, source: 'database' });
      }).catch(() => {});
    return () => controller.abort();
  }, []);
  return <PublicRoadmap language={language} {...(data || {})} />;
}
