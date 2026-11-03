// Ajustes de inventario (docs/PLAN_AJUSTES_INVENTARIO.md del backend).
// Las vendedoras piden un conteo de inventario, redimir una tarjeta regalo o un cambio
// de prenda; NADA toca Alegra hasta que el admin lo acepta (ahí se crea el ajuste y se
// ve su número). Nunca se devuelve plata (cambios y tarjetas): lo que sale vale igual o más.
import React, { useCallback, useEffect, useState } from 'react';
import {
  PackageCheck, Gift, ClipboardList, Plus, Trash2, Check, X, Search, Loader2,
  AlertTriangle, CheckCircle2, RefreshCw, History, Ban, Repeat,
} from 'lucide-react';
import { isAdmin, isReadOnly } from '../utils/auth';
import EmployeeSelect from '../components/employees/EmployeeSelect';
import LiveMoneyInput from '../components/common/LiveMoneyInput';
import {
  lookupCode, getInventoryRequests, createInventoryRequest, cancelInventoryRequest,
  checkInventoryRequest, approveInventoryRequest, approveAllInventoryRequests, rejectInventoryRequest,
} from '../services/inventoryRequestsService';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';
const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Math.round(v || 0));

const MEDIOS = [['efectivo', 'Efectivo'], ['qr', 'QR'], ['nequi', 'Nequi'], ['daviplata', 'Daviplata'], ['datafono', 'Datáfono'], ['addi', 'Addi']];
const MEDIO_LABEL = Object.fromEntries(MEDIOS);

const STATUS = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800' },
  aplicando: { label: 'Aplicando…', cls: 'bg-blue-100 text-blue-800' },
  revisar: { label: 'Por revisar', cls: 'bg-red-100 text-red-800' },
  aplicada: { label: 'Aplicada', cls: 'bg-emerald-100 text-emerald-800' },
  rechazada: { label: 'Rechazada', cls: 'bg-gray-200 text-gray-700' },
  cancelada: { label: 'Quitada', cls: 'bg-gray-100 text-gray-500' },
};

const emptyRow = () => ({ key: Math.random().toString(36).slice(2), code: '', qty: '', item: null, lookupError: '', loading: false });

// ─── Código con búsqueda en Alegra ───────────────────────────────────────────

const CodeField = ({ row, onChange, label = 'Código', autoFocus = false }) => {
  const search = async () => {
    const code = row.code.replace(/\s+/g, '');
    if (!code) return;
    if (row.item && row.item.code === code) return;
    onChange({ loading: true, lookupError: '', item: null });
    try {
      onChange({ loading: false, item: await lookupCode(code), lookupError: '' });
    } catch (e) {
      onChange({ loading: false, item: null, lookupError: e.message });
    }
  };

  return (
    <div className="min-w-0">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex gap-1.5">
        <input
          aria-label={label} type="text" inputMode="numeric" autoComplete="off" autoFocus={autoFocus}
          value={row.code} placeholder="Ej.: 1054399004"
          onChange={e => onChange({ code: e.target.value.replace(/[^0-9]/g, ''), item: null, lookupError: '' })}
          onBlur={search}
          // Los lectores de código de barras terminan con Enter: busca en vez de enviar el formulario
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
          className={inputCls}
        />
        <button type="button" onClick={search} title="Buscar en Alegra" aria-label="Buscar en Alegra"
          className="px-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
          {row.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>
      {row.loading && <p className="text-[11px] text-gray-500 mt-1">Buscando en Alegra… la primera vez puede tardar un poco.</p>}
      {row.item && (
        <p className="text-xs text-emerald-700 mt-1 break-words">
          <CheckCircle2 className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5" />
          {row.item.name} · <b>Sistema: {row.item.available}</b>
        </p>
      )}
      {row.lookupError && <p className="text-xs text-red-600 mt-1">{row.lookupError}</p>}
    </div>
  );
};

// ─── Formulario de solicitud ─────────────────────────────────────────────────

const FORM_TEXT = {
  conteo: {
    title: 'Conteo de inventario',
    help: 'Escribe el código y cuántas hay físicamente en la tienda. La plataforma calcula si se aumenta o se disminuye.',
  },
  tarjeta_regalo: {
    title: 'Redimir tarjeta regalo',
    help: 'Entra la tarjeta regalo y sale la prenda que se lleva el cliente. Nunca se devuelve plata: lo que se lleva debe valer igual o más que la tarjeta (si vale más, paga el excedente).',
  },
  cambio_prenda: {
    title: 'Cambio de prenda',
    help: 'Entra la prenda que devuelve el cliente y sale la que se lleva. Nunca se devuelve plata: lo que se lleva debe valer igual o más (si vale más, paga el excedente).',
  },
};

// Lista de prendas con código + cantidad (o físico, en el conteo)
const LinesEditor = ({ rows, setRows, mode, diffLabel }) => {
  const setRow = (key, patch) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const conteo = mode === 'conteo';
  return (
    <>
      {rows.map(r => (
        <div key={r.key} className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_auto] gap-2 sm:items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
          <CodeField row={r} onChange={patch => setRow(r.key, patch)} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{conteo ? 'Físico *' : 'Cantidad'}</label>
            <input aria-label={conteo ? 'Cantidad física' : 'Cantidad'} type="number" min={conteo ? 0 : 1} step={1} inputMode="numeric"
              required={conteo && !!r.code} placeholder={conteo ? 'Ej.: 6' : '1'}
              value={r.qty} onChange={e => setRow(r.key, { qty: e.target.value })} className={inputCls} />
            {conteo && <p className="text-xs mt-1">{diffLabel(r)}</p>}
          </div>
          <div className="sm:pt-5">
            {rows.length > 1 && (
              <button type="button" onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}
                aria-label="Quitar prenda" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setRows(rs => [...rs, emptyRow()])}
        className="flex items-center gap-1 text-sm text-indigo-700 font-medium hover:underline">
        <Plus className="w-4 h-4" /> Agregar otra prenda
      </button>
    </>
  );
};

const valueOf = (rows) => rows.reduce((sum, r) => sum + (r.item ? (r.item.price || 0) * Number(r.qty || 1) : 0), 0);

const RequestForm = ({ kind, onDone, onCancel }) => {
  const [requestedBy, setRequestedBy] = useState('');
  const [rows, setRows] = useState([emptyRow()]);        // conteo / prendas que SALEN
  const [inRows, setInRows] = useState([emptyRow()]);    // cambio: prendas que ENTRAN
  const [card, setCard] = useState(emptyRow());          // tarjeta regalo que ENTRA
  const [excedente, setExcedente] = useState('');
  const [excedenteTouched, setExcedenteTouched] = useState(false);
  const [medio, setMedio] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const conteo = kind === 'conteo';
  const cambio = kind === 'cambio_prenda';
  const text = FORM_TEXT[kind];

  // Valor (precio de venta en Alegra) de lo que entra y lo que sale
  const valueIn = cambio ? valueOf(inRows) : (card.item ? card.item.price || 0 : 0);
  const valueOut = valueOf(rows);
  const ready = !conteo && rows.some(r => r.item) && (cambio ? inRows.some(r => r.item) : !!card.item);
  const difference = valueOut - valueIn;

  // El excedente arranca con la diferencia (se puede cambiar, ej. si hubo descuento)
  useEffect(() => {
    if (ready && !excedenteTouched) setExcedente(difference > 0 ? String(Math.round(difference)) : '');
  }, [ready, difference, excedenteTouched]);

  const diffLabel = (r) => {
    if (!r.item || r.qty === '') return null;
    const diff = Number(r.qty) - r.item.available;
    if (diff === 0) return <span className="text-gray-500">Igual al sistema: no hay que ajustar</span>;
    return diff > 0
      ? <span className="text-emerald-700 font-semibold">Aumentar {diff}</span>
      : <span className="text-red-700 font-semibold">Disminuir {-diff}</span>;
  };

  const lineList = (list, key) => list.filter(r => r.code).map(r => ({
    code: r.item.code,
    [key]: r.qty === '' ? (key === 'quantity' ? 1 : null) : Number(r.qty),
  }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const all = [...rows, ...(cambio ? inRows : []), ...(kind === 'tarjeta_regalo' ? [card] : [])];
    if (all.some(r => r.loading)) { setError('Espera a que termine la búsqueda en Alegra.'); return; }
    if (cambio && !inRows.some(r => r.code)) { setError('Agrega la prenda que devuelve el cliente.'); return; }
    if (!rows.some(r => r.code)) { setError(conteo ? 'Agrega al menos una prenda.' : 'Agrega la prenda que sale.'); return; }
    if (all.filter(r => r.code).some(r => !r.item)) { setError('Hay códigos que no se encontraron en Alegra: revísalos.'); return; }
    if (kind === 'tarjeta_regalo' && !card.item) { setError('Busca el código de la tarjeta regalo.'); return; }
    if (kind === 'tarjeta_regalo' && !card.item.is_gift_card) { setError('El código que entra no es una tarjeta regalo.'); return; }
    if (!conteo && difference < 0) { setError('Lo que se lleva vale menos de lo que entra: debe llevar otra prenda hasta igualar o pasar el valor (nunca se devuelve plata).'); return; }
    if (!conteo && difference > 0 && !(Number(excedente) > 0)) { setError('Escribe el excedente que pagó el cliente.'); return; }
    if (Number(excedente) > 0 && !medio) { setError('Elige por qué medio pagó el excedente.'); return; }

    const extra = conteo ? {} : { excedente_valor: Number(excedente || 0), excedente_medio: Number(excedente) > 0 ? medio : '' };
    const payload = {
      kind, requested_by: requestedBy, notes, ...extra,
      lines: lineList(rows, conteo ? 'physical_qty' : 'quantity'),
      ...(cambio ? { in_lines: lineList(inRows, 'quantity') } : {}),
      ...(kind === 'tarjeta_regalo' ? { gift_card_code: card.item.code } : {}),
    };
    setSaving(true);
    try {
      await createInventoryRequest(payload);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{text.title}</h3>
          <p className="text-xs text-gray-500">{text.help} No se aplica en Alegra hasta que el administrador lo acepte.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cerrar" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="max-w-xs">
        <label className="block text-xs font-medium text-gray-600 mb-1">¿Quién lo pide? *</label>
        <EmployeeSelect value={requestedBy} onChange={e => setRequestedBy(e.target.value)} />
      </div>

      {kind === 'tarjeta_regalo' && (
        <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3">
          <p className="text-xs font-semibold text-emerald-800 mb-2">ENTRA (tarjeta regalo)</p>
          <CodeField row={card} label="Código de la tarjeta" onChange={patch => setCard(c => ({ ...c, ...patch }))} />
          {card.item && !card.item.is_gift_card && (
            <p className="text-xs text-red-600 mt-1">Este código no es una tarjeta regalo.</p>
          )}
        </div>
      )}

      {cambio && (
        <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3 space-y-3">
          <p className="text-xs font-semibold text-emerald-800">ENTRA (la que devuelve el cliente)</p>
          <LinesEditor rows={inRows} setRows={setInRows} mode="in" />
        </div>
      )}

      <div className={conteo ? 'space-y-3' : 'border border-red-200 bg-red-50/40 rounded-xl p-3 space-y-3'}>
        {!conteo && <p className="text-xs font-semibold text-red-800">SALE (la que se lleva)</p>}
        <LinesEditor rows={rows} setRows={setRows} mode={conteo ? 'conteo' : 'out'} diffLabel={diffLabel} />
      </div>

      {ready && (
        <div className={`text-sm rounded-xl px-3 py-2 border ${difference < 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
          Entra {fmt(valueIn)} · Sale {fmt(valueOut)} ·{' '}
          {difference > 0 && <b>El cliente paga {fmt(difference)}</b>}
          {difference === 0 && <b>Mismo valor: no hay excedente</b>}
          {difference < 0 && <b>Faltan {fmt(-difference)}: debe llevar otra prenda (nunca se devuelve plata)</b>}
        </div>
      )}

      {!conteo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Excedente (lo que pagó de más)</label>
            <LiveMoneyInput value={excedente} onChange={v => { setExcedenteTouched(true); setExcedente(v); }} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Medio del excedente</label>
            <select aria-label="Medio del excedente" value={medio} onChange={e => setMedio(e.target.value)} className={inputCls} disabled={!(Number(excedente) > 0)}>
              <option value="">Elige…</option>
              {MEDIOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <p className="sm:col-span-2 text-[11px] text-gray-500 -mt-1">El excedente también va en el cierre de caja del día (aquí solo queda como nota del ajuste).</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nota (opcional)</label>
        <input aria-label="Nota" type="text" maxLength={300} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder={conteo ? 'Ej.: Inventario camiseta y buzo de niña' : ''} className={inputCls} />
      </div>

      {error && <p className="text-sm text-red-600 flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enviar al administrador
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
      </div>
    </form>
  );
};

// ─── Tarjeta de una solicitud ────────────────────────────────────────────────

const RequestCard = ({ req, admin, readOnly, onChanged }) => {
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const open = req.status === 'pendiente' || req.status === 'revisar';

  const run = async (key, fn) => {
    setBusy(key); setError('');
    try { await fn(); } catch (e) { setError(e.message); onChanged(); } finally { setBusy(''); }
  };

  const doCheck = () => run('check', async () => setCheck(await checkInventoryRequest(req.id)));
  const approve = () => run('approve', async () => { await approveInventoryRequest(req.id); onChanged(); });
  const reject = () => run('reject', async () => { await rejectInventoryRequest(req.id, reason); setRejecting(false); onChanged(); });
  const cancel = () => {
    if (!window.confirm('¿Quitar esta solicitud? No se aplicará en Alegra.')) return;
    run('cancel', async () => { await cancelInventoryRequest(req.id); onChanged(); });
  };

  useEffect(() => { if (admin && open && !readOnly) doCheck(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const st = STATUS[req.status] || { label: req.status, cls: 'bg-gray-100 text-gray-600' };
  const created = req.created_at ? new Date(req.created_at) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            {req.kind === 'tarjeta_regalo' ? <Gift className="w-4 h-4 text-pink-600" />
              : req.kind === 'cambio_prenda' ? <Repeat className="w-4 h-4 text-amber-600" />
              : <ClipboardList className="w-4 h-4 text-indigo-600" />}
            {req.kind_label}
          </p>
          <p className="text-xs text-gray-500">
            Pedido por <b>{req.requested_by}</b>
            {created && <> · {created.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} {created.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</>}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
          {st.label}{req.status === 'aplicada' && req.alegra_number ? ` · Ajuste No. ${req.alegra_number}` : ''}
        </span>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[20rem]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b">
              <th className="py-1 px-1 font-semibold">Prenda</th>
              <th className="py-1 px-1 font-semibold">Ajuste</th>
              <th className="py-1 px-1 font-semibold text-right">Sistema</th>
              {req.kind === 'conteo' && <th className="py-1 px-1 font-semibold text-right">Físico</th>}
              {check && <th className="py-1 px-1 font-semibold text-right">Hoy en Alegra</th>}
            </tr>
          </thead>
          <tbody>
            {req.lines.map(l => {
              const now = check?.current?.[l.item_id];
              return (
                <tr key={l.item_id} className="border-b border-gray-50 last:border-0 align-top">
                  <td className="py-1.5 px-1">
                    <span className="font-mono text-xs text-gray-600">{l.code}</span>
                    <span className="block text-xs text-gray-800">{l.name}</span>
                  </td>
                  <td className={`py-1.5 px-1 font-semibold whitespace-nowrap ${l.type === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {l.type === 'in' ? `Entra ${l.quantity}` : `Sale ${l.quantity}`}
                  </td>
                  <td className="py-1.5 px-1 text-right">{l.system_qty}</td>
                  {req.kind === 'conteo' && <td className="py-1.5 px-1 text-right">{l.physical_qty}</td>}
                  {check && (
                    <td className={`py-1.5 px-1 text-right ${now && now.available !== l.system_qty ? 'text-amber-700 font-semibold' : ''}`}>
                      {now ? now.available : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(req.excedente_valor || req.notes || req.price_difference != null) && (
        <p className="text-xs text-gray-600">
          {req.price_difference != null && <>Diferencia de precio <b>{fmt(req.price_difference)}</b>. </>}
          {req.excedente_valor ? <>Excedente <b>{fmt(req.excedente_valor)}</b> ({MEDIO_LABEL[req.excedente_medio] || req.excedente_medio}). </> : null}
          {req.price_difference > 0 && Math.round(req.excedente_valor || 0) !== Math.round(req.price_difference) && (
            <span className="text-amber-700 font-semibold">El excedente no coincide con la diferencia de precio. </span>
          )}
          {req.notes}
        </p>
      )}
      {req.status === 'rechazada' && req.reject_reason && <p className="text-xs text-gray-700">Motivo del rechazo: <b>{req.reject_reason}</b></p>}
      {open && req.last_error && <p className="text-xs text-red-700 flex items-start gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{req.last_error}</p>}

      {check?.warnings?.length > 0 && (
        <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
          {check.warnings.map(w => <li key={w}>• {w}</li>)}
        </ul>
      )}
      {check?.problem && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{check.problem}</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}

      {open && !readOnly && (
        <div className="flex flex-wrap gap-2 pt-1">
          {admin && (
            <>
              <button type="button" onClick={approve} disabled={!!busy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {busy === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {req.status === 'revisar' ? 'Revisar y aceptar' : 'Aceptar'}
              </button>
              {req.status === 'pendiente' && (
                <button type="button" onClick={() => setRejecting(v => !v)} disabled={!!busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50">
                  <Ban className="w-4 h-4" /> Rechazar
                </button>
              )}
              <button type="button" onClick={doCheck} disabled={!!busy} title="Volver a leer la existencia en Alegra"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50">
                {busy === 'check' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Revisar en Alegra
              </button>
            </>
          )}
          {req.status === 'pendiente' && (
            <button type="button" onClick={cancel} disabled={!!busy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-700 disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Quitar
            </button>
          )}
        </div>
      )}

      {rejecting && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input aria-label="Motivo del rechazo" type="text" maxLength={300} value={reason} autoFocus
            onChange={e => setReason(e.target.value)} placeholder="Motivo (ej.: contar otra vez)" className={inputCls} />
          <button type="button" onClick={reject} disabled={!reason.trim() || !!busy}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">Rechazar</button>
        </div>
      )}
    </div>
  );
};

// ─── Página ──────────────────────────────────────────────────────────────────

const InventoryAdjustments = () => {
  const admin = isAdmin();
  const readOnly = isReadOnly();
  const [tab, setTab] = useState('open');
  const [items, setItems] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formKind, setFormKind] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [version, setVersion] = useState(0);   // vuelve a montar las tarjetas (y su revisión en Alegra)

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getInventoryRequests(tab);
      setItems(data.items || []);
      setOpenCount(data.open_count || 0);
      setVersion(v => v + 1);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); };

  const approveAll = async () => {
    if (!window.confirm(`¿Aceptar las ${openCount} solicitudes pendientes? Se crean los ajustes en Alegra.`)) return;
    setApprovingAll(true); setError('');
    try {
      const r = await approveAllInventoryRequests();
      if (r.failed) setError(`Se aplicaron ${r.applied}; ${r.failed} no se pudieron aplicar (mira el motivo en cada una).`);
      else flash(`Listo: ${r.applied} ajuste${r.applied === 1 ? '' : 's'} creado${r.applied === 1 ? '' : 's'} en Alegra.`);
    } catch (e) { setError(e.message); } finally { setApprovingAll(false); load(); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ajustes de inventario</h1>
            <p className="text-xs text-gray-500">
              {admin ? 'Revisa lo que piden las vendedoras: solo al aceptar se crea el ajuste en Alegra.'
                : 'Pide aquí los ajustes: se aplican en Alegra cuando el administrador los acepte.'}
            </p>
          </div>
        </div>
        {!readOnly && !formKind && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFormKind('conteo')}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
              <ClipboardList className="w-4 h-4" /> Conteo de inventario
            </button>
            <button type="button" onClick={() => setFormKind('cambio_prenda')}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">
              <Repeat className="w-4 h-4" /> Cambio de prenda
            </button>
            <button type="button" onClick={() => setFormKind('tarjeta_regalo')}
              className="flex items-center gap-1.5 px-3 py-2 bg-pink-600 text-white rounded-lg text-sm font-semibold hover:bg-pink-700">
              <Gift className="w-4 h-4" /> Redimir tarjeta regalo
            </button>
          </div>
        )}
      </div>

      {formKind && (
        <RequestForm key={formKind} kind={formKind} onCancel={() => setFormKind(null)}
          onDone={() => { setFormKind(null); setTab('open'); flash('Solicitud enviada al administrador.'); load(); }} />
      )}

      {success && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button type="button" onClick={() => setTab('open')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === 'open' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}>
            Pendientes{openCount ? ` (${openCount})` : ''}
          </button>
          <button type="button" onClick={() => setTab('all')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ${tab === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}>
            <History className="w-4 h-4" /> Historial
          </button>
        </div>
        {admin && !readOnly && tab === 'open' && openCount > 1 && (
          <button type="button" onClick={approveAll} disabled={approvingAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {approvingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Aceptar todas ({openCount})
          </button>
        )}
      </div>

      {loading && !items.length ? (
        <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center">
          {tab === 'open' ? 'No hay solicitudes pendientes.' : 'Todavía no hay solicitudes.'}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(req => (
            <RequestCard key={`${req.id}-${version}`} req={req} admin={admin} readOnly={readOnly} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryAdjustments;
