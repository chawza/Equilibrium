/* ═══════════════════════════════════════
   Dashboard — budget cards list
   ═══════════════════════════════════════ */

function Dashboard({ budgets, onSelectBudget, onCreateBudget, onDeleteBudget, onDuplicateBudget }) {
  const [filterStart, setFilterStart] = React.useState('');
  const [filterEnd, setFilterEnd] = React.useState('');

  // Right-click context menu + the two modal flows it triggers.
  const [menu, setMenu] = React.useState(null);       // { budget, x, y }
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [dupTarget, setDupTarget] = React.useState(null);

  function openMenu(budget, e) {
    e.preventDefault();
    setMenu({ budget, x: e.clientX, y: e.clientY });
  }

  // 'YYYY-MM-DD' (local) → epoch ms; endOfDay pushes to 23:59:59.
  function ymdToTime(v, endOfDay) {
    if (!v) return null;
    const [y, m, d] = v.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (endOfDay) dt.setHours(23, 59, 59, 999);
    return dt.getTime();
  }
  const fStart = ymdToTime(filterStart, false);
  const fEnd = ymdToTime(filterEnd, true);
  const filterActive = fStart !== null || fEnd !== null;

  // Keep a budget if its date range overlaps the filter window.
  function inRange(b) {
    if (!filterActive) return true;
    const bs = parseBudgetDate(b.startDate);
    const be = parseBudgetDate(b.endDate);
    if (!bs || !be) return false;
    be.setHours(23, 59, 59, 999);
    const bStart = bs.getTime();
    const bEnd = be.getTime();
    if (fStart !== null && bEnd < fStart) return false;
    if (fEnd !== null && bStart > fEnd) return false;
    return true;
  }

  // Order top→bottom: active (needs review) → active → plan → closed.
  function rank(b) {
    if (b.status === 'active') return budgetNeedsReview(b) ? 0 : 1;
    if (b.status === 'plan') return 2;
    if (b.status === 'closed') return 3;
    return 4;
  }
  const sorted = budgets.filter(inRange).sort((a, b) => {
    const r = rank(a) - rank(b);
    return r !== 0 ? r : b.id - a.id;
  });

  const dateInputStyle = {
    height: 32, padding: '0 8px', fontSize: 13, fontFamily: 'inherit',
    border: '1px solid hsl(var(--input))', borderRadius: 'var(--radius)',
    background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
    outline: 'none', cursor: 'pointer'
  };

  return (
    <div className="page-enter" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <h1 className="text-page-title">Budgets</h1>
        <EqButton size="sm" onClick={onCreateBudget}>
          <Icon name="plus" size={15} color="hsl(var(--primary-foreground))" />
          New budget
        </EqButton>
      </div>

      {/* Date-range filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        <span className="text-caption" style={{ marginRight: 2 }}>Dates</span>
        <input
          type="date"
          value={filterStart}
          max={filterEnd || undefined}
          onChange={(e) => setFilterStart(e.target.value)}
          aria-label="Filter from date"
          style={dateInputStyle} />
        <span className="text-caption">→</span>
        <input
          type="date"
          value={filterEnd}
          min={filterStart || undefined}
          onChange={(e) => setFilterEnd(e.target.value)}
          aria-label="Filter to date"
          style={dateInputStyle} />
        {filterActive &&
        <button
          type="button"
          onClick={() => {setFilterStart('');setFilterEnd('');}}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 6px',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: 'hsl(var(--muted-foreground))'
          }}>
            Clear
          </button>
        }
      </div>

      {/* Budget cards */}
      {sorted.length === 0 ?
      <div className="text-caption" style={{ textAlign: 'center', padding: '48px 0' }}>
          {filterActive ? 'No budgets overlap this date range.' : 'No budgets yet.'}
        </div> :

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((budget) =>
        <BudgetCard
          key={budget.id}
          budget={budget}
          onClick={() => onSelectBudget(budget.id)}
          onContextMenu={(e) => openMenu(budget, e)} />
        )}
        </div>
      }

      {/* Right-click context menu */}
      {menu &&
      <BudgetContextMenu
        x={menu.x}
        y={menu.y}
        onClose={() => setMenu(null)}
        onDuplicate={() => { setDupTarget(menu.budget); setMenu(null); }}
        onDelete={() => { setDeleteTarget(menu.budget); setMenu(null); }} />
      }

      {/* Delete confirmation */}
      {deleteTarget &&
      <DeleteBudgetModal
        budget={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => { onDeleteBudget(deleteTarget.id); setDeleteTarget(null); }} />
      }

      {/* Duplicate form */}
      {dupTarget &&
      <DuplicateBudgetModal
        source={dupTarget}
        onCancel={() => setDupTarget(null)}
        onConfirm={(fields) => { setDupTarget(null); onDuplicateBudget(dupTarget.id, fields); }} />
      }
    </div>);

}

function BudgetCard({ budget, onClick, onContextMenu }) {
  const inflow = budget.records.
  filter((r) => r.type === 'inflow').
  reduce((s, r) => s + r.amount, 0);
  const outflow = budget.records.
  filter((r) => r.type === 'outflow').
  reduce((s, r) => s + r.amount, 0);
  const net = inflow - outflow;
  const isClosed = budget.status === 'closed';
  const needsReview = budgetNeedsReview(budget);
  const overdue = needsReview ? daysOverdue(budget) : 0;

  return (
    <EqCard hoverable dimmed={isClosed} onClick={onClick} onContextMenu={onContextMenu}>
      <div style={{ padding: '14px 18px' }}>
        {/* Top row: name + status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {budget.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {needsReview && <NeedsReviewBadge />}
            <StatusBadge status={budget.status} />
          </div>
        </div>

        {/* Date range */}
        <div className="text-caption" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{budget.startDate} – {budget.endDate}</span>
          {needsReview &&
          <span style={{ color: tagText('amber'), fontWeight: 500 }}>
              · ended {overdue === 0 ? 'today' : `${overdue} day${overdue === 1 ? '' : 's'} ago`}
            </span>
          }
        </div>

        {/* Amounts row */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--inflow))', fontWeight: 500 }}>↑</span>
            <span className="text-amount amount-inflow">{formatRp(inflow)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--outflow))', fontWeight: 500 }}>↓</span>
            <span className="text-amount amount-outflow">{formatRp(outflow)}</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className="text-amount" style={{
              color: net >= 0 ? 'hsl(var(--inflow))' : 'hsl(var(--destructive))'
            }}>
              {net >= 0 ? '+' : ''}{formatRp(Math.abs(net))}
            </span>
          </div>
        </div>
      </div>
    </EqCard>);

}

// ─── "Needs review" indicator ───
// Shown when an active budget's date range has elapsed but it was never
// advanced to the Review stage. Amber draws attention without alarm (red
// is reserved for over-budget / destructive states).
function NeedsReviewBadge() {
  const bg = tagFill('amber');
  const fg = tagText('amber');
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px 2px 6px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: '18px',
      whiteSpace: 'nowrap',
      background: bg,
      color: fg
    }}>
      <Icon name="alert" size={13} color={fg} />
      Needs review
    </span>);

}

Object.assign(window, { Dashboard, BudgetCard, NeedsReviewBadge });


/* ═══════════════════════════════════════
   Budget context menu + delete / duplicate modals
   ═══════════════════════════════════════ */

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Stored display string ('Jun 1, 2026') → 'YYYY-MM-DD' for <input type=date>.
function budgetDateToYmd(str) {
  const d = parseBudgetDate(str);
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// 'YYYY-MM-DD' → stored display string ('Jun 1, 2026').
function ymdToBudgetDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`;
}

// Centered modal shell — matches the onboarding chrome (dim backdrop, Esc to close).
function EqModalShell({ onClose, width = 420, children }) {
  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed', inset: 0, zIndex: 500, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        background: 'rgba(9, 11, 16, 0.55)', backdropFilter: 'blur(2px)',
        animation: 'pageEnter 0.15s ease-out'
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: width, background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))', borderRadius: 'calc(var(--radius) + 2px)',
          boxShadow: '0 14px 44px rgba(0,0,0,0.28)', overflow: 'hidden'
        }}>
        {children}
      </div>
    </div>);

}

// Fixed-position menu anchored at the cursor, clamped to the viewport.
function BudgetContextMenu({ x, y, onClose, onDuplicate, onDelete }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState({ x, y });

  React.useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDoc, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let nx = x, ny = y;
    if (x + r.width > window.innerWidth - 8) nx = window.innerWidth - r.width - 8;
    if (y + r.height > window.innerHeight - 8) ny = window.innerHeight - r.height - 8;
    setPos({ x: Math.max(8, nx), y: Math.max(8, ny) });
  }, [x, y]);

  function Item({ icon, label, color, onClick }) {
    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 5,
          color: color || 'hsl(var(--popover-foreground))', transition: 'background 0.1s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--accent))'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
        <Icon name={icon} size={15} color={color || 'hsl(var(--muted-foreground))'} />
        {label}
      </div>);
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', top: pos.y, left: pos.x, zIndex: 600, minWidth: 176,
        background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
        borderRadius: 'var(--radius)', boxShadow: '0 10px 32px rgba(0,0,0,0.18)',
        padding: 4, animation: 'pageEnter 0.1s ease-out'
      }}>
      <Item icon="copy" label="Duplicate" onClick={onDuplicate} />
      <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '4px 6px' }} />
      <Item icon="trash" label="Delete" color="hsl(var(--destructive))" onClick={onDelete} />
    </div>);

}

// Delete confirmation — names the budget and notes its record count.
function DeleteBudgetModal({ budget, onCancel, onConfirm }) {
  const count = budget.records.length;
  return (
    <EqModalShell onClose={onCancel} width={400}>
      <div style={{ padding: '22px 22px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'hsl(var(--destructive) / 0.12)'
          }}>
            <Icon name="trash" size={17} color="hsl(var(--destructive))" />
          </div>
          <div className="text-section-heading">Delete budget</div>
        </div>
        <p className="text-caption" style={{ lineHeight: 1.6, marginBottom: 0 }}>
          “{budget.name}”{count > 0 ? ` and its ${count} record${count !== 1 ? 's' : ''}` : ''} will be
          permanently deleted. This can’t be undone.
        </p>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        padding: '12px 18px', borderTop: '1px solid hsl(var(--border))',
        background: 'hsl(var(--muted) / 0.3)'
      }}>
        <EqButton variant="ghost" size="sm" onClick={onCancel}>Cancel</EqButton>
        <EqButton variant="destructive" size="sm" onClick={onConfirm}>
          <Icon name="trash" size={14} color="hsl(var(--destructive-foreground))" />
          Delete
        </EqButton>
      </div>
    </EqModalShell>);

}

// Duplicate form — edit title + date range, then clone records into a new budget.
function DuplicateBudgetModal({ source, onCancel, onConfirm }) {
  const [name, setName] = React.useState(`${source.name} (copy)`);
  const [start, setStart] = React.useState(budgetDateToYmd(source.startDate));
  const [end, setEnd] = React.useState(budgetDateToYmd(source.endDate));
  const [error, setError] = React.useState('');
  const count = source.records.length;

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Give the new budget a name.'); return; }
    if (!start || !end) { setError('Both a start and end date are required.'); return; }
    if (end < start) { setError('The end date must be on or after the start date.'); return; }
    onConfirm({ name: trimmed, startDate: ymdToBudgetDate(start), endDate: ymdToBudgetDate(end) });
  }

  const dateInputStyle = {
    height: 34, width: '100%', padding: '0 10px', fontSize: 13, fontFamily: 'inherit',
    border: '1px solid hsl(var(--input))', borderRadius: 'var(--radius)',
    background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
    outline: 'none', cursor: 'pointer'
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'hsl(var(--muted-foreground))', marginBottom: 6 };

  return (
    <EqModalShell onClose={onCancel} width={440}>
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'hsl(var(--accent))'
          }}>
            <Icon name="copy" size={16} color="hsl(var(--foreground))" />
          </div>
          <div>
            <div className="text-section-heading">Duplicate budget</div>
            <div className="text-caption">
              Copies {count} record{count !== 1 ? 's' : ''} from “{source.name}” into a new plan.
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 22px 20px' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Title</label>
          <EqInput
            value={name}
            onChange={setName}
            placeholder="Budget name"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start date</label>
            <input
              type="date"
              value={start}
              max={end || undefined}
              onChange={(e) => setStart(e.target.value)}
              style={dateInputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End date</label>
            <input
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              style={dateInputStyle} />
          </div>
        </div>
        {error && <div style={{ fontSize: 12, color: 'hsl(var(--destructive))', marginTop: 12 }}>{error}</div>}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        padding: '12px 18px', borderTop: '1px solid hsl(var(--border))',
        background: 'hsl(var(--muted) / 0.3)'
      }}>
        <EqButton variant="ghost" size="sm" onClick={onCancel}>Cancel</EqButton>
        <EqButton size="sm" onClick={submit}>
          <Icon name="copy" size={14} color="hsl(var(--primary-foreground))" />
          Duplicate
        </EqButton>
      </div>
    </EqModalShell>);

}

Object.assign(window, {
  EqModalShell, BudgetContextMenu, DeleteBudgetModal, DuplicateBudgetModal,
  budgetDateToYmd, ymdToBudgetDate
});


/* ═══════════════════════════════════════
   Tag Manager — rename, recolor, create, delete
   ═══════════════════════════════════════ */

// Small preview pill that reflects a draft name + color (not the live registry).
function TagPreview({ name, color }) {
  const fill = tagFill(color);
  const text = tagText(color);
  const dot = tagDot(color);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 9999,
      fontSize: 12, fontWeight: 500, lineHeight: '18px',
      whiteSpace: 'nowrap', background: fill, color: text
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {name || 'tag name'}
    </span>);

}

// Row of color swatches.
function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {TAG_COLORS.map((c) => {
        const selected = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: TAG_DOT[c], border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              outline: selected ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
              outlineOffset: 2, transition: 'outline-color 0.12s'
            }}>
            
            {selected && <Icon name="check" size={13} color="#fff" />}
          </button>);

      })}
    </div>);

}

function TagManager({ budgets, onCreate, onOpenTag }) {
  const usage = React.useMemo(() => {
    const u = {};
    (budgets || []).forEach((b) => (b.records || []).forEach((r) =>
    (r.tags || []).forEach((t) => {u[t] = (u[t] || 0) + 1;})
    ));
    return u;
  }, [budgets]);

  const tags = allTags().slice().sort((a, b) => a.localeCompare(b));

  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newColor, setNewColor] = React.useState('blue');
  const [error, setError] = React.useState('');

  function startCreate() {
    setCreating(true);
    setNewName('');
    setNewColor('blue');
    setError('');
  }
  function saveNew() {
    const name = newName.trim().toLowerCase();
    if (!name) {setError('Tag name cannot be empty.');return;}
    if (tags.includes(name)) {setError(`A tag named "${name}" already exists.`);return;}
    onCreate(name, newColor);
    setCreating(false);
    setNewName('');
    setError('');
  }

  // ─── Filter (by title) + sort (by reference count) + pagination ───
  const [query, setQuery] = React.useState('');
  const [countSort, setCountSort] = React.useState('none'); // none (A–Z) | desc | asc
  const [pageNum, setPageNum] = React.useState(0);

  // Rows per page.
  const TAG_PAGE_SIZE = 10;

  const filtered = tags.
  filter((t) => !query.trim() || t.toLowerCase().includes(query.trim().toLowerCase())).
  sort((a, b) => {
    if (countSort === 'none') return a.localeCompare(b);
    const d = (usage[a] || 0) - (usage[b] || 0);
    const dir = countSort === 'asc' ? d : -d;
    return dir !== 0 ? dir : a.localeCompare(b);
  });

  React.useEffect(() => {setPageNum(0);}, [query, countSort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TAG_PAGE_SIZE));
  const clampedPage = Math.min(pageNum, totalPages - 1);
  const pageTags = filtered.slice(clampedPage * TAG_PAGE_SIZE, clampedPage * TAG_PAGE_SIZE + TAG_PAGE_SIZE);
  const sortOptions = [['none', 'A–Z'], ['desc', 'Most used'], ['asc', 'Least used']];

  return (
    <div className="page-enter" style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="text-page-title">Tags</h1>
        <EqButton size="sm" onClick={startCreate}>
          <Icon name="plus" size={14} color="hsl(var(--primary-foreground))" />
          New tag
        </EqButton>
      </div>
      <p className="text-caption" style={{ marginBottom: 22 }}>
        {tags.length} tag{tags.length !== 1 ? 's' : ''} · select a tag to view its records and edit it.
      </p>

      {/* Create form */}
      {creating &&
      <EqCard style={{ marginBottom: 14, borderColor: 'hsl(var(--ring) / 0.4)' }}>
          <div style={{ padding: '16px 18px' }}>
            <div className="text-section-heading" style={{ marginBottom: 12 }}>New tag</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <EqInput
              value={newName}
              onChange={setNewName}
              placeholder="e.g. subscription"
              autoFocus
              onKeyDown={(e) => {if (e.key === 'Enter') saveNew();if (e.key === 'Escape') setCreating(false);}}
              style={{ flex: 1 }} />
            
              <TagPreview name={newName.trim().toLowerCase()} color={newColor} />
            </div>
            <ColorPicker value={newColor} onChange={setNewColor} />
            {error && <div style={{ fontSize: 12, color: 'hsl(var(--destructive))', marginTop: 12 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <EqButton variant="ghost" size="sm" onClick={() => {setCreating(false);setError('');}}>Cancel</EqButton>
              <EqButton size="sm" onClick={saveNew}>Create tag</EqButton>
            </div>
          </div>
        </EqCard>
      }

      {/* Filter by title + sort by reference count */}
      {tags.length > 0 &&
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <EqInput value={query} onChange={setQuery} placeholder="Filter tags by title…" />
          </div>
          <div style={{ display: 'flex', background: 'hsl(var(--secondary))', borderRadius: 8, padding: 2, gap: 2, flexShrink: 0 }}>
            {sortOptions.map(([val, label]) =>
          <button
            key={val}
            type="button"
            onClick={() => setCountSort(val)}
            style={{
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              padding: '6px 12px', borderRadius: 6,
              background: countSort === val ? 'hsl(var(--background))' : 'transparent',
              color: countSort === val ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
              boxShadow: countSort === val ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              transition: 'background 0.12s, color 0.12s'
            }}>
                {label}
              </button>
          )}
          </div>
        </div>
      }

      {/* Tag list */}
      <EqCard>
        {tags.length === 0 ?
        <div className="text-caption" style={{ padding: '28px 18px', textAlign: 'center' }}>
            No tags yet. Create one to get started.
          </div> :
        filtered.length === 0 ?
        <div className="text-caption" style={{ padding: '28px 18px', textAlign: 'center' }}>
            No tags match your search.
          </div> :

        <div>
            {pageTags.map((tag, i) => {
            const count = usage[tag] || 0;
            return (
              <React.Fragment key={tag}>
                  {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0 18px' }} />}
                  <div
                  onClick={() => onOpenTag && onOpenTag(tag)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'hsl(var(--accent) / 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 150, flexShrink: 0 }}>
                        <TagBadge tag={tag} dot />
                      </div>
                      <div className="text-caption" style={{ flex: 1 }}>
                        {count > 0 ? `Used in ${count} record${count !== 1 ? 's' : ''}` : 'Unused'}
                      </div>
                      <Icon name="back" size={15} color="hsl(var(--muted-foreground))" style={{ transform: 'rotate(180deg)', opacity: 0.45 }} />
                    </div>
                </React.Fragment>);

          })}
          </div>
        }
      </EqCard>

      {/* Pagination */}
      {filtered.length > 0 && totalPages > 1 &&
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span className="text-caption">{filtered.length} tag{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EqButton variant="outline" size="icon-sm" disabled={clampedPage <= 0} onClick={() => setPageNum((p) => Math.max(0, p - 1))}>
              <Icon name="back" size={14} color="hsl(var(--foreground))" />
            </EqButton>
            <span className="text-caption">{clampedPage + 1} / {totalPages}</span>
            <EqButton variant="outline" size="icon-sm" disabled={clampedPage >= totalPages - 1} onClick={() => setPageNum((p) => Math.min(totalPages - 1, p + 1))}>
              <Icon name="back" size={14} color="hsl(var(--foreground))" style={{ transform: 'rotate(180deg)' }} />
            </EqButton>
          </div>
        </div>
      }
    </div>);

}

Object.assign(window, { TagManager });


/* ═══════════════════════════════════════
   Tag Detail — edit form + searchable, filterable,
   paginated list of records carrying this tag
   ═══════════════════════════════════════ */

const TAG_DETAIL_PAGE_SIZE = 6;

// One record line in the tag-detail list. Clicking opens its budget.
function TagDetailRecordRow({ r, onClick }) {
  const isIn = r.type === 'inflow';
  const color = isIn ? 'hsl(var(--inflow))' : 'hsl(var(--outflow))';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderLeft: r.is_adjustment ? '3px solid #D97706' : '3px solid transparent',
        cursor: onClick ? 'pointer' : 'default', transition: 'background 0.1s'
      }}
      onMouseEnter={(e) => {if (onClick) e.currentTarget.style.background = 'hsl(var(--accent) / 0.5)';}}
      onMouseLeave={(e) => {if (onClick) e.currentTarget.style.background = 'transparent';}}>
      <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{r.emoji || '📝'}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.label || 'Untitled'}
        </div>
        <div className="text-caption">
          {r.budgetName}{r.is_adjustment ? ' · adjustment' : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color }}>{isIn ? '↑' : '↓'}</span>
        <span className="text-amount" style={{ color }}>{formatRp(r.amount)}</span>
      </div>
    </div>);

}

function TagDetail({ tag, budgets, onBack, onRename, onRecolor, onDelete, onOpenBudget }) {
  const colorKey = tagColor(tag);
  const [draftName, setDraftName] = React.useState(tag);
  const [draftColor, setDraftColor] = React.useState(colorKey);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all'); // all | inflow | outflow
  const [pageNum, setPageNum] = React.useState(0);

  // Re-sync the edit form whenever we land on a different tag (e.g. after rename).
  React.useEffect(() => {
    setDraftName(tag);
    setDraftColor(tagColor(tag));
    setError('');
  }, [tag]);

  // All records carrying this tag, annotated with their budget.
  const records = React.useMemo(() => {
    const out = [];
    (budgets || []).forEach((b) =>
    (b.records || []).forEach((r) => {
      if (r.tags && r.tags.includes(tag)) out.push({ ...r, budgetId: b.id, budgetName: b.name, budgetStatus: b.status });
    })
    );
    return out;
  }, [budgets, tag]);

  const inflowSum = records.filter((r) => r.type === 'inflow').reduce((s, r) => s + r.amount, 0);
  const outflowSum = records.filter((r) => r.type === 'outflow').reduce((s, r) => s + r.amount, 0);

  const filtered = records.filter((r) => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (query.trim() && !(r.label || '').toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  // Reset to first page whenever the query / filter / tag changes.
  React.useEffect(() => {setPageNum(0);}, [query, typeFilter, tag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TAG_DETAIL_PAGE_SIZE));
  const clampedPage = Math.min(pageNum, totalPages - 1);
  const pageItems = filtered.slice(clampedPage * TAG_DETAIL_PAGE_SIZE, clampedPage * TAG_DETAIL_PAGE_SIZE + TAG_DETAIL_PAGE_SIZE);

  const dirty = draftName.trim().toLowerCase() !== tag || draftColor !== tagColor(tag);

  function save() {
    const name = draftName.trim().toLowerCase();
    if (!name) {setError('Tag name cannot be empty.');return;}
    if (name !== tag && allTags().includes(name)) {
      setError(`A tag named "${name}" already exists.`);return;
    }
    if (name !== tag) onRename(tag, name); // parent re-points selectedTag
    if (draftColor !== tagColor(tag) || name !== tag) onRecolor(name, draftColor);
    setError('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const filters = [['all', 'All'], ['inflow', 'Inflow'], ['outflow', 'Outflow']];

  return (
    <div className="page-enter" style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 18,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: 'hsl(var(--muted-foreground))'
        }}>
        <Icon name="back" size={15} color="hsl(var(--muted-foreground))" />
        All tags
      </button>

      {/* Edit form */}
      <EqCard style={{ marginBottom: 18 }}>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TagPreview name={draftName.trim().toLowerCase()} color={draftColor} />
            <span className="text-caption">
              {records.length} record{records.length !== 1 ? 's' : ''}
              {outflowSum > 0 && <> · <span style={{ color: 'hsl(var(--outflow))' }}>↓ {formatRp(outflowSum)}</span></>}
              {inflowSum > 0 && <> · <span style={{ color: 'hsl(var(--inflow))' }}>↑ {formatRp(inflowSum)}</span></>}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <EqInput
              value={draftName}
              onChange={setDraftName}
              placeholder="Tag name"
              onKeyDown={(e) => {if (e.key === 'Enter') save();}}
              style={{ flex: 1 }} />
          </div>
          <ColorPicker value={draftColor} onChange={setDraftColor} />
          {error && <div style={{ fontSize: 12, color: 'hsl(var(--destructive))', marginTop: 12 }}>{error}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
            <ConfirmPopover
              message={records.length > 0 ?
              `Delete "${tag}"? It will be removed from ${records.length} record${records.length !== 1 ? 's' : ''}.` :
              `Delete "${tag}"?`}
              onConfirm={() => onDelete(tag)}>
              <EqButton variant="ghost" size="sm" style={{ color: 'hsl(var(--destructive))' }}>
                <Icon name="trash" size={14} color="hsl(var(--destructive))" />
                Delete
              </EqButton>
            </ConfirmPopover>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saved && <span className="text-caption" style={{ color: 'hsl(var(--inflow))' }}>Saved</span>}
              <EqButton size="sm" disabled={!dirty} onClick={save}>Save changes</EqButton>
            </div>
          </div>
        </div>
      </EqCard>

      {/* Records section */}
      <div className="text-section-heading" style={{ marginBottom: 12 }}>Records</div>

      {/* Search + type filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <EqInput value={query} onChange={setQuery} placeholder="Search records by title…" />
        </div>
        <div style={{ display: 'flex', background: 'hsl(var(--secondary))', borderRadius: 8, padding: 2, gap: 2, flexShrink: 0 }}>
          {filters.map(([val, label]) =>
          <button
            key={val}
            type="button"
            onClick={() => setTypeFilter(val)}
            style={{
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              padding: '6px 12px', borderRadius: 6,
              background: typeFilter === val ? 'hsl(var(--background))' : 'transparent',
              color: typeFilter === val ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
              boxShadow: typeFilter === val ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              transition: 'background 0.12s, color 0.12s'
            }}>
            {label}
          </button>
          )}
        </div>
      </div>

      {/* List */}
      <EqCard>
        {filtered.length === 0 ?
        <div className="text-caption" style={{ padding: '28px 18px', textAlign: 'center' }}>
            {records.length === 0 ? 'No records use this tag yet.' : 'No records match your search.'}
          </div> :

        <div>
            {pageItems.map((r, i) =>
          <React.Fragment key={r.id}>
                {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0 16px' }} />}
                <TagDetailRecordRow r={r} onClick={onOpenBudget ? () => onOpenBudget(r.budgetId) : undefined} />
              </React.Fragment>
          )}
          </div>
        }
      </EqCard>

      {/* Pagination */}
      {filtered.length > 0 &&
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span className="text-caption">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          {totalPages > 1 &&
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <EqButton variant="outline" size="icon-sm" disabled={clampedPage <= 0} onClick={() => setPageNum((p) => Math.max(0, p - 1))}>
                <Icon name="back" size={14} color="hsl(var(--foreground))" />
              </EqButton>
              <span className="text-caption">{clampedPage + 1} / {totalPages}</span>
              <EqButton variant="outline" size="icon-sm" disabled={clampedPage >= totalPages - 1} onClick={() => setPageNum((p) => Math.min(totalPages - 1, p + 1))}>
                <Icon name="back" size={14} color="hsl(var(--foreground))" style={{ transform: 'rotate(180deg)' }} />
              </EqButton>
            </div>
        }
        </div>
      }
    </div>);

}

Object.assign(window, { TagDetail, TagDetailRecordRow });