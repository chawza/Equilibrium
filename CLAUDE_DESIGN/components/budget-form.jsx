/* ═══════════════════════════════════════
   Budget Form — T-account layout (core)
   ═══════════════════════════════════════ */
const { useState: usStateBF, useRef: useRefBF, useEffect: useEffBF } = React;

function BudgetForm({ budget, onBack, onUpdateBudget, onShowGuide, tweaks }) {
  const [editingId, setEditingId] = usStateBF(null);
  const [statusOpen, setStatusOpen] = usStateBF(false);

  // First-budget guide: the first time a budget with no records is opened, surface
  // the T-account explainer. localStorage-gated (eq_budget_guided) so it shows once.
  useEffBF(() => {
    if (!onShowGuide) return;
    if (budget.records.length !== 0) return;
    try {
      if (localStorage.getItem('eq_budget_guided')) return;
    } catch (e) { return; }
    onShowGuide();
  }, [budget.id]);
  const gap = (tweaks && tweaks.columnGap) || 28;
  const recordStyle = (tweaks && tweaks.recordStyle) || 'compact';
  const showTags = tweaks ? tweaks.showTagsInList !== false : true;

  const inflowRecords = budget.records.filter(r => r.type === 'inflow');
  const outflowRecords = budget.records.filter(r => r.type === 'outflow');
  const totalInflow = inflowRecords.reduce((s, r) => s + r.amount, 0);
  const totalOutflow = outflowRecords.reduce((s, r) => s + r.amount, 0);
  const balance = totalInflow - totalOutflow;
  const allocatedPct = totalInflow > 0 ? (totalOutflow / totalInflow) * 100 : 0;
  const overBudget = totalOutflow > totalInflow;

  function updateRecord(id, updates) {
    const newRecords = budget.records.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    onUpdateBudget(budget.id, { records: newRecords });
  }

  function deleteRecord(id) {
    const newRecords = budget.records.filter(r => r.id !== id);
    onUpdateBudget(budget.id, { records: newRecords });
  }

  function addRecord(type) {
    const newRecord = {
      id: nextId(),
      emoji: '📝',
      label: '',
      type,
      amount: 0,
      tags: [],
      notes: '',
      is_adjustment: budgetNeedsReview(budget),
    };
    onUpdateBudget(budget.id, {
      records: [...budget.records, newRecord],
    });
    setEditingId(newRecord.id);
  }

  function changeStatus(newStatus) {
    onUpdateBudget(budget.id, { status: newStatus });
  }

  return (
    <div className="page-enter" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'hsl(var(--muted-foreground))',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--accent))'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Icon name="back" size={18} />
        </button>
        <h1 className="text-page-title" style={{ flex: 1 }}>{budget.name}</h1>
        <StatusStepper
          status={budget.status}
          open={statusOpen}
          onToggle={() => setStatusOpen(o => !o)}
          onClose={() => setStatusOpen(false)}
          onChange={changeStatus}
        />
      </div>

      {/* Date range */}
      <div className="text-caption" style={{ marginBottom: 28, paddingLeft: 44 }}>
        {budget.startDate} – {budget.endDate}
      </div>

      {/* T-account columns with center ledger divider */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
      }}>
        {/* ─── Inflow column ─── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: gap / 2 }}>
          <TAccountColumn
            type="inflow"
            records={inflowRecords}
            total={totalInflow}
            editingId={editingId}
            recordStyle={recordStyle}
            showTags={showTags}
            onStartEdit={setEditingId}
            onStopEdit={() => setEditingId(null)}
            onUpdate={updateRecord}
            onDelete={deleteRecord}
            onAdd={() => addRecord('inflow')}
          />
        </div>

        {/* ─── Center divider (T-account stem) ─── */}
        <div style={{
          width: 1,
          alignSelf: 'stretch',
          background: 'hsl(var(--border))',
          flexShrink: 0,
        }} />

        {/* ─── Outflow column ─── */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: gap / 2 }}>
          <TAccountColumn
            type="outflow"
            records={outflowRecords}
            total={totalOutflow}
            editingId={editingId}
            recordStyle={recordStyle}
            showTags={showTags}
            onStartEdit={setEditingId}
            onStopEdit={() => setEditingId(null)}
            onUpdate={updateRecord}
            onDelete={deleteRecord}
            onAdd={() => addRecord('outflow')}
          />
        </div>
      </div>

      {/* ─── Balance bar ─── */}
      <EqCard style={{ marginTop: 16, padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>
            Balance
          </span>
          <span style={{
            fontSize: 18,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            color: overBudget ? 'hsl(var(--destructive))' : balance === 0 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--inflow))',
          }}>
            {balance >= 0 ? '+ ' : '- '}{formatRp(Math.abs(balance))}
          </span>
        </div>
        <EqProgress
          value={totalOutflow}
          max={totalInflow}
          variant={overBudget ? 'destructive' : 'inflow'}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
        }}>
          <span className="text-caption">
            {totalInflow > 0 ? Math.round(allocatedPct) : 0}% allocated
          </span>
          <span className="text-caption">
            {overBudget
              ? `${Math.round(allocatedPct - 100)}% over budget`
              : `${totalInflow > 0 ? Math.round(100 - allocatedPct) : 100}% remaining`}
          </span>
        </div>
      </EqCard>

      {/* ─── Spend by tag ─── */}
      <TagSummary records={budget.records} />
    </div>
  );
}

function TagSummary({ records }) {
  // Aggregate amount per tag across all records in this budget, split by flow
  // direction. A record can carry multiple tags, so its amount counts toward
  // each. Only tags actually present in this budget appear.
  const totals = {};
  records.forEach(r => {
    (r.tags || []).forEach(tag => {
      if (!totals[tag]) totals[tag] = { inflow: 0, outflow: 0 };
      totals[tag][r.type] += r.amount;
    });
  });
  const rows = Object.entries(totals)
    .map(([tag, t]) => ({ tag, ...t, total: t.inflow + t.outflow }))
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) return null;

  const max = Math.max(...rows.map(r => r.total));

  return (
    <div style={{ marginTop: 40 }}>
      {/* Section separator + heading */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
      }}>
        <h2 className="text-section-heading" style={{ flexShrink: 0 }}>By tag</h2>
        <div style={{ flex: 1, height: 1, background: 'hsl(var(--border))' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {[['Inflow', 'inflow'], ['Outflow', 'outflow']].map(([label, key]) => (
            <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: `hsl(var(--${key}))` }} />
              <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{label}</span>
            </span>
          ))}
        </div>
      </div>
      <EqCard style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map(({ tag, inflow, outflow }) => {
          const inPct = max > 0 ? (inflow / max) * 100 : 0;
          const outPct = max > 0 ? (outflow / max) * 100 : 0;
          // Value sits immediately after the pill (right-aligned), bar trails to
          // the right — keeps the tag name and its number visually adjacent.
          const flowLine = (amount, pct, key) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 96, flexShrink: 0, textAlign: 'right',
                fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums',
                color: amount > 0 ? `hsl(var(--${key}))` : 'hsl(var(--muted-foreground))',
              }}>
                {amount > 0 ? formatRp(amount) : '—'}
              </span>
              <div style={{
                flex: 1, minWidth: 0, height: 7, borderRadius: 9999,
                background: 'hsl(var(--secondary))', overflow: 'hidden',
              }}>
                {amount > 0 && (
                  <div style={{
                    width: `${Math.max(pct, 1.5)}%`, height: '100%', borderRadius: 9999,
                    background: `hsl(var(--${key}))`, transition: 'width 0.3s ease',
                  }} />
                )}
              </div>
            </div>
          );
          return (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 96, flexShrink: 0, display: 'flex' }}>
                <TagBadge tag={tag} dot />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {flowLine(inflow, inPct, 'inflow')}
                {flowLine(outflow, outPct, 'outflow')}
              </div>
            </div>
          );
        })}
        </div>
      </EqCard>
    </div>
  );
}

function TAccountColumn({ type, records, total, editingId, recordStyle, showTags, onStartEdit, onStopEdit, onUpdate, onDelete, onAdd }) {
  const isInflow = type === 'inflow';
  const accentColor = isInflow ? 'hsl(var(--inflow))' : 'hsl(var(--outflow))';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Column header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        padding: '0 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: accentColor,
            opacity: 0.7,
          }} />
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'hsl(var(--muted-foreground))',
          }}>
            {type}
          </span>
        </div>
        <EqButton variant="ghost" size="icon-sm" onClick={onAdd}>
          <Icon name="plus" size={14} color={accentColor} />
        </EqButton>
      </div>

      {/* Records */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {records.map(record => (
          <RecordRow
            key={record.id}
            record={record}
            type={type}
            recordStyle={recordStyle}
            showTags={showTags}
            onUpdate={onUpdate}
            onDelete={onDelete}
            editingId={editingId}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
          />
        ))}
      </div>

      {/* Add placeholder */}
      <div style={{ marginTop: 6 }}>
        <NewRecordPlaceholder type={type} onAdd={onAdd} />
      </div>

      {/* Spacer pushes total to the bottom so both columns' totals align */}
      <div style={{ flex: 1, minHeight: 12 }} />

      {/* Column total */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px 0',
        marginTop: 8,
        borderTop: '1px solid hsl(var(--border))',
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'hsl(var(--muted-foreground))',
        }}>
          Total
        </span>
        <span style={{
          fontSize: 15,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: accentColor,
        }}>
          {formatRp(total)}
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { BudgetForm, TAccountColumn, StatusStepper, TagSummary });

// ─── Status lifecycle stepper popover ───
const STATUS_FLOW = [
  { key: 'plan',   label: 'Plan',   desc: 'Drafting the budget' },
  { key: 'active', label: 'Active', desc: 'Tracking in progress' },
  { key: 'review', label: 'Review', desc: 'Checking the results' },
  { key: 'closed', label: 'Closed', desc: 'Finalized & archived' },
];
// Single-hue lifecycle: current = solid, past = tinted same hue, future = neutral.
const LIFE_SOLID = '#2563EB';
const LIFE_PAST_BG = 'rgba(37, 99, 235, 0.14)';
const LIFE_PAST_FG = '#2563EB';
const LIFE_RING = 'rgba(37, 99, 235, 0.18)';

function StatusStepper({ status, open, onToggle, onClose, onChange }) {
  const ref = useRefBF(null);
  useEffBF(() => {
    if (!open) return;
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const currentIdx = STATUS_FLOW.findIndex(s => s.key === status);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <div onClick={onToggle} style={{ cursor: 'pointer' }}>
        <StatusBadge status={status} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 280,
          background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 60, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: 14 }}>
            Budget lifecycle
          </div>

          {/* Horizontal flow indicator */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, padding: '0 2px' }}>
            {STATUS_FLOW.map((s, i) => {
              const isPast = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <React.Fragment key={s.key}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isCurrent ? LIFE_SOLID : isPast ? LIFE_PAST_BG : 'transparent',
                    border: (isPast || isCurrent) ? 'none' : '2px solid hsl(var(--border))',
                    boxShadow: isCurrent ? `0 0 0 3px ${LIFE_RING}` : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {isPast && <Icon name="check" size={10} color={LIFE_PAST_FG} />}
                    {isCurrent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div style={{
                      flex: 1, height: 2, borderRadius: 1,
                      background: i < currentIdx ? LIFE_PAST_BG : 'hsl(var(--border))',
                      transition: 'background 0.15s',
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Clickable list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {STATUS_FLOW.map((s, i) => {
              const isCurrent = i === currentIdx;
              const isPast = i < currentIdx;
              const isFuture = i > currentIdx;
              return (
                <button
                  key={s.key}
                  onClick={() => { onChange(s.key); onClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
                    border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    background: isCurrent ? 'hsl(var(--accent))' : 'transparent',
                    fontFamily: 'inherit', width: '100%',
                  }}
                  onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'hsl(var(--accent) / 0.6)'; }}
                  onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600,
                    background: isCurrent ? LIFE_SOLID : isPast ? LIFE_PAST_BG : 'hsl(var(--secondary))',
                    color: isCurrent ? '#fff' : isPast ? LIFE_PAST_FG : 'hsl(var(--muted-foreground))',
                  }}>
                    {isPast ? <Icon name="check" size={11} color={LIFE_PAST_FG} /> : i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                      {s.label}
                      {isCurrent && <span style={{ fontSize: 11, fontWeight: 500, color: 'hsl(var(--muted-foreground))', marginLeft: 6 }}>· current</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 12, paddingTop: 10, borderTop: '1px solid hsl(var(--border))', lineHeight: 1.4 }}>
            Stages run in order, but you can jump to any stage.
          </div>
        </div>
      )}
    </div>
  );
}
