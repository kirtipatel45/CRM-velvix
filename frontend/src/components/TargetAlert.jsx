import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';

function TargetAlert({ show, message }) {
  if (!show) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      <AlertTriangle size={16} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default memo(TargetAlert);

export const AlertBadge = memo(function AlertBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      Target Not Met
    </span>
  );
});
