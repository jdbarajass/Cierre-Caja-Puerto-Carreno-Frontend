import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Piezas compartidas por las páginas de Estadísticas de diseño "Arqueo"
 * (Clientes, Prendas): filtro de periodo, tarjetas y avisos. Fechas en
 * utils/statsDates.js.
 */

export const Card = ({ title, subtitle, children }) => (
  <section className="min-w-0 rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-6">
    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
    {children}
  </section>
);

export const Notice = ({ children, tone = 'warning' }) => (
  <div className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
    tone === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-gray-50 border-gray-200 text-gray-700'
  }`}>
    <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tone === 'warning' ? 'text-amber-600' : 'text-gray-500'}`} />
    <p>{children}</p>
  </div>
);

export const PeriodFilter = ({ presets, range, setRange, draft, setDraft, draftError, loading, today }) => (
  <section aria-label="Periodo" className="flex flex-wrap items-end gap-2">
    <div role="group" aria-label="Periodos rápidos" className="flex flex-wrap gap-1.5">
      {presets.map((p) => {
        const active = range.preset === p.id;
        return (
          <button
            key={p.id}
            onClick={() => { setRange({ start: p.start, end: p.end, preset: p.id }); setDraft({ start: p.start, end: p.end }); }}
            aria-pressed={active}
            className={`h-10 px-3.5 rounded-full text-sm font-medium transition-colors ${
              active ? 'bg-gray-900 text-white' : 'bg-white ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
    <form
      className="flex flex-wrap items-end gap-2 sm:ml-2"
      onSubmit={(e) => { e.preventDefault(); if (!draftError) setRange({ ...draft, preset: null }); }}
    >
      <label className="text-xs text-gray-500">
        <span className="block mb-1">Desde</span>
        <input type="date" value={draft.start} max={today}
          onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
          className="h-10 px-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white" />
      </label>
      <label className="text-xs text-gray-500">
        <span className="block mb-1">Hasta</span>
        <input type="date" value={draft.end} max={today}
          onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
          className="h-10 px-3 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white" />
      </label>
      <button type="submit" disabled={!!draftError || loading}
        className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Consultar
      </button>
      {draftError && <p className="w-full text-xs text-red-700" role="alert">{draftError}</p>}
    </form>
  </section>
);

export const StatTile = ({ label, value, detail }) => (
  <section className="min-w-0 rounded-2xl bg-white ring-1 ring-gray-900/5 shadow-sm p-4 sm:p-5" aria-label={label}>
    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
    {/* En celular van 2 por fila: montos como "$ 10.350.000" no cabían en text-3xl */}
    <p className="mt-1 text-xl sm:text-3xl font-bold text-gray-900 tabular-nums break-words">{value}</p>
    {detail && <p className="mt-1 text-sm text-gray-600">{detail}</p>}
  </section>
);
