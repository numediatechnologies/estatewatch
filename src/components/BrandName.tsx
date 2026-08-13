import React from 'react';

interface BrandNameProps {
  className?: string;
}

/** The canonical customer-facing brand treatment. */
export const BrandName: React.FC<BrandNameProps> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 ${className}`.trim()} aria-label="ESTATEWATCH">
    <span className="font-bold tracking-tight">ESTATE<span className="text-amber-400">WATCH</span></span>
    <svg className="h-[1em] w-[1.15em] text-amber-400 shrink-0" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 10C6.8 2.8 25.2 2.8 30 10C25.2 17.2 6.8 17.2 2 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="16" cy="10" r="4.25" fill="currentColor" />
      <circle cx="16" cy="10" r="1.5" fill="#0f172a" />
    </svg>
  </span>
);
