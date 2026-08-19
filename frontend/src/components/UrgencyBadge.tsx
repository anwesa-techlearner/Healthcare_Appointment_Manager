/**
 * SPEC §8.8 — Urgency badge color system doctors can scan at a glance.
 * Low=green, Medium=amber, High=red, Unknown=gray
 */
interface UrgencyBadgeProps {
  level: 'Low' | 'Medium' | 'High' | 'Unknown';
  size?: 'sm' | 'md' | 'lg';
}

const colorMap = {
  Low: 'bg-green-100 text-green-800 border-green-300',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300',
  High: 'bg-red-100 text-red-800 border-red-300',
  Unknown: 'bg-slate-100 text-slate-600 border-slate-300',
};

const sizeMap = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function UrgencyBadge({ level, size = 'md' }: UrgencyBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${colorMap[level]} ${sizeMap[size]}`}
      aria-label={`Urgency: ${level}`}
      role="status"
    >
      {level === 'High' && <span className="mr-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />}
      {level}
    </span>
  );
}
