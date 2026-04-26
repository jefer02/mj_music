import type { TrackSourceType } from "../types/song";

interface SourceBadgeProps {
  sourceType: TrackSourceType;
}

export function SourceBadge({ sourceType }: SourceBadgeProps) {
  return (
    <span className={`source-badge source-badge--${sourceType.toLowerCase()}`}>
      {sourceType}
    </span>
  );
}
