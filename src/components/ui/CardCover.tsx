import React, { useState } from 'react';
import { CardEntry, NormalCardEntry } from '../../types';
import { useCardCover } from '../../hooks/useCardPayload';

type CoverCard = CardEntry | NormalCardEntry;
export interface CardCoverProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  card: CoverCard;
  fallback: React.ReactNode;
  thumbnail?: boolean;
}

/** Cover storage is independent of card summaries; never hydrate the entire list. */
export function CardCover({ card, fallback, thumbnail = true, onError, ...imageProps }: CardCoverProps) {
  const [failedThumbnail, setFailedThumbnail] = useState<CoverCard>();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const useThumbnail = thumbnail && failedThumbnail !== card;
  const url = useCardCover(card as CardEntry, useThumbnail);
  if (!url || url === failedUrl) return <>{fallback}</>;
  return <img loading="lazy" decoding="async" {...imageProps} src={url} onError={event => {
    setFailedUrl(url);
    if (useThumbnail) setFailedThumbnail(card);
    onError?.(event);
  }} />;
}
