import React from "react";

/**
 * Reusable BenchTrix Brand Logo component
 * Styled with Abril Fatface typography
 */
export default function BenchTrixLogo({
  className = "",
  size = "text-xl",
  variant = "default", // "default" | "white" | "plain" | "gradient"
  subtitle = null,
}) {
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className={`font-logo font-normal tracking-wide ${size} leading-none select-none`}>
        {variant === "white" ? (
          <>
            <span className="text-white">Bench</span>
            <span className="bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-300 bg-clip-text text-transparent">
              Trix
            </span>
          </>
        ) : variant === "plain" ? (
          <span className="text-slate-900">BenchTrix</span>
        ) : variant === "gradient" ? (
          <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            BenchTrix
          </span>
        ) : (
          <>
            <span className="text-slate-900">Bench</span>
            <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              Trix
            </span>
          </>
        )}
      </span>
      {subtitle && (
        <span
          className={`text-[10px] font-semibold font-sans uppercase tracking-wider mt-1 select-none ${
            variant === "white" ? "text-blue-200/90" : "text-slate-400"
          }`}
        >
          {subtitle}
        </span>
      )}
    </span>
  );
}
