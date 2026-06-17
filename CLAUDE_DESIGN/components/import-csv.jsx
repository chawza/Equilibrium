/* ═══════════════════════════════════════
   Import from CSV — drop area + preview
   ═══════════════════════════════════════ */
const { useState: useStateIC, useRef: useRefIC } = React;

/*
  DESIGN BEHAVIOUR — mock import.
  This prototype does NOT actually parse a CSV. Clicking the drop area (or
  dropping a file) immediately loads MOCK_IMPORT below so the preview can be
  designed without a real parser. In production, replace mockParse() with a
  real CSV → records parser and feed its output into the same `parsed` shape:
  an array of { budget, isNew, dateRange?, records:[{ emoji, label, type, amount, tags }] }.
*/
const MOCK_IMPORT = [
  {
    budget: 'August 2026',
    isNew: true,
    dateRange: 'Aug 1 – Aug 31, 2026',
    records: [
      { emoji: '💼', label: 'Salary',        type: 'inflow',  amount: 8500000, tags: ['wage', 'monthly'] },
      { emoji: '🏠', label: 'Rent',          type: 'outflow', amount: 2500000, tags: ['obligation', 'monthly'] },
      { emoji: '🛒', label: 'Groceries',     type: 'outflow', amount: 1180000, tags: ['grocery', 'weekly'] },
      { emoji: '⚡', label: 'Electricity',   type: 'outflow', amount: 370000,  tags: ['utility', 'monthly'] },
      { emoji: '📱', label: 'Phone plan',    type: 'outflow', amount: 120000,  tags: ['utility', 'monthly'] },
      { emoji: '💰', label: 'Emergency fund',type: 'outflow', amount: 1000000, tags: ['saving'] },
    ],
  },
  {
    budget: 'June 2026',
    isNew: false,
    records: [
      { emoji: '🚕', label: 'Airport taxi',   type: 'outflow', amount: 145000, tags: ['transport'] },
      { emoji: '☕', label: 'Coffee',         type: 'outflow', amount: 68000,  tags: ['dining'] },
      { emoji: '💵', label: 'Freelance gig',  type: 'inflow',  amount: 750000, tags: ['wage'] },
    ],
  },
];

function downloadImportTemplate() {
  const headers = ['emoji', 'label', 'type', 'amount', 'tags', 'notes'];
  const example1 = ['💼', 'Monthly Salary', 'inflow', '8500000', 'salary', 'March paycheck'];
  const example2 = ['🛒', 'Groceries', 'outflow', '450000', 'food;household', 'Weekly shop'];
  const rows = [headers, example1, example2].map(r => r.join(',')).join('\n');
  const blob = new Blob([rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equilibrium-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ImportCsv({ onBack, onConfirm }) {
  const [parsed, setParsed] = useStateIC(null);
  const [fileName, setFileName] = useStateIC('');
  const [dragOver, setDragOver] = useStateIC(false);
  // Per-record decision map: key `${gi}-${ri}` → false means declined.
  // A missing key means accepted (default). Toggleable until submit.
  const [declined, setDeclined] = useStateIC({});
  // Per-record type override: key `${gi}-${ri}` → 'inflow' | 'outflow'.
  // A missing key means use the parsed type. Toggleable until submit.
  const [typeOverride, setTypeOverride] = useStateIC({});

  // DESIGN BEHAVIOUR: ignore the real file, load the mock preview.
  function mockParse(name) {
    setFileName(name || 'budget-export.csv');
    setParsed(MOCK_IMPORT);
    setDeclined({});      // reset decisions on a fresh upload
    setTypeOverride({});  // reset type overrides too
  }

  function handleFileChange(e) {
    const f = e.target.files && e.target.files[0];
    mockParse(f ? f.name : ''); // DESIGN BEHAVIOUR — real parse would read `f`
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    mockParse(f ? f.name : ''); // DESIGN BEHAVIOUR — real parse would read `f`
  }

  function setDecision(key, accept) {
    setDeclined((prev) => {
      const next = { ...prev };
      if (accept) delete next[key]; else next[key] = true;
      return next;
    });
  }

  function toggleType(key, current) {
    setTypeOverride((prev) => ({ ...prev, [key]: current === 'inflow' ? 'outflow' : 'inflow' }));
  }

  const totalRecords = parsed ? parsed.reduce((n, g) => n + g.records.length, 0) : 0;
  const declinedCount = Object.keys(declined).length;
  const acceptedCount = totalRecords - declinedCount;

  return (
    <div className="page-enter" style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <EqButton variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back">
          <Icon name="back" size={16} />
        </EqButton>
        <h1 className="text-page-title">Import from CSV</h1>
      </div>
      <p className="text-caption" style={{ marginBottom: 24, marginLeft: 36 }}>
        Upload a CSV of records. Accept or decline each one before adding them to your budgets.
      </p>

      {/* Drop area */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, padding: '40px 24px', cursor: 'pointer', textAlign: 'center',
          border: `1.5px dashed hsl(var(--border))`,
          borderColor: dragOver ? 'hsl(var(--ring))' : 'hsl(var(--border))',
          background: dragOver ? 'hsl(var(--accent))' : 'hsl(var(--muted) / 0.35)',
          borderRadius: 'var(--radius)',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} style={{ display: 'none' }} />
        <div style={{
          width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))',
        }}>
          <Icon name="upload" size={20} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {dragOver ? 'Drop your CSV file' : 'Drag & drop a CSV file, or click to browse'}
          </div>
          <div className="text-caption" style={{ marginTop: 2 }}>Accepts .csv exported from Equilibrium</div>
        </div>
      </label>

      {/* Template download */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 }}>
        <span className="text-caption">Not sure about the format?</span>
        <button
          onClick={downloadImportTemplate}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 500, color: 'hsl(var(--foreground))',
            padding: 0, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          <Icon name="download" size={12} />
          Download template
        </button>
      </div>

      {/* Preview */}
      {parsed &&
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="text-section-heading">Preview</div>
              <div className="text-caption" style={{ marginTop: 2 }}>
                <span style={{ fontFamily: 'monospace' }}>{fileName}</span> · {totalRecords} records across {parsed.length} {parsed.length === 1 ? 'budget' : 'budgets'}
                {declinedCount > 0 && <span> · {declinedCount} declined</span>}
              </div>
            </div>
            <EqButton variant="ghost" size="sm" onClick={() => { setParsed(null); setFileName(''); setDeclined({}); }}>Clear</EqButton>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {parsed.map((group, gi) =>
              <ImportBudgetGroup
                key={gi}
                group={group}
                gi={gi}
                declined={declined}
                typeOverride={typeOverride}
                onDecide={setDecision}
                onToggleType={toggleType} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <EqButton variant="outline" size="md" onClick={onBack}>Cancel</EqButton>
            <EqButton variant="default" size="md" disabled={acceptedCount === 0} onClick={() => onConfirm(acceptedCount)}>
              Import {acceptedCount} {acceptedCount === 1 ? 'record' : 'records'}
            </EqButton>
          </div>
        </div>
      }
    </div>
  );
}

// A single budget's incoming records, grouped under its name.
function ImportBudgetGroup({ group, gi, declined, typeOverride, onDecide, onToggleType }) {
  const acceptedHere = group.records.filter((_, ri) => !declined[`${gi}-${ri}`]).length;
  return (
    <EqCard>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))',
      }}>
        <Icon name="grid" size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{group.budget}</span>
        <EqBadge style={group.isNew
          ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
          : undefined}>
          {group.isNew ? 'New budget' : 'Add to existing'}
        </EqBadge>
        {group.isNew && group.dateRange &&
          <span className="text-caption" style={{ color: 'hsl(var(--muted-foreground))' }}>{group.dateRange}</span>
        }
        <span className="text-caption" style={{ marginLeft: 'auto' }}>
          {acceptedHere} of {group.records.length} kept
        </span>
      </div>
      <div>
        {group.records.map((r, ri) => {
          const key = `${gi}-${ri}`;
          const effType = typeOverride[key] || r.type;
          return (
            <ImportRecordLine
              key={ri}
              record={r}
              type={effType}
              last={ri === group.records.length - 1}
              accepted={!declined[key]}
              onAccept={() => onDecide(key, true)}
              onDecline={() => onDecide(key, false)}
              onToggleType={() => onToggleType(key, effType)} />
          );
        })}
      </div>
    </EqCard>
  );
}

// Preview line for one incoming record, with accept/decline + type toggle.
function ImportRecordLine({ record, type, last, accepted, onAccept, onDecline, onToggleType }) {
  const isInflow = type === 'inflow';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 16px',
      borderBottom: last ? 'none' : '1px solid hsl(var(--border) / 0.6)',
      background: accepted ? 'transparent' : 'hsl(var(--destructive) / 0.05)',
      transition: 'background 0.15s',
    }}>
      <span style={{
        fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0,
        opacity: accepted ? 1 : 0.4,
      }}>{record.emoji}</span>
      <span style={{
        fontSize: 13, fontWeight: 500, flexShrink: 0,
        textDecoration: accepted ? 'none' : 'line-through',
        color: accepted ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
      }}>{record.label}</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, minWidth: 0, opacity: accepted ? 1 : 0.4 }}>
        {(record.tags || []).map((t) => <TagBadge key={t} tag={t} dot />)}
      </div>

      {/* Inflow / outflow toggle — switchable until submit */}
      <button
        type="button"
        onClick={onToggleType}
        title="Toggle inflow / outflow"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
          border: 'none', background: 'transparent', cursor: 'pointer',
          padding: '2px 6px', borderRadius: 6, fontFamily: 'inherit',
          opacity: accepted ? 1 : 0.5,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--accent))'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          color: isInflow ? 'hsl(var(--inflow))' : 'hsl(var(--outflow))',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
            {isInflow
              ? <path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M12 19V5m0 0l-6 6m6-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </span>
        <span className={`text-amount ${isInflow ? 'amount-inflow' : 'amount-outflow'}`}
          style={{ textDecoration: accepted ? 'none' : 'line-through' }}>
          {isInflow ? '+' : '−'}{formatRp(record.amount)}
        </span>
      </button>

      {/* Accept / decline toggle — switchable until submit */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 2 }}>
        <DecideButton
          active={accepted}
          activeBg="hsl(142 71% 45% / 0.15)"
          activeColor="hsl(142 71% 38%)"
          icon="check"
          title="Accept"
          onClick={onAccept} />
        <DecideButton
          active={!accepted}
          activeBg="hsl(var(--destructive) / 0.15)"
          activeColor="hsl(var(--destructive))"
          icon="x"
          title="Decline"
          onClick={onDecline} />
      </div>
    </div>
  );
}

function DecideButton({ active, activeBg, activeColor, icon, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      style={{
        width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid ' + (active ? 'transparent' : 'hsl(var(--border))'),
        background: active ? activeBg : 'transparent',
        color: active ? activeColor : 'hsl(var(--muted-foreground))',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'hsl(var(--accent))'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon name={icon} size={14} color="currentColor" />
    </button>
  );
}

Object.assign(window, { ImportCsv, downloadImportTemplate });
