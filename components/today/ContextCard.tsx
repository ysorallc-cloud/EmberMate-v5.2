// ============================================================================
// CONTEXT CARD - Main wrapper that switches between card states
// ============================================================================

import React from 'react';
import { ContextCardData } from '../../types/contextCard';
import { UpNextCard } from './UpNextCard';
import { CaughtUpCard } from './CaughtUpCard';
import { EndOfDayCard } from './EndOfDayCard';
import { EmptyCard } from './EmptyCard';

interface ContextCardProps {
  data: ContextCardData;
  careRecipientName: string;
}

export const ContextCard: React.FC<ContextCardProps> = ({
  data,
  careRecipientName,
}) => {
  switch (data.state) {
    case 'up-next':
      if (!data.upNext) return <EmptyCard />;
      return <UpNextCard data={data.upNext} />;

    case 'caught-up':
      return <CaughtUpCard />;

    case 'end-of-day':
      return <EndOfDayCard careRecipientName={careRecipientName} />;

    case 'empty':
    default:
      return <EmptyCard />;
  }
};
