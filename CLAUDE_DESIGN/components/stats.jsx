/* ═══════════════════════════════════════
   Stats — filterable analytics view (Phase 8)
   ═══════════════════════════════════════ */

// Lifecycle → bar opacity. Closed = realized (solid); plan = projected (faint).
const STATUS_OPACITY = { plan: 0.34, active: 0.62, review: 0.82, closed: 1 };
const STATUS_LABEL = { plan: 'Plan', active: 'Active', review: 'Review', closed: 'Closed' };

const RECORD_TYPES = ['all', 'inflow', 'outflow'];

// ─── Filter persistence (eq_statsFilter) ───
// Combined filter state: { tagIds: string[] (AND logic), recordType: 'all'|'inflow'|'outflow' }
// In this prototype tags are identified by name, so tagIds holds tag names.
function loadStatsFilter() {
  try {
    const raw = JSON.parse(localStorage.getItem('eq_statsFilter') || 'null');
    if (raw && typeof raw === 'object') {
      const tagIds = Array.isArray(raw.tagIds) ? raw.tagIds.filter((t) => typeof t === 'string') : [];
      const excludeTagIds = Array.isArray(raw.excludeTagIds) ? raw.excludeTagIds.filter((t) => typeof t === 'string') : [];
      const recordType = RECORD_TYPES.includes(raw.recordType) ? raw.recordType : 'all';
      return { tagIds, excludeTagIds, recordType };
    }
  } catch (e) {}
  // Discard the old Phase 7 key on first read.
  try { localStorage.removeItem('eq_statsTags'); } catch (e) {}
  return { tagIds: [], excludeTagIds: [], recordType: 'all' };
}

function Stats({ budgets }) {
  const [filter, setFilter] = React.useState(loadStatsFilter);
  const [addOpen, setAddOpen] = React.useState(false);
  const [excludeOpen, setExcludeOpen] = React.useState(false);

  React.useEffect(() => {
    try { localStorage.setItem('eq_statsFilter', JSON.stringify(filter)); } catch (e) {}
  }, [filter]);

  if (!budgets || budgets.length === 0) {
    return (
      <div className="page-enter" data-screen-label="Stats" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 className="text-page-title" style={{ marginBottom: 28 }}>Stats</h1>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--muted-foreground))' }}>
          No budget data yet.
        </div>
      </div>);
  }

  // ─── Flatten every record, carrying its budget's lifecycle status ───
  const flat = budgets.flatMap((b) =>
    b.records.map((r) => ({ ...r, _status: b.status, _budgetId: b.id }))
  );
  const totalRecords = flat.length;

  // Drop any selected tags that no longer exist in the registry.
  const effectiveTags = filter.tagIds.filter((t) => allTags().includes(t));
  const effectiveExclude = (filter.excludeTagIds || []).filter((t) => allTags().includes(t));
  const recordType = filter.recordType;
  const singleType = recordType !== 'all';
  const filterActive = effectiveTags.length > 0 || effectiveExclude.length > 0 || singleType;

  // ─── Apply the filter ───
  // type axis + include (AND across tags) + exclude (drop records carrying ANY excluded tag).
  const typeMatch = (r) => recordType === 'all' || r.type === recordType;
  const tagMatch = (r) => effectiveTags.every((t) => (r.tags || []).includes(t));
  const excludeMatch = (r) => !effectiveExclude.some((t) => (r.tags || []).includes(t));
  // baseSet = everything passing type + include, before the exclude step (used to offer exclude options).
  const baseSet = flat.filter((r) => typeMatch(r) && tagMatch(r));
  const filtered = baseSet.filter(excludeMatch);

  const matchCount = filtered.length;
  const matchBudgets = new Set(filtered.map((r) => r._budgetId)).size;

  // ─── Aggregate the filtered set ───
  const inflowTotal = filtered.filter((r) => r.type === 'inflow').reduce((s, r) => s + r.amount, 0);
  const outflowTotal = filtered.filter((r) => r.type === 'outflow').reduce((s, r) => s + r.amount, 0);
  const maxAmount = Math.max(inflowTotal, outflowTotal, 1);

  function splitByStatus(type) {
    const m = {};
    filtered.filter((r) => r.type === type).forEach((r) => {
      m[r._status] = (m[r._status] || 0) + r.amount;
    });
    return m;
  }
  const inflowByStatus = splitByStatus('inflow');
  const outflowByStatus = splitByStatus('outflow');

  // Per-tag inflow/outflow split across the filtered records.
  const tagBreakdown = {};
  filtered.forEach((r) => {
    const keys = r.tags && r.tags.length ? r.tags : ['misc'];
    keys.forEach((tag) => {
      if (!tagBreakdown[tag]) tagBreakdown[tag] = { inflow: 0, outflow: 0 };
      tagBreakdown[tag][r.type] += r.amount;
    });
  });
  // Exclude the actively-filtered tags — every matching record carries them,
  // so they'd sit at ~100% and only add noise. Show the co-occurring tags.
  const tagEntries = Object.entries(tagBreakdown)
    .filter(([t]) => !effectiveTags.includes(t))
    .map(([t, b]) => [t, b.inflow + b.outflow, b])
    .sort((a, b) => b[1] - a[1]);
  const tagMax = tagEntries.reduce((m, [, t]) => Math.max(m, t), 0) || 1;

  // Tags available to add: those present on the currently-matching records,
  // so adding one always keeps at least one match (guided AND-filtering).
  const presentTags = new Set();
  filtered.forEach((r) => (r.tags && r.tags.length ? r.tags : ['misc']).forEach((t) => presentTags.add(t)));
  const availableToAdd = [...presentTags]
    .filter((t) => !effectiveTags.includes(t) && !effectiveExclude.includes(t))
    .sort((a, b) => {
      const ta = (tagBreakdown[a]?.inflow || 0) + (tagBreakdown[a]?.outflow || 0);
      const tb = (tagBreakdown[b]?.inflow || 0) + (tagBreakdown[b]?.outflow || 0);
      return tb - ta || a.localeCompare(b);
    });

  // Tags available to exclude: those present on the in-scope set (type + include),
  // minus anything already included or excluded. Frequency-sorted.
  const baseTagFreq = {};
  baseSet.forEach((r) => (r.tags && r.tags.length ? r.tags : ['misc']).forEach((t) => {
    baseTagFreq[t] = (baseTagFreq[t] || 0) + 1;
  }));
  const availableToExclude = Object.keys(baseTagFreq)
    .filter((t) => !effectiveTags.includes(t) && !effectiveExclude.includes(t))
    .sort((a, b) => baseTagFreq[b] - baseTagFreq[a] || a.localeCompare(b));

  // ─── Mutators ───
  function addTag(t) {
    setFilter((f) => ({ ...f, tagIds: [...f.tagIds, t] }));
    setAddOpen(false);
  }
  function removeTag(t) {
    setFilter((f) => ({ ...f, tagIds: f.tagIds.filter((x) => x !== t) }));
  }
  function addExclude(t) {
    setFilter((f) => ({ ...f, excludeTagIds: [...(f.excludeTagIds || []), t] }));
    setExcludeOpen(false);
  }
  function removeExclude(t) {
    setFilter((f) => ({ ...f, excludeTagIds: (f.excludeTagIds || []).filter((x) => x !== t) }));
  }
  function setRecordType(rt) {
    setFilter((f) => ({ ...f, recordType: rt }));
  }
  function clearAll() {
    setFilter({ tagIds: [], excludeTagIds: [], recordType: 'all' });
    setAddOpen(false);
    setExcludeOpen(false);
  }

  const labelStyle = {
    width: 52, flexShrink: 0, paddingTop: 4,
    fontSize: 12, fontWeight: 500, color: 'hsl(var(--muted-foreground))',
  };
  const baseAddChipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 9px 2px 7px', borderRadius: 9999,
    fontSize: 12, fontWeight: 500, lineHeight: '18px', fontFamily: 'inherit',
    border: '1px dashed hsl(var(--border))', background: 'transparent',
    color: 'hsl(var(--muted-foreground))',
  };
  const addChipStyle = {
    ...baseAddChipStyle,
    cursor: availableToAdd.length ? 'pointer' : 'not-allowed',
    opacity: availableToAdd.length ? 1 : 0.45,
  };
  const excludeChipStyle = {
    ...baseAddChipStyle,
    cursor: availableToExclude.length ? 'pointer' : 'not-allowed',
    opacity: availableToExclude.length ? 1 : 0.45,
  };

  return (
    <div className="page-enter" data-screen-label="Stats" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 className="text-page-title">Stats</h1>
        <span className="text-caption">All-time · {budgets.length} budget{budgets.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ─── Filter bar ─── */}
      <EqCard style={{ padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="text-section-heading">Filter</div>
          {filterActive &&
            <button
              type="button"
              onClick={clearAll}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                color: 'hsl(var(--muted-foreground))', padding: '2px 4px',
                transition: 'color 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}>
              <Icon name="x" size={11} color="currentColor" />
              Clear all
            </button>
          }
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Include row — AND logic */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={labelStyle}>Include</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', flex: 1 }}>
              {effectiveTags.map((t) =>
                <TagBadge key={t} tag={t} dot onRemove={() => removeTag(t)} />
              )}
              <Dropdown
                open={addOpen}
                onClose={() => setAddOpen(false)}
                trigger={
                  <button
                    type="button"
                    disabled={availableToAdd.length === 0}
                    onClick={() => availableToAdd.length && setAddOpen((o) => !o)}
                    style={addChipStyle}>
                    <Icon name="plus" size={11} color="hsl(var(--muted-foreground))" />
                    Add tag
                  </button>
                }
                items={availableToAdd.map((t) => ({
                  label:
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: tagDot(tagColor(t)), flexShrink: 0 }} />
                      {t}
                    </span>,
                  onClick: () => addTag(t),
                }))} />
              {effectiveTags.length > 1 &&
                <span className="text-caption" style={{ opacity: 0.75, marginLeft: 2 }}>
                  records with all {effectiveTags.length}
                </span>
              }
            </div>
          </div>

          {/* Exclude row — hide records carrying ANY of these tags */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={labelStyle}>Exclude</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', flex: 1 }}>
              {effectiveExclude.map((t) =>
                <ExcludeChip key={t} tag={t} onRemove={() => removeExclude(t)} />
              )}
              <Dropdown
                open={excludeOpen}
                onClose={() => setExcludeOpen(false)}
                trigger={
                  <button
                    type="button"
                    disabled={availableToExclude.length === 0}
                    onClick={() => availableToExclude.length && setExcludeOpen((o) => !o)}
                    style={excludeChipStyle}>
                    <Icon name="x" size={11} color="hsl(var(--muted-foreground))" />
                    Hide tag
                  </button>
                }
                items={availableToExclude.map((t) => ({
                  label:
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: tagDot(tagColor(t)), flexShrink: 0 }} />
                      {t}
                    </span>,
                  onClick: () => addExclude(t),
                }))} />
              {effectiveExclude.length === 0 &&
                <span className="text-caption" style={{ opacity: 0.6, marginLeft: 2 }}>
                  e.g. hide unconfirmed records
                </span>
              }
            </div>
          </div>

          {/* Record-type axis */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ ...labelStyle, paddingTop: 0 }}>Type</span>
            <RecordTypeToggle value={recordType} onChange={setRecordType} />
          </div>
        </div>

        {/* Live match count */}
        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: '1px solid hsl(var(--border))',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: matchCount > 0 ? 'hsl(var(--inflow))' : 'hsl(var(--muted-foreground))',
          }} />
          <span className="text-caption" style={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}>
            {filterActive
              ? `${matchCount} of ${totalRecords} record${totalRecords !== 1 ? 's' : ''} match`
              : `${totalRecords} record${totalRecords !== 1 ? 's' : ''}`}
          </span>
          {matchCount > 0 &&
            <span className="text-caption" style={{ opacity: 0.7 }}>
              · across {matchBudgets} budget{matchBudgets !== 1 ? 's' : ''}
            </span>
          }
        </div>
      </EqCard>

      {/* ─── Empty state ─── */}
      {matchCount === 0 ?
        <EqCard style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 12, background: 'hsl(var(--secondary))',
            color: 'hsl(var(--muted-foreground))',
          }}>
            <Icon name="chart" size={20} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No records match this filter</div>
          <div className="text-caption" style={{ maxWidth: 360, margin: '0 auto 18px', lineHeight: 1.6 }}>
            {effectiveTags.length > 0
              ? <>No {singleType ? recordType + ' ' : ''}records carry {effectiveTags.length > 1 ? 'all of ' : ''}
                  {effectiveTags.map((t, i) =>
                    <React.Fragment key={t}>
                      {i > 0 && (i === effectiveTags.length - 1 ? ' and ' : ', ')}
                      <strong style={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>{t}</strong>
                    </React.Fragment>
                  )}. Try removing a tag{singleType ? ' or switching type' : ''}.</>
              : effectiveExclude.length > 0
              ? <>Every {singleType ? recordType + ' ' : ''}record is hidden by your exclude {effectiveExclude.length > 1 ? 'tags' : 'tag'}. Try removing one.</>
              : <>There are no {recordType} records yet.</>}
          </div>
          <EqButton variant="outline" size="sm" onClick={clearAll}>Clear filters</EqButton>
        </EqCard>
        :
        <>
          {/* Summary stat tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
            <StatTile label="Total inflow" amount={inflowTotal} color="hsl(var(--inflow))" sign="+" dim={recordType === 'outflow'} />
            <StatTile label="Total outflow" amount={outflowTotal} color="hsl(var(--outflow))" sign="−" dim={recordType === 'inflow'} />
          </div>

          {/* Inflow vs Outflow — lifecycle split */}
          <EqCard style={{ padding: '18px 20px', marginBottom: 14 }}>
            <div className="text-section-heading" style={{ marginBottom: 16 }}>
              {singleType ? (recordType === 'inflow' ? 'Inflow' : 'Outflow') + ' by lifecycle' : 'Inflow vs Outflow'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {recordType !== 'outflow' &&
                <StackedBar label="Inflow" total={inflowTotal} max={maxAmount} color="hsl(var(--inflow))" byStatus={inflowByStatus} />}
              {recordType !== 'inflow' &&
                <StackedBar label="Outflow" total={outflowTotal} max={maxAmount} color="hsl(var(--outflow))" byStatus={outflowByStatus} />}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 16, paddingTop: 12, borderTop: '1px solid hsl(var(--border))' }}>
              {['closed', 'active', 'plan'].map((st) =>
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 11, height: 11, borderRadius: 2, background: 'hsl(var(--foreground))', opacity: STATUS_OPACITY[st] }} />
                  <span className="text-caption">{STATUS_LABEL[st]}</span>
                </div>
              )}
              <span className="text-caption" style={{ opacity: 0.65 }}>· fade = projected, solid = realized · hover a segment for its value</span>
            </div>
          </EqCard>

          {/* Breakdown by Tag — driven by the filtered set */}
          <EqCard style={{ padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div className="text-section-heading">{effectiveTags.length > 0 ? 'Co-occurring Tags' : 'Breakdown by Tag'}</div>
              <span className="text-caption">{tagEntries.length} tag{tagEntries.length !== 1 ? 's' : ''}</span>
            </div>

            {tagEntries.length === 0 ?
              <div className="text-caption" style={{ padding: '12px 0' }}>
                {effectiveTags.length > 0
                  ? 'These records carry no other tags.'
                  : 'No tagged records in this selection.'}
              </div> :
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tagEntries.map(([tag, total, b]) =>
                    <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 90, flexShrink: 0 }}>
                        <TagBadge tag={tag} />
                      </div>
                      <TagSplitBar inflow={b.inflow} outflow={b.outflow} max={tagMax} />
                      <span className="text-amount" style={{ width: 100, textAlign: 'right', flexShrink: 0, fontSize: 13 }}>
                        {formatRp(total)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Legend — adapts to the active type axis */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid hsl(var(--border))' }}>
                  {recordType !== 'inflow' &&
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 11, height: 11, borderRadius: 2, background: 'hsl(var(--outflow))' }} />
                      <span className="text-caption">Outflow</span>
                    </div>}
                  {recordType !== 'outflow' &&
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 11, height: 11, borderRadius: 2, background: 'hsl(var(--inflow))' }} />
                      <span className="text-caption">Inflow</span>
                    </div>}
                  <span className="text-caption" style={{ opacity: 0.65 }}>· hover a segment for its value</span>
                </div>
              </div>
            }
          </EqCard>
        </>
      }
    </div>);
}

// ─── Exclude chip — a struck-through, muted pill for a hidden tag ───
function ExcludeChip({ tag, onRemove }) {
  const dot = tagDot(tagColor(tag));
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 5px 2px 9px', borderRadius: 9999,
      fontSize: 12, fontWeight: 500, lineHeight: '18px', whiteSpace: 'nowrap',
      background: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))',
      border: '1px solid hsl(var(--border))',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0, opacity: 0.55 }} />
      <span style={{ textDecoration: 'line-through', textDecorationColor: 'hsl(var(--muted-foreground) / 0.7)' }}>{tag}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 15, height: 15, borderRadius: '50%', border: 'none',
          background: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
          padding: 0, opacity: 0.6, transition: 'opacity 0.1s, background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'hsl(var(--accent))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent'; }}>
        <Icon name="x" size={10} color="currentColor" />
      </button>
    </span>);
}

// ─── Record-type segmented control (All / Inflow / Outflow) ───
function RecordTypeToggle({ value, onChange }) {
  const opts = [
    { id: 'all', label: 'All', color: null },
    { id: 'inflow', label: 'Inflow', color: 'var(--inflow)' },
    { id: 'outflow', label: 'Outflow', color: 'var(--outflow)' },
  ];
  return (
    <div style={{ display: 'inline-flex', background: 'hsl(var(--secondary))', borderRadius: 8, padding: 3, gap: 2 }}>
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, fontSize: 13,
              padding: '4px 13px', borderRadius: 6, transition: 'background 0.12s, color 0.12s, box-shadow 0.12s',
              background: active ? 'hsl(var(--background))' : 'transparent',
              color: active ? (o.color ? `hsl(${o.color})` : 'hsl(var(--foreground))') : 'hsl(var(--muted-foreground))',
              boxShadow: active ? '0 1px 2px hsl(var(--foreground) / 0.08)' : 'none',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}>
            {o.label}
          </button>
        );
      })}
    </div>);
}

function StatTile({ label, amount, color, sign, dim }) {
  return (
    <EqCard style={{ padding: '14px 16px', opacity: dim ? 0.5 : 1, transition: 'opacity 0.15s' }}>
      <div className="text-caption" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 17,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        color,
      }}>
        {sign} {formatRp(amount)}
      </div>
    </EqCard>);
}

// Per-tag bar split into outflow + inflow segments. Color differentiates type;
// when a single type is filtered the bar naturally collapses to one color.
function TagSplitBar({ inflow, outflow, max }) {
  const [hover, setHover] = React.useState(null);
  const total = inflow + outflow;
  const totalPct = max > 0 ? total / max * 100 : 0;
  const segs = [
    { type: 'outflow', val: outflow, color: 'hsl(var(--outflow))', label: 'Outflow' },
    { type: 'inflow', val: inflow, color: 'hsl(var(--inflow))', label: 'Inflow' }].
    filter((s) => s.val > 0);
  let cum = 0;
  const placed = segs.map((s) => {
    const share = total > 0 ? s.val / total : 0;
    const o = { ...s, left: cum, width: share };
    cum += share;
    return o;
  });
  const hv = placed.find((s) => s.type === hover);
  return (
    <div style={{ flex: 1, position: 'relative', height: 20, borderRadius: 4, background: 'hsl(var(--secondary))' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: `${totalPct}%`, minWidth: total > 0 ? 3 : 0,
        borderRadius: 4, overflow: 'hidden', display: 'flex', transition: 'width 0.3s',
      }}>
        {placed.map((s, i) =>
          <div
            key={s.type}
            onMouseEnter={() => setHover(s.type)}
            onMouseLeave={() => setHover(null)}
            style={{
              width: `${s.width * 100}%`, height: '100%', background: s.color,
              opacity: hover && hover !== s.type ? 0.5 : 1,
              transition: 'opacity 0.12s', cursor: 'default',
              boxShadow: i < placed.length - 1 ? 'inset -1.5px 0 0 hsl(var(--background) / 0.6)' : 'none',
            }} />
        )}
      </div>
      {hv &&
        <div style={{
          position: 'absolute', bottom: '100%',
          left: `${(hv.left + hv.width / 2) * totalPct}%`,
          transform: 'translateX(-50%)', marginBottom: 7, whiteSpace: 'nowrap',
          background: 'hsl(var(--foreground))', color: 'hsl(var(--background))',
          padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 500,
          zIndex: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', pointerEvents: 'none',
        }}>
          {hv.label} · {formatRp(hv.val)}
        </div>
      }
    </div>);
}

// Horizontal bar split into lifecycle-state segments (opacity = how realized).
function StackedBar({ label, total, max, color, byStatus }) {
  const [hover, setHover] = React.useState(null);
  const widthPct = max > 0 ? total / max * 100 : 0;
  const order = ['closed', 'review', 'active', 'plan'].filter((s) => (byStatus[s] || 0) > 0);
  let cum = 0;
  const segs = order.map((st) => {
    const val = byStatus[st];
    const share = total > 0 ? val / total : 0;
    const s = { st, val, left: cum, width: share };
    cum += share;
    return s;
  });
  const hoverSeg = segs.find((s) => s.st === hover);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 56, fontSize: 13, fontWeight: 500, color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 24, borderRadius: 4, background: 'hsl(var(--secondary))', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${widthPct}%`, minWidth: widthPct > 0 ? 4 : 0,
          borderRadius: 4, overflow: 'hidden', display: 'flex',
        }}>
          {segs.map((s, i) =>
            <div
              key={s.st}
              onMouseEnter={() => setHover(s.st)}
              onMouseLeave={() => setHover(null)}
              style={{
                width: `${s.width * 100}%`, height: '100%', background: color,
                opacity: hover === s.st ? Math.min(STATUS_OPACITY[s.st] + 0.12, 1) : STATUS_OPACITY[s.st],
                transition: 'opacity 0.12s', cursor: 'default',
                boxShadow: i < segs.length - 1 ? 'inset -1.5px 0 0 hsl(var(--background) / 0.6)' : 'none',
              }} />
          )}
        </div>
        {hoverSeg &&
          <div style={{
            position: 'absolute', bottom: '100%',
            left: `${(hoverSeg.left + hoverSeg.width / 2) * widthPct}%`,
            transform: 'translateX(-50%)', marginBottom: 7, whiteSpace: 'nowrap',
            background: 'hsl(var(--foreground))', color: 'hsl(var(--background))',
            padding: '5px 9px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            zIndex: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', pointerEvents: 'none',
          }}>
            {STATUS_LABEL[hoverSeg.st]} · {formatRp(hoverSeg.val)}
          </div>
        }
      </div>
      <span className="text-amount" style={{ width: 110, textAlign: 'right', flexShrink: 0 }}>
        {formatRp(total)}
      </span>
    </div>);
}

Object.assign(window, { Stats, StatTile, StackedBar, TagSplitBar, RecordTypeToggle, ExcludeChip });
