import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0b1329] flex flex-col items-center justify-center text-slate-100">
      <div className="flex flex-col items-center space-y-4">
        {/* Sleek Golden Spinner */}
        <div className="w-12 h-12 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-400 animate-pulse uppercase tracking-wider">
          Loading next workspace...
        </p>
      </div>
    </div>
  );
}
