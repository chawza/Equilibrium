/* ═══════════════════════════════════════
   Dashboard — budget cards list
   ═══════════════════════════════════════ */

function Dashboard({ budgets, onSelectBudget, onCreateBudget }) {
  const [filterStart, setFilterStart] = React.useState('');
  const [filterEnd, setFilterEnd] = React.useState('');

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
          onClick={() => onSelectBudget(budget.id)} />
        )}
        </div>
      }
    </div>);

}

function BudgetCard({ budget, onClick }) {
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
    <EqCard hoverable dimmed={isClosed} onClick={onClick}>
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