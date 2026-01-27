/**
 * Badge Component
 *
 * Small badge/pill for status, ranks, labels, etc.
 */

import type { JSX } from 'solid-js';

export interface BadgeProps {
  children: JSX.Element;
  /** Color variant */
  variant?: 'gray' | 'red' | 'green' | 'amber' | 'blue' | 'purple' | 'gold' | 'silver' | 'bronze';
  /** Size */
  size?: 'xs' | 'sm' | 'md';
  /** Make it round (for ranks) */
  round?: boolean;
  class?: string;
}

const variantClasses: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-600',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  // Special ranks
  gold: 'bg-amber-400 text-amber-900 shadow-sm',
  silver: 'bg-gray-300 text-gray-700',
  bronze: 'bg-amber-700 text-amber-100'
};

const sizeClasses = {
  xs: 'text-xs px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1'
};

const roundSizes = {
  xs: 'w-5 h-5 text-xs',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm'
};

export default function Badge(props: BadgeProps) {
  const variant = props.variant ?? 'gray';
  const size = props.size ?? 'sm';

  const baseClasses = 'inline-flex items-center justify-center font-medium';
  const variantClass = variantClasses[variant];

  if (props.round) {
    return (
      <span class={`${baseClasses} ${variantClass} ${roundSizes[size]} rounded-full ${props.class ?? ''}`}>
        {props.children}
      </span>
    );
  }

  return (
    <span class={`${baseClasses} ${variantClass} ${sizeClasses[size]} rounded ${props.class ?? ''}`}>
      {props.children}
    </span>
  );
}

// Convenience component for rank badges (1st, 2nd, 3rd, etc.)
export interface RankBadgeProps {
  rank: number;
  size?: 'xs' | 'sm' | 'md';
  class?: string;
}

export function RankBadge(props: RankBadgeProps) {
  const variant = () => {
    if (props.rank === 1) return 'gold';
    if (props.rank === 2) return 'silver';
    if (props.rank === 3) return 'bronze';
    return 'gray';
  };

  return (
    <Badge variant={variant()} size={props.size} round class={props.class}>
      {props.rank}
    </Badge>
  );
}
