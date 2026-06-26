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
      <div className="text-caption" style={{ marginBottom: 22, paddingLeft: 44 }}>
        {budget.startDate} – {budget.endDate}
      </div>

      {/* ─── Notes (markdown, renders when not focused) ─── */}
      <div style={{ marginBottom: 28 }}>
        <BudgetNotes
          value={budget.notes || ''}
          onChange={(notes) => onUpdateBudget(budget.id, { notes })}
        />
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

      {/* ─── Balance meter (summary, under the ledger) ─── */}
      <BalanceMeter totalInflow={totalInflow} totalOutflow={totalOutflow} />

      {/* ─── Spend by tag ─── */}
      <TagSummary records={budget.records} />
    </div>
  );
}

/* ═══════════════════════════════════════
   Budget notes — a roomy markdown scratchpad.
   Click to edit (raw textarea); blur renders
   the markdown. Persists onto the budget.
   ═══════════════════════════════════════ */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function mdInline(s) {
  s = escapeHtml(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}
function renderMarkdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let i = 0;
  let para = [];
  const flushPara = () => {
    if (para.length) { html += '<p>' + mdInline(para.join(' ')) + '</p>'; para = []; }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { flushPara(); i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara(); html += `<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`; i++; continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushPara(); html += '<hr />'; i++; continue; }
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      html += '<blockquote>' + mdInline(buf.join(' ')) + '</blockquote>';
      continue;
    }
    if (/^\s*([-*+])\s+/.test(line)) {
      flushPara();
      html += '<ul>';
      while (i < lines.length && /^\s*([-*+])\s+/.test(lines[i])) {
        html += '<li>' + mdInline(lines[i].replace(/^\s*([-*+])\s+/, '')) + '</li>'; i++;
      }
      html += '</ul>';
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      html += '<ol>';
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        html += '<li>' + mdInline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>'; i++;
      }
      html += '</ol>';
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara();
  return html;
}

// Plain-text first line for the collapsed preview — strip the markdown markers.
function notePreview(src) {
  const line = (src || '').split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/[*`_#>[\]]/g, '')
    .trim();
}

/*
  BudgetNotes — an unobtrusive, collapsible markdown note that lives quietly
  under the header. Three states keep it from ever dominating the ledger:
    · empty     → a single faint "Add a note" line
    · collapsed → a one-line summary (icon + first line) you can click to open
    · expanded  → rendered markdown with an Edit affordance
  Editing is a focused textarea; on blur / Esc / Save it renders again.
*/
function BudgetNotes({ value, onChange }) {
  const hasContent = (value || '').trim().length > 0;
  const [editing, setEditing] = usStateBF(false);
  const [expanded, setExpanded] = usStateBF(false);
  const [draft, setDraft] = usStateBF(value);
  const taRef = useRefBF(null);

  useEffBF(() => { setDraft(value); }, [value]);

  // When a budget has no note, collapse; otherwise leave the user's choice.
  useEffBF(() => { if (!hasContent) setExpanded(false); }, [value]);

  useEffBF(() => {
    if (editing && taRef.current) {
      const ta = taRef.current;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [editing]);

  function startEdit() { setExpanded(true); setEditing(true); }
  function commit() {
    setEditing(false);
    const next = draft;
    if (next !== value) onChange(next);
    setExpanded((next || '').trim().length > 0);
  }

  const railColor = 'hsl(var(--border))';

  // ── Editing ──
  if (editing) {
    return (
      <div className="page-enter" style={{ borderLeft: `2px solid ${railColor}`, paddingLeft: 14 }}>
        <NotesHeader />
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); commit(); } }}
          placeholder={'Write a note…  supports # heading, - list, **bold**, *italic*, `code`'}
          style={{
            width: '100%', minHeight: 96, resize: 'none', overflow: 'hidden',
            border: '1px solid hsl(var(--input))', borderRadius: 'var(--radius)',
            background: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
            padding: '10px 12px', fontSize: 13.5, lineHeight: 1.55, outline: 'none',
            fontFamily: 'inherit', boxShadow: '0 0 0 3px hsl(var(--ring) / 0.10)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginRight: 'auto' }}>
            Markdown · Esc or Save to render
          </span>
          <EqButton size="sm" onMouseDown={(e) => { e.preventDefault(); commit(); }}>
            <Icon name="check" size={13} color="hsl(var(--primary-foreground))" />
            Save
          </EqButton>
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!hasContent) {
    return (
      <button
        onClick={startEdit}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: 'none', background: 'transparent', cursor: 'pointer',
          padding: '5px 8px', borderRadius: 7, marginLeft: -8,
          color: 'hsl(var(--muted-foreground))', fontFamily: 'inherit', fontSize: 13,
          transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--accent))'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
      >
        <Icon name="note" size={15} color="currentColor" />
        Add a note
      </button>
    );
  }

  // ── Collapsed (one-line summary) ──
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          border: 'none', background: 'transparent', cursor: 'pointer',
          padding: '7px 8px', borderRadius: 8, marginLeft: -8, textAlign: 'left',
          fontFamily: 'inherit', transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--accent))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Icon name="note" size={15} color="hsl(var(--muted-foreground))" />
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, color: 'hsl(var(--foreground))',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {notePreview(value)}
        </span>
        <span style={{ display: 'inline-flex', transform: 'rotate(90deg)', flexShrink: 0 }}>
          <Icon name="chevron" size={14} color="hsl(var(--muted-foreground))" />
        </span>
      </button>
    );
  }

  // ── Expanded (rendered markdown) ──
  return (
    <div style={{ borderLeft: `2px solid ${railColor}`, paddingLeft: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon name="note" size={14} color="hsl(var(--muted-foreground))" />
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', flex: 1 }}>
          Notes
        </span>
        <EqButton variant="ghost" size="sm" onClick={startEdit} style={{ color: 'hsl(var(--muted-foreground))', padding: '3px 8px', height: 24 }}>
          <Icon name="edit" size={12} color="currentColor" />
          Edit
        </EqButton>
        <EqButton variant="ghost" size="icon-sm" onClick={() => setExpanded(false)} title="Collapse">
          <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
            <Icon name="chevron" size={14} color="hsl(var(--muted-foreground))" />
          </span>
        </EqButton>
      </div>
      <div
        className="md-body"
        onClick={startEdit}
        style={{ cursor: 'text' }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
      />
    </div>
  );
}

function NotesHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Icon name="note" size={14} color="hsl(var(--muted-foreground))" />
      <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))' }}>
        Notes
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Balance meter — a tuning gauge that nudges
   the user toward a balanced (fully-allocated)
   budget. Three states:
     · underspend → "Allocate more"
     · balanced   → "Balanced"
     · overspend  → "Over budget"
   ═══════════════════════════════════════ */
// State accents (kept local, like the lifecycle hues above).
const BAL_GREEN = 'hsl(var(--inflow))';
const BAL_AMBER = '#E0A02E';
// Overspend is a gentle heads-up, not an alarm — a muted warm orange, not red.
const BAL_OVER  = '#D98A52';

function BalanceMeter({ totalInflow, totalOutflow }) {
  const gap = totalOutflow - totalInflow;        // <0 under, 0 balanced, >0 over
  const empty = totalInflow === 0 && totalOutflow === 0;
  const balanced = !empty && gap === 0;
  const over = gap > 0;
  const under = gap < 0;

  // Needle position: 50% = balanced. ratio of the gap against inflow, clamped.
  const denom = totalInflow > 0 ? totalInflow : totalOutflow;
  let ratio = denom > 0 ? gap / denom : 0;
  if (ratio > 1) ratio = 1;
  if (ratio < -1) ratio = -1;
  const pos = empty ? 50 : 50 + ratio * 50;

  const accent = empty ? 'hsl(var(--muted-foreground))' : balanced ? BAL_GREEN : over ? BAL_OVER : BAL_AMBER;

  const state = empty
    ? { label: 'No records yet', hint: 'Add income and spending to see if your budget balances.', icon: 'plus' }
    : balanced
      ? { label: 'Balanced', hint: 'Every rupiah of income is allocated. Nicely done.', icon: 'check' }
      : over
        ? { label: 'Over budget', hint: `Spending is ${formatRp(gap)} above income — trim an outflow when you can to rebalance.`, icon: 'upload' }
        : { label: 'Needs allocating', hint: `${formatRp(-gap)} of income is unspent. Add or grow an outflow to balance.`, icon: 'arrowRight' };

  return (
    <EqCard style={{
      marginTop: 16,
      padding: '18px 22px',
      borderColor: balanced ? 'hsl(var(--inflow) / 0.45)' : over ? 'rgba(217,138,82,0.35)' : 'hsl(var(--border))',
      transition: 'border-color 0.25s',
    }}>
      {/* Headline row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: empty ? 'hsl(var(--secondary))' : balanced ? 'hsl(var(--inflow) / 0.14)' : over ? 'rgba(217,138,82,0.15)' : 'rgba(224,160,46,0.15)',
          color: accent,
        }}>
          <Icon name={state.icon} size={15} color={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: empty ? 'hsl(var(--muted-foreground))' : accent, lineHeight: 1.2 }}>
            {state.label}
          </div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', lineHeight: 1.3, marginTop: 2 }}>
            {state.hint}
          </div>
        </div>
        {/* Signed gap amount */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 19, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em', color: empty ? 'hsl(var(--muted-foreground))' : accent, lineHeight: 1,
          }}>
            {empty ? '—' : balanced ? formatRp(0) : `${over ? '−' : '+'} ${formatRp(Math.abs(gap))}`}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginTop: 5 }}>
            {over ? 'over' : under ? 'unspent' : 'difference'}
          </div>
        </div>
      </div>

      {/* Tuner track */}
      <div style={{ position: 'relative', height: 12 }}>
        {/* zones */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 9999, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: '44%', background: under && !empty ? 'rgba(224,160,46,0.30)' : 'hsl(var(--secondary))', transition: 'background 0.25s' }} />
          <div style={{ width: '12%', background: balanced ? 'hsl(var(--inflow) / 0.55)' : 'hsl(var(--inflow) / 0.20)', transition: 'background 0.25s' }} />
          <div style={{ width: '44%', background: over ? 'rgba(217,138,82,0.28)' : 'hsl(var(--secondary))', transition: 'background 0.25s' }} />
        </div>
        {/* center target ticks */}
        <div style={{ position: 'absolute', top: -3, bottom: -3, left: '50%', width: 1, background: 'hsl(var(--border))', transform: 'translateX(-0.5px)' }} />
        {/* needle */}
        <div style={{
          position: 'absolute', top: -3, bottom: -3, left: `${pos}%`,
          transform: 'translateX(-50%)',
          width: 5, borderRadius: 9999,
          background: accent,
          boxShadow: balanced ? '0 0 0 4px hsl(var(--inflow) / 0.20)' : '0 0 0 3px hsl(var(--background))',
          transition: 'left 0.35s cubic-bezier(0.22,1,0.36,1), background 0.25s, box-shadow 0.25s',
        }} />
      </div>

      {/* zone labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 11, fontWeight: under ? 600 : 500, color: under ? BAL_AMBER : 'hsl(var(--muted-foreground))', transition: 'color 0.2s' }}>
          Spend more
        </span>
        <span style={{ fontSize: 11, fontWeight: balanced ? 600 : 500, color: balanced ? BAL_GREEN : 'hsl(var(--muted-foreground))', transition: 'color 0.2s' }}>
          Balanced
        </span>
        <span style={{ fontSize: 11, fontWeight: over ? 600 : 500, color: over ? BAL_OVER : 'hsl(var(--muted-foreground))', transition: 'color 0.2s' }}>
          Over budget
        </span>
      </div>
    </EqCard>
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

Object.assign(window, { BudgetForm, TAccountColumn, StatusStepper, TagSummary, BalanceMeter, BudgetNotes });

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
