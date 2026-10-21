'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChatWidget } from './ChatWidget';

export const GlobalChatWidget: React.FC = () => {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Don't render storefront customer chatbot on Admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <ChatWidget />;
};
