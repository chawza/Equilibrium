/* ═══════════════════════════════════════
   Dashboard — budget cards list
   ═══════════════════════════════════════ */

function Dashboard({ budgets, onSelectBudget, onCreateBudget }) {
  // Sort: active → plan → review → closed, then by id desc
  const statusOrder = { active: 0, plan: 1, review: 2, closed: 3 };
  const sorted = [...budgets].sort((a, b) => {
    const s = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    return s !== 0 ? s : b.id - a.id;
  });

  return (
    <div className="page-enter" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <h1 className="text-page-title">Budgets</h1>
        <EqButton size="sm" onClick={onCreateBudget}>
          <Icon name="plus" size={15} color="hsl(var(--primary-foreground))" />
          New budget
        </EqButton>
      </div>

      {/* Budget cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(budget => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            onClick={() => onSelectBudget(budget.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BudgetCard({ budget, onClick }) {
  const inflow = budget.records
    .filter(r => r.type === 'inflow')
    .reduce((s, r) => s + r.amount, 0);
  const outflow = budget.records
    .filter(r => r.type === 'outflow')
    .reduce((s, r) => s + r.amount, 0);
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
          marginBottom: 4,
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
          {needsReview && (
            <span style={{ color: tagText('amber'), fontWeight: 500 }}>
              · ended {overdue === 0 ? 'today' : `${overdue} day${overdue === 1 ? '' : 's'} ago`}
            </span>
          )}
        </div>

        {/* Amounts row */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 24,
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
              color: net >= 0 ? 'hsl(var(--inflow))' : 'hsl(var(--destructive))',
            }}>
              {net >= 0 ? '+' : ''}{formatRp(Math.abs(net))}
            </span>
          </div>
        </div>
      </div>
    </EqCard>
  );
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
      color: fg,
    }}>
      <Icon name="alert" size={13} color={fg} />
      Needs review
    </span>
  );
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
      whiteSpace: 'nowrap', background: fill, color: text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {name || 'tag name'}
    </span>
  );
}

// Row of color swatches.
function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {TAG_COLORS.map(c => {
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
              outlineOffset: 2, transition: 'outline-color 0.12s',
            }}
          >
            {selected && <Icon name="check" size={13} color="#fff" />}
          </button>
        );
      })}
    </div>
  );
}

function TagManager({ budgets, onRename, onRecolor, onDelete, onCreate }) {
  const usage = React.useMemo(() => {
    const u = {};
    (budgets || []).forEach(b => (b.records || []).forEach(r =>
      (r.tags || []).forEach(t => { u[t] = (u[t] || 0) + 1; })
    ));
    return u;
  }, [budgets]);

  const tags = allTags().slice().sort((a, b) => a.localeCompare(b));

  const [editing, setEditing] = React.useState(null);
  const [draftName, setDraftName] = React.useState('');
  const [draftColor, setDraftColor] = React.useState('gray');
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newColor, setNewColor] = React.useState('blue');
  const [error, setError] = React.useState('');

  function startEdit(tag) {
    setCreating(false);
    setEditing(tag);
    setDraftName(tag);
    setDraftColor(tagColor(tag));
    setError('');
  }
  function cancelEdit() { setEditing(null); setError(''); }

  function saveEdit(orig) {
    const name = draftName.trim().toLowerCase();
    if (!name) { setError('Tag name cannot be empty.'); return; }
    if (name !== orig && tags.includes(name)) {
      setError(`A tag named "${name}" already exists.`); return;
    }
    const finalName = name !== orig ? name : orig;
    if (name !== orig) onRename(orig, name);
    if (draftColor !== tagColor(orig) || name !== orig) onRecolor(finalName, draftColor);
    setEditing(null);
    setError('');
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setNewName('');
    setNewColor('blue');
    setError('');
  }
  function saveNew() {
    const name = newName.trim().toLowerCase();
    if (!name) { setError('Tag name cannot be empty.'); return; }
    if (tags.includes(name)) { setError(`A tag named "${name}" already exists.`); return; }
    onCreate(name, newColor);
    setCreating(false);
    setNewName('');
    setError('');
  }

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
        {tags.length} tag{tags.length !== 1 ? 's' : ''} · rename or recolor a tag to update it everywhere it's used.
      </p>

      {/* Create form */}
      {creating && (
        <EqCard style={{ marginBottom: 14, borderColor: 'hsl(var(--ring) / 0.4)' }}>
          <div style={{ padding: '16px 18px' }}>
            <div className="text-section-heading" style={{ marginBottom: 12 }}>New tag</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <EqInput
                value={newName}
                onChange={setNewName}
                placeholder="e.g. subscription"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveNew(); if (e.key === 'Escape') setCreating(false); }}
                style={{ flex: 1 }}
              />
              <TagPreview name={newName.trim().toLowerCase()} color={newColor} />
            </div>
            <ColorPicker value={newColor} onChange={setNewColor} />
            {error && <div style={{ fontSize: 12, color: 'hsl(var(--destructive))', marginTop: 12 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <EqButton variant="ghost" size="sm" onClick={() => { setCreating(false); setError(''); }}>Cancel</EqButton>
              <EqButton size="sm" onClick={saveNew}>Create tag</EqButton>
            </div>
          </div>
        </EqCard>
      )}

      {/* Tag list */}
      <EqCard>
        {tags.length === 0 ? (
          <div className="text-caption" style={{ padding: '28px 18px', textAlign: 'center' }}>
            No tags yet. Create one to get started.
          </div>
        ) : (
          <div style={{ padding: '4px 0' }}>
            {tags.map((tag, i) => {
              const isEditing = editing === tag;
              const count = usage[tag] || 0;
              return (
                <React.Fragment key={tag}>
                  {i > 0 && <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0 18px' }} />}
                  {isEditing ? (
                    <div style={{ padding: '16px 18px', background: 'hsl(var(--accent) / 0.5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <EqInput
                          value={draftName}
                          onChange={setDraftName}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(tag); if (e.key === 'Escape') cancelEdit(); }}
                          style={{ flex: 1 }}
                        />
                        <TagPreview name={draftName.trim().toLowerCase()} color={draftColor} />
                      </div>
                      <ColorPicker value={draftColor} onChange={setDraftColor} />
                      {error && <div style={{ fontSize: 12, color: 'hsl(var(--destructive))', marginTop: 12 }}>{error}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                        <ConfirmPopover
                          message={count > 0
                            ? `Delete "${tag}"? It will be removed from ${count} record${count !== 1 ? 's' : ''}.`
                            : `Delete "${tag}"?`}
                          onConfirm={() => { onDelete(tag); cancelEdit(); }}
                        >
                          <EqButton variant="ghost" size="sm" style={{ color: 'hsl(var(--destructive))' }}>
                            <Icon name="trash" size={14} color="hsl(var(--destructive))" />
                            Delete
                          </EqButton>
                        </ConfirmPopover>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <EqButton variant="ghost" size="sm" onClick={cancelEdit}>Cancel</EqButton>
                          <EqButton size="sm" onClick={() => saveEdit(tag)}>Save</EqButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }}>
                      <div style={{ width: 150, flexShrink: 0 }}>
                        <TagBadge tag={tag} dot />
                      </div>
                      <div className="text-caption" style={{ flex: 1 }}>
                        {count > 0 ? `Used in ${count} record${count !== 1 ? 's' : ''}` : 'Unused'}
                      </div>
                      <EqButton variant="ghost" size="icon-sm" onClick={() => startEdit(tag)}>
                        <Icon name="edit" size={15} color="hsl(var(--muted-foreground))" />
                      </EqButton>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </EqCard>
    </div>
  );
}

Object.assign(window, { TagManager });
