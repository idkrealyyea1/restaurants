import React from 'react';
import { useI18n, type Language } from '@/lib/i18n';

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border p-1 text-[10px] font-black"
      style={{ background: 'var(--surface-muted)', borderColor: 'rgba(31,52,57,.1)' }}
    >
      <button
        type="button"
        onClick={() => setLang('ar')}
        className="rounded-full px-2.5 py-1"
        style={lang === 'ar' ? { background: 'var(--ink)', color: 'var(--bg)' } : { color: 'rgba(31,52,57,.5)' }}
      >
        ع
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className="rounded-full px-2.5 py-1"
        style={lang === 'en' ? { background: 'var(--ink)', color: 'var(--bg)' } : { color: 'rgba(31,52,57,.5)' }}
      >
        EN
      </button>
    </div>
  );
}
