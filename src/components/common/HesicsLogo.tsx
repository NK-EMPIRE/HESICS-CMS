import React from 'react';

interface HesicsLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'icon' | 'full' | 'glow';
}

export const HesicsLogo: React.FC<HesicsLogoProps> = ({
  className = '',
  size = 32,
  variant = 'icon',
}) => {
  const numericSize = typeof size === 'number' ? size : 32;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        variant === 'glow' ? 'drop-shadow-[0_0_12px_rgba(30,158,255,0.4)]' : ''
      } ${className}`}
      style={{ width: numericSize, height: numericSize }}
    >
      <img
        src="/hesics-logo.png"
        alt="HESICS Logo"
        className="w-full h-full object-contain mix-blend-screen filter brightness-125 contrast-125 transition-transform duration-200"
      />
    </div>
  );
};