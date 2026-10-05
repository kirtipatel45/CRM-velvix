import { memo, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

function TargetNotMetModal({ isOpen, onClose, message }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.keyCode === 27) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white border border-[#E5E7EB] p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-[#F04438]">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#111827]">Target Notice</h2>
              <p className="text-xs text-[#667085]">Daily activity requirements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#667085] hover:bg-[#F2F4F7] hover:text-[#111827] transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-3.5 text-xs text-[#344054] leading-relaxed">
          {message || "Daily activity target quota has not been met for today. Please review and fulfill your assigned quotas."}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs h-9 px-4 w-full sm:w-auto"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(TargetNotMetModal);
