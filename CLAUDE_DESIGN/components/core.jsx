/* ═══════════════════════════════════════
   Data model + sample data + helpers
   ═══════════════════════════════════════ */

// Tag definitions with color mappings
const TAG_DEFS = {
  wage:       { label: 'wage',       color: 'blue' },
  monthly:    { label: 'monthly',    color: 'blue' },
  weekly:     { label: 'weekly',     color: 'indigo' },
  obligation: { label: 'obligation', color: 'red' },
  grocery:    { label: 'grocery',    color: 'amber' },
  utility:    { label: 'utility',    color: 'orange' },
  saving:     { label: 'saving',     color: 'green' },
  investment: { label: 'investment', color: 'green' },
  gift:       { label: 'gift',       color: 'pink' },
  dining:     { label: 'dining',     color: 'purple' },
  health:     { label: 'health',     color: 'teal' },
  education:  { label: 'education',  color: 'indigo' },
  transport:  { label: 'transport',  color: 'orange' },
  entertainment: { label: 'entertainment', color: 'purple' },
  misc:       { label: 'misc',       color: 'gray' },
};

// ─── Tag color palette (10 predefined) ───
const TAG_COLORS = ['red','orange','amber','green','teal','blue','indigo','purple','pink','gray'];
const TAG_FILL = {
  red: '#FEE2E2', orange: '#FFEDD5', amber: '#FEF3C7', green: '#DCFCE7',
  teal: '#CCFBF1', blue: '#DBEAFE', indigo: '#E0E7FF', purple: '#F3E8FF',
  pink: '#FCE7F3', gray: '#F3F4F6',
};
const TAG_TEXT = {
  red: '#991B1B', orange: '#9A3412', amber: '#92400E', green: '#166534',
  teal: '#115E59', blue: '#1E40AF', indigo: '#3730A3', purple: '#6B21A8',
  pink: '#9D174D', gray: '#374151',
};
// Solid dot color for swatches/legend (reads fine on light + dark)
const TAG_DOT = {
  red: '#DC2626', orange: '#EA580C', amber: '#D97706', green: '#16A34A',
  teal: '#0D9488', blue: '#2563EB', indigo: '#4F46E5', purple: '#9333EA',
  pink: '#DB2777', gray: '#6B7280',
};
// Dark-mode tag palette: muted deep fills + bright text.
const TAG_FILL_DARK = {
  red: '#3A1E1E', orange: '#3A2615', amber: '#392E12', green: '#14301E',
  teal: '#103230', blue: '#15294A', indigo: '#1E2150', purple: '#281B3E',
  pink: '#3A1B2B', gray: '#26272B',
};
const TAG_TEXT_DARK = {
  red: '#F7A8A8', orange: '#FBBF8F', amber: '#F8D27A', green: '#86E5A6',
  teal: '#5FE3D0', blue: '#9AC0F7', indigo: '#ABB6F8', purple: '#D6B0F2',
  pink: '#F4A6CE', gray: '#CBD2DC',
};

// ─── Status badge palette (single blue hue, intensity = lifecycle) ───
const STATUS_BADGE_LIGHT = {
  plan:   { bg: '#EFF4FE', fg: '#3B6FD4' },
  active: { bg: '#DBE7FB', fg: '#1E47A8' },
  review: { bg: '#C5D8F7', fg: '#1A3A86' },
  closed: { bg: '#EEF1F6', fg: '#7A879C' },
};
const STATUS_BADGE_DARK = {
  plan:   { bg: '#172541', fg: '#9CBAF6' },
  active: { bg: '#1C3158', fg: '#B4CDF8' },
  review: { bg: '#243C66', fg: '#CADCFB' },
  closed: { bg: '#27292F', fg: '#9BA5B3' },
};

// ─── Theme (module-level; App keeps it in sync each render) ───
let EQ_THEME = (function () {
  try { return localStorage.getItem('eq_theme') === 'dark' ? 'dark' : 'light'; }
  catch (e) { return 'light'; }
})();
function setEqTheme(t) { EQ_THEME = (t === 'dark' ? 'dark' : 'light'); }

// Theme-aware color resolvers (keyed by colorKey, e.g. 'blue').
function tagFill(key) {
  const pal = EQ_THEME === 'dark' ? TAG_FILL_DARK : TAG_FILL;
  return pal[key] || pal.gray;
}
function tagText(key) {
  const pal = EQ_THEME === 'dark' ? TAG_TEXT_DARK : TAG_TEXT;
  return pal[key] || pal.gray;
}
function tagDot(key) { return TAG_DOT[key] || TAG_DOT.gray; }
function statusBadgeStyle(status) {
  const pal = EQ_THEME === 'dark' ? STATUS_BADGE_DARK : STATUS_BADGE_LIGHT;
  return pal[status] || pal.plan;
}

// Runtime registry: tagName -> colorKey. Seeded from TAG_DEFS, then
// overlaid by the user's saved edits (renames, recolors, new + deleted tags).
const TAG_REGISTRY = {};
Object.entries(TAG_DEFS).forEach(([k, v]) => { TAG_REGISTRY[k] = v.color; });
try {
  const stored = JSON.parse(localStorage.getItem('eq_tagRegistry') || 'null');
  if (stored && typeof stored === 'object') {
    // Stored registry is the source of truth (honours deletions + renames).
    Object.keys(TAG_REGISTRY).forEach(k => delete TAG_REGISTRY[k]);
    Object.assign(TAG_REGISTRY, stored);
  } else {
    // Legacy fallback: overlay the old custom-tags store.
    const custom = JSON.parse(localStorage.getItem('eq_customTags') || '{}');
    Object.assign(TAG_REGISTRY, custom);
  }
} catch (e) {}

function persistTags() {
  try { localStorage.setItem('eq_tagRegistry', JSON.stringify(TAG_REGISTRY)); } catch (e) {}
}

function tagColor(name) {
  return TAG_REGISTRY[name] || 'gray';
}
function allTags() {
  return Object.keys(TAG_REGISTRY);
}
function registerTag(name, color) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  TAG_REGISTRY[key] = color || 'gray';
  persistTags();
  return key;
}
// Change a tag's color in place.
function setTagColor(name, color) {
  if (!(name in TAG_REGISTRY)) return null;
  TAG_REGISTRY[name] = color || 'gray';
  persistTags();
  return name;
}
// Rename a tag key (color carried over). Returns the new normalized key.
function renameTagInRegistry(oldName, newName) {
  const key = (newName || '').trim().toLowerCase();
  if (!key || !(oldName in TAG_REGISTRY)) return null;
  if (key !== oldName) {
    const color = TAG_REGISTRY[oldName];
    if (!(key in TAG_REGISTRY)) TAG_REGISTRY[key] = color;
    delete TAG_REGISTRY[oldName];
    persistTags();
  }
  return key;
}
// Remove a tag from the registry entirely.
function removeTagFromRegistry(name) {
  if (name in TAG_REGISTRY) {
    delete TAG_REGISTRY[name];
    persistTags();
  }
}

// Emoji map for auto-suggestion
const EMOJI_MAP = {
  salary: '💼', wage: '💼', gaji: '💼',
  rent: '🏠', housing: '🏠', sewa: '🏠', kos: '🏠',
  grocery: '🛒', groceries: '🛒', belanja: '🛒',
  electric: '⚡', electricity: '⚡', listrik: '⚡', utility: '⚡',
  saving: '💰', emergency: '💰', tabungan: '💰',
  gift: '🎁', birthday: '🎁', hadiah: '🎁',
  dividend: '📈', stock: '📈', investment: '📈', investasi: '📈',
  eating: '🍕', eat: '🍕', restaurant: '🍕', makan: '🍕',
  transport: '🚗', car: '🚗', fuel: '🚗', gas: '🚗',
  health: '💊', medicine: '💊', doctor: '💊', obat: '💊',
  education: '🎓', school: '🎓', course: '🎓',
  fitness: '🏋️', gym: '🏋️',
  entertainment: '🎮', game: '🎮',
  phone: '📱', internet: '🌐', wifi: '🌐',
  shopping: '🛍️', clothes: '👔',
  travel: '✈️', vacation: '✈️',
  pet: '🐾', pets: '🐾',
  child: '👶', children: '👶', baby: '👶',
  streaming: '🎬', netflix: '🎬', movie: '🎬',
  maintenance: '🔧', repair: '🔧',
  subscription: '🎵', music: '🎵',
  delivery: '📦',
  bill: '🧾', bills: '🧾',
  bonus: '💵',
  interest: '🏦', bank: '🏦',
};

const ALL_EMOJIS = ['💼','🏠','🛒','💰','⚡','🎁','📈','🍕','🚗','💊','🎓','🏋️','🎮','📱','🛍️','✈️','🐾','👶','🎬','🔧','🎵','👔','🌐','📦','🧾','💵','🏦','📝','💡'];

function suggestEmoji(label) {
  const lower = label.toLowerCase();
  for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(keyword)) return emoji;
  }
  return '📝';
}

// Format Rupiah
function formatRp(amount) {
  return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Parse Rupiah input
function parseRp(str) {
  const cleaned = str.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// ─── Lifecycle: review detection ───
// Parse a stored date string like 'Jun 30, 2026' into a Date.
function parseBudgetDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}
// An ACTIVE budget whose end date has already passed is overdue for review:
// the plan period is over but it was never moved to the Review stage.
function budgetNeedsReview(budget, now = Date.now()) {
  if (!budget || budget.status !== 'active') return false;
  const end = parseBudgetDate(budget.endDate);
  if (!end) return false;
  end.setHours(23, 59, 59, 999); // grace until the end of the final day
  return now > end.getTime();
}
// Whole days the budget has been overdue (>= 1 once past the end day).
function daysOverdue(budget, now = Date.now()) {
  const end = parseBudgetDate(budget.endDate);
  if (!end) return 0;
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.floor((now - end.getTime()) / 86400000));
}

// Bump whenever createSampleData changes shape — forces a re-seed over stale localStorage.
const DATA_VERSION = 4;

// Sample data
function createSampleData() {
  return [
    {
      id: 4,
      name: 'April 2026',
      startDate: 'Apr 1, 2026',
      endDate: 'Apr 30, 2026',
      status: 'active',
      records: [
        { id: 401, emoji: '💼', label: 'Salary',             type: 'inflow',  amount: 8500000, tags: ['wage', 'monthly'] },
        { id: 402, emoji: '🏠', label: 'Rent',               type: 'outflow', amount: 2500000, tags: ['obligation', 'monthly'] },
        { id: 403, emoji: '🛒', label: 'Groceries',          type: 'outflow', amount: 1150000, tags: ['grocery', 'weekly'] },
        { id: 404, emoji: '⚡', label: 'Electricity',        type: 'outflow', amount: 360000,  tags: ['utility', 'monthly'] },
        { id: 405, emoji: '💰', label: 'Emergency fund',     type: 'outflow', amount: 1000000, tags: ['saving'] },
        { id: 406, emoji: '🧾', label: 'Missed phone bill',  type: 'outflow', amount: 180000,  tags: ['utility'], notes: 'Added June — overlooked in April', is_adjustment: true },
        { id: 407, emoji: '🔧', label: 'Appliance repair',   type: 'outflow', amount: 320000,  tags: ['misc'],    notes: 'Receipt arrived late',             is_adjustment: true },
        { id: 408, emoji: '💵', label: 'Late reimbursement', type: 'inflow',  amount: 250000,  tags: ['misc'],    notes: 'HR payment — processed May',       is_adjustment: true },
      ],
    },
    {
      id: 1,
      name: 'June 2026',
      startDate: 'Jun 1, 2026',
      endDate: 'Jun 30, 2026',
      status: 'active',
      records: [
        { id: 101, emoji: '💼', label: 'Salary',         type: 'inflow',  amount: 8500000, tags: ['wage', 'monthly'] },
        { id: 102, emoji: '📈', label: 'Stock dividend',  type: 'inflow',  amount: 150000,  tags: ['investment'] },
        { id: 103, emoji: '🏠', label: 'Rent',            type: 'outflow', amount: 2500000, tags: ['obligation', 'monthly'], notes: 'Apartment, due on the 1st' },
        { id: 104, emoji: '🛒', label: 'Groceries',       type: 'outflow', amount: 1200000, tags: ['grocery', 'weekly'] },
        { id: 105, emoji: '⚡', label: 'Electricity',     type: 'outflow', amount: 350000,  tags: ['utility', 'monthly'] },
        { id: 106, emoji: '💰', label: 'Emergency fund',  type: 'outflow', amount: 1000000, tags: ['saving'], notes: 'Auto-transfer on payday' },
        { id: 107, emoji: '🎁', label: "Mom's birthday",  type: 'outflow', amount: 250000,  tags: ['gift'] },
        { id: 108, emoji: '🍕', label: 'Eating out',      type: 'outflow', amount: 400000,  tags: ['dining', 'weekly'] },
        { id: 109, emoji: '↩️', label: 'Grocery refund',   type: 'inflow',  amount: 85000,   tags: ['grocery'],     notes: 'Returned spoiled produce' },
        { id: 110, emoji: '🤝', label: 'Dinner split',     type: 'inflow',  amount: 180000,  tags: ['dining'],      notes: 'Friends paid me back' },
        { id: 111, emoji: '🎉', label: 'Birthday cash',    type: 'inflow',  amount: 300000,  tags: ['gift'] },
      ],
    },
    {
      id: 2,
      name: 'July 2026',
      startDate: 'Jul 1, 2026',
      endDate: 'Jul 31, 2026',
      status: 'plan',
      records: [
        { id: 201, emoji: '💼', label: 'Salary',         type: 'inflow',  amount: 8500000, tags: ['wage', 'monthly'] },
        { id: 202, emoji: '🏠', label: 'Rent',            type: 'outflow', amount: 2500000, tags: ['obligation', 'monthly'] },
        { id: 203, emoji: '🛒', label: 'Groceries',       type: 'outflow', amount: 1000000, tags: ['grocery', 'weekly'] },
        { id: 204, emoji: '⚡', label: 'Electricity',     type: 'outflow', amount: 350000,  tags: ['utility', 'monthly'] },
        { id: 205, emoji: '💰', label: 'Emergency fund',  type: 'outflow', amount: 1500000, tags: ['saving'] },
        { id: 206, emoji: '⚡', label: 'Utility refund',  type: 'inflow',  amount: 60000,   tags: ['utility'], notes: 'Overpayment credited back' },
      ],
    },
    {
      id: 3,
      name: 'May 2026',
      startDate: 'May 1, 2026',
      endDate: 'May 31, 2026',
      status: 'closed',
      records: [
        { id: 301, emoji: '💼', label: 'Salary',         type: 'inflow',  amount: 8500000, tags: ['wage', 'monthly'] },
        { id: 302, emoji: '💵', label: 'Bonus',           type: 'inflow',  amount: 500000,  tags: ['wage'] },
        { id: 303, emoji: '🏠', label: 'Rent',            type: 'outflow', amount: 2500000, tags: ['obligation', 'monthly'] },
        { id: 304, emoji: '🛒', label: 'Groceries',       type: 'outflow', amount: 1100000, tags: ['grocery', 'weekly'] },
        { id: 305, emoji: '⚡', label: 'Electricity',     type: 'outflow', amount: 380000,  tags: ['utility', 'monthly'] },
        { id: 306, emoji: '💰', label: 'Emergency fund',  type: 'outflow', amount: 1000000, tags: ['saving'] },
        { id: 307, emoji: '🍕', label: 'Eating out',      type: 'outflow', amount: 350000,  tags: ['dining', 'weekly'] },
        { id: 308, emoji: '🎮', label: 'Games',           type: 'outflow', amount: 200000,  tags: ['entertainment'] },
        { id: 309, emoji: '🕹️', label: 'Sold old console', type: 'inflow',  amount: 450000,  tags: ['entertainment'], notes: 'Marketplace sale' },
        { id: 310, emoji: '🛍️', label: 'Grocery cashback', type: 'inflow',  amount: 40000,   tags: ['grocery'] },
      ],
    },
  ];
}

let _nextId = 1000;
function nextId() { return ++_nextId; }

Object.assign(window, {
  DATA_VERSION,
  TAG_DEFS, EMOJI_MAP, ALL_EMOJIS, suggestEmoji,
  formatRp, parseRp, createSampleData, nextId,
  parseBudgetDate, budgetNeedsReview, daysOverdue,
  TAG_COLORS, TAG_FILL, TAG_TEXT, TAG_DOT,
  TAG_FILL_DARK, TAG_TEXT_DARK, STATUS_BADGE_LIGHT, STATUS_BADGE_DARK,
  setEqTheme, tagFill, tagText, tagDot, statusBadgeStyle,
  TAG_REGISTRY, tagColor, allTags, registerTag,
  setTagColor, renameTagInRegistry, removeTagFromRegistry, persistTags,
});


/* ═══════════════════════════════════════
   Shared UI primitives (shadcn-inspired)
   ═══════════════════════════════════════ */
const { useState, useRef, useEffect } = React;

// ─── Card ───
function EqCard({ children, style, className, onClick, hoverable, dimmed, ...rest }) {
  const baseStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
    opacity: dimmed ? 0.55 : 1,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };
  return (
    <div
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={e => { if (hoverable) { e.currentTarget.style.borderColor = 'hsl(var(--muted-foreground) / 0.3)'; e.currentTarget.style.boxShadow = '0 1px 3px hsl(var(--foreground) / 0.04)'; }}}
      onMouseLeave={e => { if (hoverable) { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.boxShadow = 'none'; }}}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Badge ───
function EqBadge({ children, variant, color, style }) {
  let bg, fg;
  if (variant === 'status') {
    const sc = statusBadgeStyle(color);
    bg = sc.bg;
    fg = sc.fg;
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '18px',
      whiteSpace: 'nowrap',
      background: bg || 'hsl(var(--secondary))',
      color: fg || 'hsl(var(--secondary-foreground))',
      ...style,
    }}>
      {children}
    </span>
  );
}

// Status badge shorthand
function StatusBadge({ status, onClick }) {
  return (
    <EqBadge variant="status" color={status}>
      <span style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
        {status}
      </span>
    </EqBadge>
  );
}

// Tag badge — resolves color from the runtime registry
function TagBadge({ tag, onRemove, dot }) {
  const colorKey = tagColor(tag);
  const fill = tagFill(colorKey);
  const text = tagText(colorKey);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: onRemove ? '2px 5px 2px 9px' : '2px 9px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 500,
      lineHeight: '18px',
      whiteSpace: 'nowrap',
      background: fill,
      color: text,
    }}>
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tagDot(colorKey), flexShrink: 0 }} />
      )}
      {tag}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 15, height: 15, borderRadius: '50%', border: 'none',
            background: 'transparent', color: text, cursor: 'pointer',
            padding: 0, opacity: 0.6, transition: 'opacity 0.1s, background 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = text + '22'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Icon name="x" size={10} color={text} />
        </button>
      )}
    </span>
  );
}

// ─── Button ───
function EqButton({ children, variant, size, style, disabled, ...rest }) {
  const variants = {
    default: {
      background: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      border: 'none',
    },
    secondary: {
      background: 'hsl(var(--secondary))',
      color: 'hsl(var(--secondary-foreground))',
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: 'hsl(var(--foreground))',
      border: '1px solid hsl(var(--border))',
    },
    ghost: {
      background: 'transparent',
      color: 'hsl(var(--foreground))',
      border: 'none',
    },
    destructive: {
      background: 'hsl(var(--destructive))',
      color: 'hsl(var(--destructive-foreground))',
      border: 'none',
    },
  };
  const sizes = {
    sm: { padding: '4px 10px', fontSize: 12, height: 28, borderRadius: 6 },
    md: { padding: '6px 14px', fontSize: 14, height: 34, borderRadius: 'var(--radius)' },
    lg: { padding: '8px 18px', fontSize: 14, height: 40, borderRadius: 'var(--radius)' },
    icon: { padding: 0, fontSize: 14, width: 32, height: 32, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
    'icon-sm': { padding: 0, fontSize: 12, width: 26, height: 26, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  };
  const v = variants[variant || 'default'];
  const s = sizes[size || 'md'];

  return (
    <button
      disabled={disabled}
      style={{
        ...v, ...s,
        fontFamily: 'inherit',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s, opacity 0.12s',
        display: s.display || 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = disabled ? '0.5' : '1'; }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Progress Bar ───
function EqProgress({ value, max, variant, style }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const overBudget = value > max;
  const barColor = overBudget
    ? 'hsl(var(--destructive))'
    : variant === 'inflow'
      ? 'hsl(var(--inflow))'
      : 'hsl(var(--primary))';

  return (
    <div style={{
      height: 6,
      borderRadius: 3,
      background: 'hsl(var(--secondary))',
      overflow: 'hidden',
      position: 'relative',
      ...style,
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(pct, 100)}%`,
        borderRadius: 3,
        background: barColor,
        transition: 'width 0.4s ease',
      }} />
      {overBudget && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 3,
          background: 'hsl(var(--destructive))',
          boxShadow: '0 0 8px hsl(var(--destructive) / 0.4)',
        }} />
      )}
    </div>
  );
}

// ─── Input ───
function EqInput({ value, onChange, placeholder, style, type, prefix, align, autoFocus, onKeyDown, onBlur }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {prefix && (
        <span style={{
          position: 'absolute', left: 10,
          fontSize: 13, fontWeight: 500,
          color: 'hsl(var(--muted-foreground))',
          pointerEvents: 'none',
        }}>{prefix}</span>
      )}
      <input
        type={type || 'text'}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        style={{
          width: '100%',
          height: 34,
          padding: prefix ? '0 10px 0 32px' : '0 10px',
          fontSize: 14,
          fontFamily: 'inherit',
          border: '1px solid hsl(var(--input))',
          borderRadius: 'var(--radius)',
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          textAlign: align || 'left',
          outline: 'none',
          transition: 'border-color 0.15s',
          ...style,
        }}
        onFocus={e => e.target.style.borderColor = 'hsl(var(--ring))'}
        onBlurCapture={e => e.target.style.borderColor = 'hsl(var(--input))'}
      />
    </div>
  );
}

// ─── SVG Icons (minimal line icons) ───
function Icon({ name, size = 18, color = 'currentColor', style }) {
  const icons = {
    home: <><rect x="3" y="10" width="7" height="9" rx="1" stroke={color} fill="none" strokeWidth="1.5"/><rect x="14" y="10" width="7" height="9" rx="1" stroke={color} fill="none" strokeWidth="1.5"/><rect x="3" y="3" width="18" height="5" rx="1" stroke={color} fill="none" strokeWidth="1.5"/></>,
    chart: <><rect x="3" y="12" width="4" height="7" rx="0.5" stroke={color} fill="none" strokeWidth="1.5"/><rect x="10" y="7" width="4" height="12" rx="0.5" stroke={color} fill="none" strokeWidth="1.5"/><rect x="17" y="3" width="4" height="16" rx="0.5" stroke={color} fill="none" strokeWidth="1.5"/></>,
    settings: <><circle cx="12" cy="12" r="3" stroke={color} fill="none" strokeWidth="1.5"/><path d="M19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    back: <><polyline points="15,4 9,12 15,20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    trash: <><polyline points="3,6 5,6 21,6" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" fill="none" stroke={color} strokeWidth="1.5"/><path d="M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" fill="none" stroke={color} strokeWidth="1.5"/></>,
    edit: <><path d="M17 3l4 4L7 21H3v-4L17 3z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></>,
    check: <><polyline points="4,12 9,17 20,6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>,
    x: <><line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    download: <><path d="M12 3v12m0 0l-4-4m4 4l4-4" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    upload: <><path d="M12 15V3m0 0l-4 4m4-4l4 4" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" stroke={color} fill="none" strokeWidth="1.5"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" stroke={color} fill="none" strokeWidth="1.5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke={color} fill="none" strokeWidth="1.5"/></>,
    alert: <><path d="M12 9v4m0 4h.01" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={color} fill="none" strokeWidth="1.5" strokeLinejoin="round"/></>,
    tag: <><path d="M3 11.5V4.5a1.5 1.5 0 011.5-1.5h7a2 2 0 011.41.59l7 7a2 2 0 010 2.82l-6.5 6.5a2 2 0 01-2.82 0l-7-7A2 2 0 013 11.5z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/><circle cx="7.5" cy="7.5" r="1.4" fill={color}/></>,
    sun: <><circle cx="12" cy="12" r="4" stroke={color} fill="none" strokeWidth="1.5"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    moon: <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {icons[name]}
    </svg>
  );
}

// ─── Tooltip ───
function Tooltip({ children, label }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: 8,
          padding: '4px 10px',
          background: 'hsl(var(--foreground))',
          color: 'hsl(var(--background))',
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 6,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Dropdown ───
function Dropdown({ trigger, items, open, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} ref={ref}>
      {trigger}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          minWidth: 140,
          background: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          zIndex: 50,
          padding: 4,
          overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <div
              key={i}
              onClick={() => { item.onClick(); onClose(); }}
              style={{
                padding: '6px 10px',
                fontSize: 13,
                cursor: 'pointer',
                borderRadius: 4,
                color: item.destructive ? 'hsl(var(--destructive))' : 'hsl(var(--popover-foreground))',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--accent))'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Confirm popover ───
function ConfirmPopover({ message, onConfirm, onCancel, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} ref={ref}>
      <div onClick={(e) => { e.stopPropagation(); setOpen(true); }}>{children}</div>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: 6,
          padding: '12px 14px',
          background: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          zIndex: 50,
          width: 200,
        }}>
          <div style={{ fontSize: 13, marginBottom: 10, color: 'hsl(var(--foreground))' }}>{message}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <EqButton variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</EqButton>
            <EqButton variant="destructive" size="sm" onClick={() => { onConfirm(); setOpen(false); }}>Delete</EqButton>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  EqCard, EqBadge, StatusBadge, TagBadge, EqButton, EqProgress,
  EqInput, Icon, Tooltip, Dropdown, ConfirmPopover,
});


/* ═══════════════════════════════════════
   Sidebar — minimal, icon-heavy (Linear)
   ═══════════════════════════════════════ */

function Sidebar({ activePage, onNavigate }) {
  const mod = typeof IS_MAC !== 'undefined' && IS_MAC ? '⌘' : 'Ctrl+';
  const navItems = [
    { id: 'dashboard', icon: 'home', label: `Budgets ${mod}1` },
    { id: 'stats',     icon: 'chart', label: `Stats ${mod}2` },
    { id: 'tags',      icon: 'tag', label: `Tags ${mod}3` },
    { id: 'settings',  icon: 'settings', label: `Settings ${mod},` },
  ];

  return (
    <nav style={{
      width: 56,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 0 12px',
      borderRight: '1px solid hsl(var(--border))',
      background: 'hsl(var(--card))',
      flexShrink: 0,
      gap: 2,
    }}>
      {/* App logo */}
      <div style={{
        width: 34,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        color: 'hsl(var(--foreground))',
        background: 'hsl(var(--foreground))',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M2 12h20M12 2v20" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="6" cy="8" r="2" fill="hsl(142 76% 36%)" />
          <circle cx="18" cy="16" r="2" fill="hsl(0 72% 51%)" />
        </svg>
      </div>

      {/* Nav items */}
      {navItems.map(item => {
        const isActive = activePage === item.id ||
          (item.id === 'dashboard' && activePage === 'budget');
        return (
          <Tooltip key={item.id} label={item.label}>
            <button
              onClick={() => onNavigate(item.id)}
              style={{
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
                background: isActive ? 'hsl(var(--secondary))' : 'transparent',
                color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'hsl(var(--accent))';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon name={item.icon} size={18} />
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: -9,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 16,
                  borderRadius: 2,
                  background: 'hsl(var(--foreground))',
                }} />
              )}
            </button>
          </Tooltip>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Version */}
      <div style={{
        fontSize: 10,
        color: 'hsl(var(--muted-foreground))',
        opacity: 0.6,
        letterSpacing: '0.02em',
      }}>
        v1.0
      </div>
    </nav>
  );
}

Object.assign(window, { Sidebar });
