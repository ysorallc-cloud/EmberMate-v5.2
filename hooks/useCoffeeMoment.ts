import { useState, useCallback, useEffect, useRef } from 'react';

const OVERDUE_THRESHOLD = 3;

export function useCoffeeMoment(overdueCount: number, hasLateMedication: boolean) {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (dismissedRef.current) return;
    const shouldShow = overdueCount >= OVERDUE_THRESHOLD || hasLateMedication;
    setShowBanner(shouldShow);
  }, [overdueCount, hasLateMedication]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    dismissedRef.current = true;
  }, []);

  const startReset = useCallback(() => {
    setShowBanner(false);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    dismissedRef.current = true;
  }, []);

  return { showBanner, showModal, startReset, dismissBanner, closeModal };
}
