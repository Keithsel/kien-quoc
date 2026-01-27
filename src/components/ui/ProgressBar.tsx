/**
 * ProgressBar Component
 *
 * Reusable progress bar with consistent styling.
 * Used for indices, resources, project progress, etc.
 */

export interface ProgressBarProps {
  /** Current value (0-max) */
  value: number;
  /** Maximum value */
  max: number;
  /** Color preset or custom class */
  color?: 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'emerald' | 'orange' | 'gradient' | string;
  /** Height preset */
  size?: 'xs' | 'sm' | 'md';
  /** Animate width changes */
  animated?: boolean;
  /** Show danger state when below threshold */
  dangerThreshold?: number;
  class?: string;
}

const colorClasses: Record<string, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  gradient: 'bg-linear-to-r from-red-500 to-amber-500'
};

const sizeClasses = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5'
};

export default function ProgressBar(props: ProgressBarProps) {
  const percentage = () => Math.min(100, Math.max(0, (props.value / props.max) * 100));

  const isDanger = () => props.dangerThreshold !== undefined && props.value <= props.dangerThreshold;

  const barColor = () => {
    if (isDanger()) return 'bg-red-500';
    const color = props.color ?? 'gradient';
    return colorClasses[color] ?? color;
  };

  const sizeClass = sizeClasses[props.size ?? 'sm'];
  const animationClass = props.animated !== false ? 'transition-all duration-500' : '';

  return (
    <div class={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClass} ${props.class ?? ''}`}>
      <div class={`h-full rounded-full ${barColor()} ${animationClass}`} style={{ width: `${percentage()}%` }} />
    </div>
  );
}
