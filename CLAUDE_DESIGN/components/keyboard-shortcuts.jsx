/* ═══════════════════════════════════════
   Keyboard Shortcut Help Modal
   ═══════════════════════════════════════ */

const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl';

const SHORTCUT_GROUPS = [
  {
    label: 'Navigation',
    shortcuts: [
      { action: 'Budgets',  keys: [MOD, '1'] },
      { action: 'Stats',    keys: [MOD, '2'] },
      { action: 'Tags',     keys: [MOD, '3'] },
      { action: 'Settings', keys: [MOD, ','] },
    ],
  },
  {
    label: 'Actions',
    shortcuts: [
      { action: 'New budget', keys: [MOD, 'N'], where: 'Budgets page' },
      { action: 'New tag',    keys: [MOD, 'N'], where: 'Tags page' },
      { action: 'Go back',    keys: ['Esc'],    where: 'Budget form' },
    ],
  },
  {
    label: 'Editing',
    shortcuts: [
      { action: 'Save',   keys: ['Enter'], where: 'Record / tag edit' },
      { action: 'Cancel', keys: ['Esc'],   where: 'Record / tag edit' },
    ],
  },
];

function Kbd({ children }) {
  return (
    <kbd style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 24,
      height: 24,
      padding: '2px 7px',
      background: 'hsl(var(--secondary))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 6,
      fontSize: 12,
      fontFamily: "'Geist', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
      fontWeight: 500,
      lineHeight: 1,
      color: 'hsl(var(--foreground))',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </kbd>
  );
}

function KeyCombo({ keys }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </span>
  );
}

function KeyboardShortcutDialog({ open, onClose }) {
  const ref = React.useRef(null);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(9, 11, 16, 0.55)',
        backdropFilter: 'blur(2px)',
        animation: 'kbdOverlayIn 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes kbdOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes kbdDialogIn {
          from { opacity: 0; transform: scale(0.97) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'calc(var(--radius) + 2px)',
          boxShadow: '0 16px 48px hsl(var(--foreground) / 0.12), 0 2px 8px hsl(var(--foreground) / 0.06)',
          animation: 'kbdDialogIn 0.18s ease-out',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 20px 0 20px',
        }}>
          <h2 className="text-section-heading" style={{ margin: 0 }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'hsl(var(--muted-foreground))',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'hsl(var(--accent))';
              e.currentTarget.style.color = 'hsl(var(--foreground))';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Shortcut groups */}
        <div style={{ padding: '6px 20px 20px' }}>
          {SHORTCUT_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {/* Group header */}
              <div style={{
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'hsl(var(--muted-foreground))',
                marginTop: gi === 0 ? 14 : 22,
                marginBottom: 10,
              }}>
                {group.label}
              </div>

              {/* Shortcut rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.shortcuts.map((sc, si) => (
                  <div
                    key={si}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 8px',
                      borderRadius: 6,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--accent) / 0.5)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="text-card-title">{sc.action}</span>
                      {sc.where && (
                        <span className="text-caption" style={{ fontSize: 11 }}>{sc.where}</span>
                      )}
                    </div>
                    <KeyCombo keys={sc.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Footer hint */}
          <div style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px solid hsl(var(--border))',
            textAlign: 'center',
          }}>
            <span className="text-caption" style={{ fontSize: 11, opacity: 0.7 }}>
              Press <Kbd>?</Kbd> anywhere to toggle this dialog
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { KeyboardShortcutDialog, IS_MAC, MOD, Kbd, KeyCombo });
