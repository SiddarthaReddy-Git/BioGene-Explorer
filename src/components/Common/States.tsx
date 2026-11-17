import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react';

export function LoadingPanel({ label = 'Loading biological dataset...' }: { label?: string }) {
  return (
    <div className="liquid-glass flex flex-col items-center justify-center rounded-3xl px-6 py-16 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      <p className="mt-4 text-sm font-medium text-slate-700">{label}</p>
    </div>
  );
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="liquid-glass flex flex-col items-center justify-center rounded-3xl border-rose-300/70 bg-rose-50/55 px-6 py-12 text-center">
      <AlertTriangle className="h-7 w-7 text-rose-600" />
      <h3 className="mt-3 text-base font-semibold text-slate-900">Unable to load analysis data</h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="liquid-btn-violet mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}

export function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="liquid-glass flex flex-col items-center justify-center rounded-3xl px-6 py-14 text-center">
      <SearchX className="h-7 w-7 text-violet-500" />
      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-600">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="liquid-btn-teal mt-5 rounded-full px-5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
