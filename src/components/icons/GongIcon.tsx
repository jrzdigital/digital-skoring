import React from "react";

export function GongIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Balok gantungan atas (stand frame) */}
      <path d="M3 3h18" />
      <path d="M4 3v3" />
      <path d="M20 3v3" />
      {/* Tali gantung gong */}
      <path d="M8 3v5" />
      <path d="M16 3v5" />
      {/* Piringan gong utama */}
      <circle cx="12" cy="14" r="7" />
      {/* Lingkaran alur resonansi gong */}
      <circle cx="12" cy="14" r="4.2" strokeWidth="1.2" strokeDasharray="2 2" />
      {/* Pencu / tonjolan tengah gong (boss) */}
      <circle cx="12" cy="14" r="1.8" fill="currentColor" />
    </svg>
  );
}
