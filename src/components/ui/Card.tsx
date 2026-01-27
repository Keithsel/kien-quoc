/**
 * Card Component
 *
 * Reusable card container with consistent styling across the app.
 * Provides a unified look for all panels and containers.
 */

import type { JSX } from 'solid-js';

export interface CardProps {
  children: JSX.Element;
  class?: string;
  /** Add glass morphism effect */
  glass?: boolean;
  /** Add hover effect */
  hoverable?: boolean;
  /** Card padding size */
  padding?: 'sm' | 'md' | 'lg';
  /** Make card clickable */
  onClick?: () => void;
}

const paddingClasses = {
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6'
};

export default function Card(props: CardProps) {
  const baseClasses = 'rounded-xl shadow-sm transition-all';
  const bgClasses = props.glass ? 'bg-white/95 backdrop-blur-sm' : 'bg-white';
  const hoverClasses = props.hoverable || props.onClick ? 'hover:shadow-md cursor-pointer' : '';
  const paddingClass = paddingClasses[props.padding ?? 'md'];

  const Component = props.onClick ? 'button' : 'div';

  return (
    <Component
      class={`${baseClasses} ${bgClasses} ${hoverClasses} ${paddingClass} ${props.class ?? ''}`}
      onClick={props.onClick}
    >
      {props.children}
    </Component>
  );
}
