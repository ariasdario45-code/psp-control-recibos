import React from 'react';

interface LogoPalermoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

export default function LogoPalermo({ 
  size = 'medium', 
  showText = true,
  className = '' 
}: LogoPalermoProps) {
  const sizes = {
    small: { c: 32, text: 'text-sm' },
    medium: { c: 48, text: 'text-base' },
    large: { c: 64, text: 'text-lg' }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo C de Palermo */}
      <svg 
        width={currentSize.c} 
        height={currentSize.c} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00A8E8" />
            <stop offset="50%" stopColor="#0077B6" />
            <stop offset="100%" stopColor="#023E8A" />
          </linearGradient>
        </defs>
        {/* C estilizada */}
        <path
          d="M 75 25 
             A 35 35 0 1 0 75 75 
             L 75 60 
             A 20 20 0 1 1 75 40 
             Z"
          fill="url(#cGradient)"
        />
      </svg>

      {/* Texto */}
      {showText && (
        <div className="flex flex-col">
          <span className="text-[#0077B6] font-bold text-xl tracking-wide">
            PALERMO
          </span>
          <span className="text-[#0077B6] text-xs tracking-widest">
            SOCIEDAD PORTUARIA
          </span>
        </div>
      )}
    </div>
  );
}