
import React from 'react';

export const StartButtonIcon = () => (
  <div className="relative w-16 h-16 flex items-center justify-center cursor-pointer group">
    {/* Rotating dashed circle */}
    <svg className="absolute inset-0 w-full h-full animate-rotate-slow opacity-60" viewBox="0 0 100 100">
      <circle 
        cx="50" cy="50" r="45" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeDasharray="4 8"
        className="text-amber-400"
      />
    </svg>
    {/* Geometric Triangle */}
    <svg className="w-8 h-8 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transform translate-x-1" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M20,10 L90,50 L20,90 Z" fill="url(#playGrad)" />
    </svg>
  </div>
);

export const StopButtonIcon = () => (
  <div className="relative w-16 h-16 flex items-center justify-center cursor-pointer group">
    {/* Outer decorative square */}
    <div className="absolute inset-0 border border-rose-900/30 rotate-45 scale-90"></div>
    {/* Geometric Square */}
    <svg className="w-8 h-8 drop-shadow-[0_0_8px_rgba(127,29,29,0.5)]" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="stopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#b91c1c', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#7f1d1d', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect x="15" y="15" width="70" height="70" rx="4" fill="url(#stopGrad)" />
    </svg>
  </div>
);

export const SettingsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const SparklesIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
  </svg>
);
