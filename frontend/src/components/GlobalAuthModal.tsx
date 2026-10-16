'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';

export const GlobalAuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isAuthModalOpen) return null;

  return (
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      onSuccess={closeAuthModal}
    />
  );
};
