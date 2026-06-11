/* ═══════════════════════════════════════
   Record Row — compact card with inline edit
   ═══════════════════════════════════════ */
const { useState: useStateRR, useRef: useRefRR, useEffect: useEffectRR } = React;

function RecordRow({ record, type, recordStyle, showTags, onUpdate, onDelete, editingId, onStartEdit, onStopEdit }) {
  const isEditing = editingId === record.id;
  const [hovered, setHovered] = useStateRR(false);
  const comfortable = recordStyle === 'comfortable';
  const showTagRow = showTags !== false;

  // Edit state
  const [editLabel, setEditLabel] = useStateRR(record.label);
  const [editAmount, setEditAmount] = useStateRR(formatRp(record.amount).replace('Rp ', ''));
  const [editEmoji, setEditEmoji] = useStateRR(record.emoji);
  const [editNotes, setEditNotes] = useStateRR(record.notes || '');
  const [showEmojiPicker, setShowEmojiPicker] = useStateRR(false);
  const rowRef = useRefRR(null);

  useEffectRR(() => {
    if (isEditing) {
      setEditLabel(record.label);
      setEditAmount(record.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
      setEditEmoji(record.emoji);
      setEditNotes(record.notes || '');
    }
  }, [isEditing]);

  function handleSave() {
    const amount = parseRp(editAmount);
    if (editLabel.trim() && amount > 0) {
      onUpdate(record.id, {
        label: editLabel.trim(),
        amount,
        emoji: editEmoji,
        notes: editNotes.trim(),
      });
    }
    onStopEdit();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onStopEdit();
  }

  function handleLabelChange(val) {
    setEditLabel(val);
    const suggested = suggestEmoji(val);
    if (suggested !== '📝') setEditEmoji(suggested);
  }

  function handleAmountChange(val) {
    // Only allow digits and dots
    const digits = val.replace(/[^\d]/g, '');
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setEditAmount(formatted);
  }

  function addTag(tag) {
    if (!record.tags.includes(tag)) {
      onUpdate(record.id, { tags: [...record.tags, tag] });
    }
  }

  function removeTag(tag) {
    onUpdate(record.id, { tags: record.tags.filter(t => t !== tag) });
  }

  // ─── Edit mode ───
  if (isEditing) {
    return (
      <div
        ref={rowRef}
        style={{
          position: 'relative',
          background: 'hsl(var(--card))',
          borderTop: '1px solid hsl(var(--ring))',
          borderRight: '1px solid hsl(var(--ring))',
          borderBottom: '1px solid hsl(var(--ring))',
          borderLeft: '1px solid hsl(var(--ring))',
          borderTopRightRadius: 'var(--radius)',
          borderBottomRightRadius: 'var(--radius)',
          borderTopLeftRadius: record.is_adjustment ? 0 : 'var(--radius)',
          borderBottomLeftRadius: record.is_adjustment ? 0 : 'var(--radius)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: '0 0 0 2px hsl(var(--ring) / 0.08)',
        }}
      >
        {record.is_adjustment && (
          <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, background: '#D97706' }} />
        )}
        {/* Row 1: emoji + label + amount */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Emoji button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                background: 'hsl(var(--secondary))',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {editEmoji}
            </button>
            {showEmojiPicker && (
              <EmojiGrid
                selected={editEmoji}
                suggested={suggestEmoji(editLabel)}
                onSelect={e => { setEditEmoji(e); setShowEmojiPicker(false); }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          {/* Label */}
          <div style={{ flex: 1 }}>
            <EqInput
              value={editLabel}
              onChange={handleLabelChange}
              placeholder="Label"
              autoFocus
              onKeyDown={handleKeyDown}
            />
          </div>
          {/* Amount */}
          <div style={{ width: 140 }}>
            <EqInput
              value={editAmount}
              onChange={handleAmountChange}
              placeholder="0"
              prefix="Rp"
              align="right"
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Row 2: notes */}
        <input
          type="text"
          value={editNotes}
          onChange={e => setEditNotes(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note…"
          style={{
            width: '100%',
            height: 30,
            padding: '0 10px 0 40px',
            fontSize: 13,
            fontFamily: 'inherit',
            border: '1px solid hsl(var(--input))',
            borderRadius: 6,
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'hsl(var(--ring))'}
          onBlur={e => e.target.style.borderColor = 'hsl(var(--input))'}
        />

        {/* Row 3: tags editor + actions */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, paddingLeft: 40 }}>
          <TagEditor
            tags={record.tags}
            onAddTag={addTag}
            onRemoveTag={removeTag}
            align={type === 'outflow' ? 'right' : 'left'}
          />
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <EqButton variant="ghost" size="icon-sm" onClick={onStopEdit}>
              <Icon name="x" size={14} />
            </EqButton>
            <EqButton variant="secondary" size="icon-sm" onClick={handleSave}>
              <Icon name="check" size={14} />
            </EqButton>
          </div>
        </div>
      </div>
    );
  }

  // ─── View mode ───
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onStartEdit(record.id)}
      style={{
        position: 'relative',
        background: hovered ? 'hsl(var(--accent))' : 'hsl(var(--card))',
        borderTop: `1px solid ${hovered ? 'hsl(var(--border))' : 'transparent'}`,
        borderRight: `1px solid ${hovered ? 'hsl(var(--border))' : 'transparent'}`,
        borderBottom: `1px solid ${hovered ? 'hsl(var(--border))' : 'transparent'}`,
        borderLeft: `1px solid ${hovered ? 'hsl(var(--border))' : 'transparent'}`,
        borderTopRightRadius: 'var(--radius)',
        borderBottomRightRadius: 'var(--radius)',
        borderTopLeftRadius: record.is_adjustment ? 0 : 'var(--radius)',
        borderBottomLeftRadius: record.is_adjustment ? 0 : 'var(--radius)',
        padding: comfortable ? '12px 14px' : '8px 12px',
        cursor: 'pointer',
        transition: 'background 0.1s, border-color 0.1s',
        display: 'flex',
        flexDirection: 'column',
        gap: comfortable ? 7 : 4,
      }}
    >
      {record.is_adjustment && (
        <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: '#D97706' }} />
      )}
      {/* Top: emoji + label + amount + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, lineHeight: 1, width: 22, textAlign: 'center', flexShrink: 0 }}>
          {record.emoji}
        </span>
        <span className="text-card-title" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.label}
        </span>
        <span className="text-amount" style={{
          color: type === 'inflow' ? 'hsl(var(--inflow))' : 'hsl(var(--outflow))',
          flexShrink: 0,
        }}>
          {formatRp(record.amount)}
        </span>
        {/* Delete icon on hover */}
        <div style={{
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.1s',
          flexShrink: 0,
        }}>
          <ConfirmPopover
            message="Delete this record?"
            onConfirm={() => onDelete(record.id)}
          >
            <EqButton
              variant="ghost"
              size="icon-sm"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              <Icon name="trash" size={13} />
            </EqButton>
          </ConfirmPopover>
        </div>
      </div>

      {/* Notes */}
      {record.notes && (
        <div style={{
          paddingLeft: 30,
          fontSize: 12,
          color: 'hsl(var(--muted-foreground))',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {record.notes}
        </div>
      )}

      {/* Tags */}
      {showTagRow && record.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, paddingLeft: 30, flexWrap: 'wrap' }}>
          {record.tags.map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Emoji picker grid ───
function EmojiGrid({ selected, suggested, onSelect, onClose }) {
  const ref = useRefRR(null);
  useEffectRR(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      padding: 10,
      background: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      zIndex: 60,
      width: 220,
    }}>
      {/* Suggested */}
      {suggested && suggested !== '📝' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>Suggested</div>
          <button
            onClick={() => onSelect(suggested)}
            style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: suggested === selected ? '2px solid hsl(var(--ring))' : '1px solid hsl(var(--border))',
              borderRadius: 6,
              background: 'hsl(var(--secondary))',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {suggested}
          </button>
        </div>
      )}
      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 3,
      }}>
        {ALL_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: emoji === selected ? '2px solid hsl(var(--ring))' : '1px solid transparent',
              borderRadius: 6,
              background: emoji === selected ? 'hsl(var(--accent))' : 'transparent',
              cursor: 'pointer',
              fontSize: 15,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (emoji !== selected) e.currentTarget.style.background = 'hsl(var(--accent))'; }}
            onMouseLeave={e => { if (emoji !== selected) e.currentTarget.style.background = 'transparent'; }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── New record placeholder ───
function NewRecordPlaceholder({ type, onAdd }) {
  return (
    <button
      onClick={onAdd}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1.5px dashed hsl(var(--border))',
        borderRadius: 'var(--radius)',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color: 'hsl(var(--muted-foreground))',
        fontSize: 13,
        fontFamily: 'inherit',
        transition: 'border-color 0.15s, color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = type === 'inflow' ? 'hsl(var(--inflow) / 0.4)' : 'hsl(var(--outflow) / 0.4)';
        e.currentTarget.style.color = type === 'inflow' ? 'hsl(var(--inflow))' : 'hsl(var(--outflow))';
        e.currentTarget.style.background = type === 'inflow' ? 'hsl(var(--inflow) / 0.04)' : 'hsl(var(--outflow) / 0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'hsl(var(--border))';
        e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon name="plus" size={14} />
      Add {type}
    </button>
  );
}

// ─── Tag editor — attach existing or create new tags ───
function TagEditor({ tags, onAddTag, onRemoveTag, align }) {
  const [open, setOpen] = useStateRR(false);
  const [query, setQuery] = useStateRR('');
  const [newColor, setNewColor] = useStateRR('blue');
  const ref = useRefRR(null);

  useEffectRR(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const q = query.trim().toLowerCase();
  const available = allTags().filter(t => !tags.includes(t) && t.includes(q));
  const exactMatch = allTags().includes(q);
  const canCreate = q.length > 0 && !exactMatch && !tags.includes(q);

  function handleCreate() {
    const key = registerTag(q, newColor);
    if (key) { onAddTag(key); setQuery(''); setOpen(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
      {tags.map(tag => (
        <TagBadge key={tag} tag={tag} onRemove={() => onRemoveTag(tag)} />
      ))}
      <div style={{ position: 'relative' }} ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 9px', borderRadius: 9999, fontSize: 12, fontWeight: 500,
            border: '1px dashed hsl(var(--border))', background: 'transparent',
            color: 'hsl(var(--muted-foreground))', cursor: 'pointer', lineHeight: '18px',
            fontFamily: 'inherit', transition: 'border-color 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--muted-foreground) / 0.5)'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
        >
          <Icon name="plus" size={11} /> tag
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', marginTop: 4, width: 210,
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 70, padding: 8,
          }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search or create…"
              onKeyDown={e => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
              style={{
                width: '100%', height: 30, padding: '0 8px', fontSize: 13,
                fontFamily: 'inherit', border: '1px solid hsl(var(--input))',
                borderRadius: 6, outline: 'none', marginBottom: 6,
                background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
              }}
            />
            <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {available.map(t => (
                <button
                  key={t}
                  onClick={() => { onAddTag(t); setQuery(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px',
                    border: 'none', background: 'transparent', borderRadius: 5, cursor: 'pointer',
                    fontSize: 13, fontFamily: 'inherit', textAlign: 'left', color: 'hsl(var(--foreground))',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--accent))'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: TAG_DOT[tagColor(t)], flexShrink: 0 }} />
                  {t}
                </button>
              ))}
              {available.length === 0 && !canCreate && (
                <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', padding: '6px 7px' }}>
                  No tags found
                </div>
              )}
            </div>
            {canCreate && (
              <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 6, paddingTop: 8 }}>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>
                  Create “<b style={{ color: 'hsl(var(--foreground))' }}>{q}</b>” with color
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {TAG_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      title={c}
                      style={{
                        width: 20, height: 20, borderRadius: '50%', cursor: 'pointer',
                        background: TAG_DOT[c], padding: 0,
                        border: newColor === c ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
                        boxShadow: newColor === c ? '0 0 0 1px hsl(var(--background)) inset' : 'none',
                      }}
                    />
                  ))}
                </div>
                <EqButton size="sm" style={{ width: '100%' }} onClick={handleCreate}>
                  Create &amp; attach
                </EqButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { RecordRow, EmojiGrid, NewRecordPlaceholder, TagEditor });
