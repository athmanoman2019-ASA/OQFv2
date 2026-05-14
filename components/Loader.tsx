import React from 'react';

export const Loader: React.FC = () => (
  <div className="relative flex items-center justify-center">
    {/* Background Glow */}
    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
    
    <div className="relative">
      {/* Outer Ring */}
      <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      
      {/* Inner Ring (Reverse) */}
      <svg className="absolute top-0 left-0 animate-spin h-8 w-8 text-emerald-500" style={{ animationDirection: 'reverse', animationDuration: '1s' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path className="opacity-60" fill="currentColor" d="M12 4.142A7.858 7.858 0 004.142 12H1.5A10.5 10.5 0 0112 1.5v2.642z"></path>
      </svg>
      
      {/* Center Dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse"></div>
    </div>
  </div>
);
