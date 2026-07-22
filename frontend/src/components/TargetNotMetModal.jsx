import { AlertTriangle, X } from "lucide-react";

export default function TargetNotMetModal({ isOpen, onClose, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Attention Required</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mx-auto mb-6 mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-10 w-10 text-red-500" strokeWidth={1.5} />
        </div>
        <h2 className="mb-3 text-xl font-bold text-slate-900">Targets Not Met</h2>
        <p className="mb-8 text-slate-500">
          {message || "You have not fulfilled your daily targets for today."}
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700"
        >
          I understand
        </button>
      </div>
    </div>
  );
}
