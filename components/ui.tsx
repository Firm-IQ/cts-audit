import React from 'react';
import Link from 'next/link';

// BUTTONS
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b1329] focus:ring-[#d4af37] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#d4af37] text-[#0b1329] hover:bg-[#c29e2f] hover:shadow-lg hover:shadow-[#d4af37]/15 active:scale-95',
    secondary: 'border border-[#d4af37]/30 text-[#d4af37] bg-transparent hover:bg-[#d4af37]/10 active:scale-95',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:scale-95',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-800',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// CARDS
export function Card({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-[#1c2541] border border-slate-700/60 rounded-lg shadow-xl overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 border-b border-slate-700/40 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-lg font-semibold text-slate-100 ${className}`} {...props}>{children}</h3>;
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs text-slate-400 mt-1 ${className}`} {...props}>{children}</p>;
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 ${className}`} {...props}>{children}</div>;
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 border-t border-slate-700/40 bg-slate-900/30 ${className}`} {...props}>{children}</div>;
}

// FORM ELEMENTS
export function Label({ className = '', children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ${className}`} {...props}>
      {children}
    </label>
  );
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-[#131b2e] border border-slate-700/80 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all duration-200 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full bg-[#131b2e] border border-slate-700/80 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full bg-[#131b2e] border border-slate-700/80 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all duration-200 min-h-[80px] ${className}`}
      {...props}
    />
  );
}

// BADGES
export function Badge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'ready' | 'advisory' | 'critical' | 'neutral' | 'gold';
  className?: string;
}) {
  const styles = {
    ready: 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30',
    advisory: 'bg-amber-950/40 text-amber-400 border border-amber-500/30',
    critical: 'bg-rose-950/40 text-rose-400 border border-rose-500/30',
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700/60',
    gold: 'bg-yellow-950/40 text-[#d4af37] border border-[#d4af37]/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

// RADIAL PROGRESS INDICATOR
export function RadialProgress({
  value,
  size = 120,
  strokeWidth = 10,
  className = '',
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  let color = 'stroke-rose-500';
  if (value >= 80) color = 'stroke-emerald-500';
  else if (value >= 60) color = 'stroke-amber-500';

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Colored Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`transition-all duration-500 ${color}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      {/* Centered Percentage Label */}
      <div className="absolute text-center">
        <span className="text-2xl font-bold text-slate-100">{Math.round(value)}</span>
        <span className="text-xs text-slate-400 block -mt-1">%</span>
      </div>
    </div>
  );
}

// METRIC CARD
export function MetricCard({
  title,
  value,
  icon,
  className = '',
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-[#1c2541] border border-slate-700/60 rounded-lg p-5 flex items-center justify-between ${className}`}>
      <div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
          {title}
        </span>
        <span className="text-2xl font-bold text-[#d4af37]">{value}</span>
      </div>
      {icon && <div className="text-slate-500 bg-slate-900/40 p-2.5 rounded-md">{icon}</div>}
    </div>
  );
}

// NAVBAR component
export function Navbar({ userName, email, role }: { userName?: string | null; email?: string | null; role?: string | null }) {
  return (
    <header className="bg-[#1c2541] border-b border-slate-700/80 px-6 py-4 flex items-center justify-between no-print">
      <div className="flex items-center space-x-8">
        <Link href="/dashboard" className="flex items-center space-x-2 mr-2">
          <span className="text-[#d4af37] font-bold text-lg tracking-tight">Know Your Book™</span>
          <span className="text-slate-400 font-normal text-xs border-l border-slate-600 pl-2">
            Powered by CTS
          </span>
        </Link>
        <Link href="/dashboard" className="text-sm font-semibold text-slate-300 hover:text-[#d4af37] transition-colors">
          Advisors
        </Link>
        <Link href="/import" className="text-sm font-semibold text-slate-300 hover:text-[#d4af37] transition-colors">
          Import CRM
        </Link>
        <Link href="/methodology/document-types" className="text-sm font-semibold text-slate-300 hover:text-[#d4af37] transition-colors">
          Methodology
        </Link>
        {role === 'Super Admin' && (
          <Link href="/settings" className="text-sm font-semibold text-slate-300 hover:text-[#d4af37] transition-colors">
            Settings
          </Link>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {userName && (
          <div className="text-right">
            <p className="text-xs font-medium text-slate-200">{userName}</p>
            <p className="text-[10px] text-slate-400">{email || 'Internal Assessor'}</p>
          </div>
        )}
        <form action="/api/auth/logout" method="POST">
          <Button variant="ghost" size="sm" type="submit" className="text-xs">
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
