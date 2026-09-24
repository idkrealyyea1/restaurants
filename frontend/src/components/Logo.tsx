import React from 'react';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <a href="/" className="inline-flex items-center gap-2.5 group" style={{ color: light ? '#f8f0df' : 'var(--ink)' }}>
      <span
        className="relative grid place-items-center overflow-hidden"
        style={{
          width: 40, height: 40,
          borderRadius: 13,
          background: 'var(--coral)',
          color: '#f8f0df',
          boxShadow: '4px 4px 0 var(--sun)',
        }}
      >
        <span className="absolute rounded-full border-2 border-[#f8f0df]/80" style={{ width: 20, height: 20, right: -4, top: -8 }} />
        <span className="font-display" style={{ fontSize: 19, fontWeight: 900 }}>ر</span>
      </span>
      <span className="font-display tracking-[-.04em]" style={{ fontSize: 24, fontWeight: 900 }}>Restivo</span>
    </a>
  );
}
