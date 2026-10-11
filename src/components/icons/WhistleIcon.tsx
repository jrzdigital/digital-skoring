import React from "react";

export function WhistleIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
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
      {/* Whistle lanyard ring */}
      <circle cx="19.5" cy="14" r="2.5" />
      {/* Whistle barrel and chamber */}
      <path d="M2.5 8h7.5l3.2 3.5h4.3a4.5 4.5 0 1 1-3.6 7.2L13 18.5V12.5H2.5V8z" />
      {/* Sound air blast slit */}
      <path d="M10 8v4" />
      {/* Whistle pea hole inner dot */}
      <circle cx="15.8" cy="15" r="1.2" fill="currentColor" />
      {/* Sound waves emitted above the slit */}
      <path d="M7 4.5C8 3.5 9.5 3 11 3" />
      <path d="M13 3c1.5 0 3 .8 3.8 2" />
    </svg>
  );
}
