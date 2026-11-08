import React from 'react';
import LogoPalermo from './LogoPalermo';

export default function Header() {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo y nombre principal */}
        <div className="flex items-center gap-4">
          <LogoPalermo size="medium" />
          
          {/* Separador vertical */}
          <div className="h-12 w-px bg-slate-300"></div>
          
          {/* COREMAR */}
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              COREMAR
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Operaciones Portuarias
            </p>
          </div>
        </div>

        {/* CONTROL DE RECIBOS - Centrado/Derecha */}
        <div className="text-right">
          <h2 className="text-lg font-semibold text-[#0077B6] uppercase tracking-wide">
            Control de Recibos
          </h2>
          <p className="text-xs text-slate-500">
            Sistema de Gestión de Turnos
          </p>
        </div>
      </div>
    </div>
  );
}