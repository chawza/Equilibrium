/* ═══════════════════════════════════════
   Onboarding — first-launch tour + first-budget guide
   localStorage-gated (eq_toured / eq_budget_guided)
   ═══════════════════════════════════════ */

// ─── Shared modal shell (matches KeyboardShortcutDialog chrome) ───
function OnbModal({ open, onClose, width = 460, children }) {
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
        padding: 24,
        background: 'rgba(9, 11, 16, 0.55)',
        backdropFilter: 'blur(2px)',
        animation: 'onbOverlayIn 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes onbOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes onbDialogIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'calc(var(--radius) + 2px)',
          boxShadow: '0 16px 48px hsl(var(--foreground) / 0.12), 0 2px 8px hsl(var(--foreground) / 0.06)',
          animation: 'onbDialogIn 0.18s ease-out',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Small dismiss (X) button, top-right.
function OnbClose({ onClose }) {
  return (
    <button
      onClick={onClose}
      style={{
        position: 'absolute', top: 16, right: 16,
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', background: 'transparent', borderRadius: 6,
        cursor: 'pointer', color: 'hsl(var(--muted-foreground))',
        transition: 'background 0.12s, color 0.12s', zIndex: 2,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--accent))'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
    >
      <Icon name="x" size={16} />
    </button>
  );
}

// App glyph (same mark used in the sidebar / About card).
function OnbGlyph({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 10, background: 'hsl(var(--foreground))',
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <path d="M2 12h20M12 2v20" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round" />
        <circle cx="6" cy="8" r="2" fill="hsl(142 76% 36%)" />
        <circle cx="18" cy="16" r="2" fill="hsl(0 72% 51%)" />
      </svg>
    </div>
  );
}

/* ─── First-launch tour ─── */

// Mini period-card stack — "one budget = one period".
function ConceptBudgets() {
  const card = (top, left, z, faded) => ({
    position: 'absolute', top, left, width: 40, height: 30, zIndex: z,
    borderRadius: 5, background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    opacity: faded ? 0.55 : 1,
    boxShadow: '0 1px 2px hsl(var(--foreground) / 0.06)',
  });
  return (
    <ConceptFrame>
      <div style={{ position: 'relative', width: 56, height: 44 }}>
        <div style={card(0, 14, 1, true)} />
        <div style={card(4, 7, 2, true)} />
        <div style={{ ...card(8, 0, 3, false), padding: 5 }}>
          <div style={{ display: 'flex', gap: 2.5, marginBottom: 4 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'hsl(var(--inflow))' }} />
            <span style={{ width: 14, height: 4, borderRadius: 2, background: 'hsl(var(--muted-foreground) / 0.35)' }} />
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'hsl(var(--secondary))', overflow: 'hidden' }}>
            <div style={{ width: '62%', height: '100%', background: 'hsl(var(--inflow))' }} />
          </div>
        </div>
      </div>
    </ConceptFrame>
  );
}

// The signature T-account — money in left, out right.
function ConceptFlow() {
  const bar = (w, color) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 3 }}>
      <span style={{ width: 9, height: 3, borderRadius: 2, background: 'hsl(var(--muted-foreground) / 0.35)' }} />
      <span style={{ width: w, height: 3, borderRadius: 2, background: color }} />
    </div>
  );
  return (
    <ConceptFrame>
      <div style={{
        display: 'flex', width: 54, height: 42,
        border: '1px solid hsl(var(--border))', borderRadius: 5,
        background: 'hsl(var(--card))', overflow: 'hidden',
      }}>
        <div style={{ flex: 1, padding: '5px 5px 0' }}>
          <span style={{ display: 'block', width: 11, height: 3.5, borderRadius: 2, background: 'hsl(var(--inflow))', marginBottom: 5 }} />
          {bar(12, 'hsl(var(--inflow))')}
        </div>
        <div style={{ width: 1, background: 'hsl(var(--border))' }} />
        <div style={{ flex: 1, padding: '5px 5px 0' }}>
          <span style={{ display: 'block', width: 11, height: 3.5, borderRadius: 2, background: 'hsl(var(--outflow))', marginBottom: 5, marginLeft: 'auto' }} />
          {bar(8, 'hsl(var(--outflow))')}
          {bar(11, 'hsl(var(--outflow))')}
        </div>
      </div>
    </ConceptFrame>
  );
}

// Fanned tag chips rolling up.
function ConceptTags() {
  const chip = (label, dot, rotate, x, y, z) => (
    <div style={{
      position: 'absolute', left: x, top: y, zIndex: z,
      display: 'flex', alignItems: 'center', gap: 3.5,
      padding: '2.5px 6px', borderRadius: 999,
      background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
      boxShadow: '0 1px 3px hsl(var(--foreground) / 0.07)',
      transform: `rotate(${rotate}deg)`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
      <span style={{ width: label, height: 3.5, borderRadius: 2, background: 'hsl(var(--muted-foreground) / 0.4)' }} />
    </div>
  );
  return (
    <ConceptFrame>
      <div style={{ position: 'relative', width: 56, height: 44 }}>
        {chip(16, 'hsl(var(--outflow))', -7, 4, 3, 1)}
        {chip(20, 'hsl(217 91% 60%)', 4, 10, 16, 2)}
        {chip(13, 'hsl(var(--inflow))', -3, 6, 29, 3)}
      </div>
    </ConceptFrame>
  );
}

// Shared framed canvas for a concept graphic.
function ConceptFrame({ children }) {
  return (
    <div style={{
      width: 72, height: 60, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 10,
      background: 'hsl(var(--secondary) / 0.55)',
      border: '1px solid hsl(var(--border))',
    }}>
      {children}
    </div>
  );
}

const TOUR_CONCEPTS = [
  {
    Graphic: ConceptBudgets,
    title: 'Budgets',
    desc: 'Each budget covers one period — usually a month. Plan it, track it, then close it out.',
  },
  {
    Graphic: ConceptFlow,
    title: 'Inflow & Outflow',
    desc: 'Every budget is a T-account: money in on the left, money out on the right. The balance is what remains.',
  },
  {
    Graphic: ConceptTags,
    title: 'Tags',
    desc: 'Label records to see where your money actually goes — totals roll up across budgets in Stats.',
  },
];

// Scales a concept graphic up while keeping it centered in a fixed footprint.
function BigGraphic({ Graphic, scale = 2.4 }) {
  return (
    <div style={{
      width: 72 * scale, height: 60 * scale,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <Graphic />
      </div>
    </div>
  );
}

function TourModal({ open, onClose }) {
  const [step, setStep] = React.useState(0);
  const last = TOUR_CONCEPTS.length - 1;

  // Reset to the first slide each time the tour is opened.
  React.useEffect(() => { if (open) setStep(0); }, [open]);

  // Left/right arrows navigate slides.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'ArrowRight') { e.stopPropagation(); setStep(s => Math.min(s + 1, last)); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); setStep(s => Math.max(s - 1, 0)); }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, last]);

  return (
    <OnbModal open={open} onClose={onClose} width={560}>
      <OnbClose onClose={onClose} />

      {/* Header */}
      <div style={{ padding: '28px 28px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <OnbGlyph size={46} />
        <div>
          <h2 className="text-section-heading" style={{ margin: 0, fontSize: 19 }}>Welcome to Equilibrium</h2>
          <p className="text-caption" style={{ marginTop: 2 }}>A local-first budget that balances in and out.</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid hsl(var(--border))' }} />

      {/* Slider */}
      <div style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          width: `${TOUR_CONCEPTS.length * 100}%`,
          transform: `translateX(-${step * (100 / TOUR_CONCEPTS.length)}%)`,
          transition: 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          {TOUR_CONCEPTS.map((c, i) => (
            <div
              key={c.title}
              aria-hidden={i !== step}
              style={{
                width: `${100 / TOUR_CONCEPTS.length}%`,
                flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center',
                padding: '34px 48px 30px',
                opacity: i === step ? 1 : 0.35,
                transition: 'opacity 0.42s ease',
              }}
            >
              <BigGraphic Graphic={c.Graphic} scale={2.5} />
              <div className="text-section-heading" style={{ fontSize: 20, marginTop: 30, marginBottom: 8 }}>{c.title}</div>
              <div className="text-caption" style={{ fontSize: 14.5, lineHeight: 1.6, textWrap: 'pretty', maxWidth: 360 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: dots + nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '16px 28px 22px', borderTop: '1px solid hsl(var(--border))',
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {TOUR_CONCEPTS.map((c, i) => (
            <button
              key={c.title}
              onClick={() => setStep(i)}
              aria-label={`Go to ${c.title}`}
              style={{
                width: i === step ? 22 : 7, height: 7,
                padding: 0, border: 'none', cursor: 'pointer',
                borderRadius: 999,
                background: i === step ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground) / 0.35)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {step > 0 && (
            <EqButton variant="ghost" size="md" onClick={() => setStep(s => Math.max(s - 1, 0))}>Back</EqButton>
          )}
          {step < last ? (
            <EqButton variant="default" size="md" onClick={() => setStep(s => Math.min(s + 1, last))}>
              Next
              <Icon name="arrowRight" size={15} color="hsl(var(--primary-foreground))" />
            </EqButton>
          ) : (
            <EqButton variant="default" size="md" onClick={onClose}>
              Get started
              <Icon name="arrowRight" size={15} color="hsl(var(--primary-foreground))" />
            </EqButton>
          )}
        </div>
      </div>
    </OnbModal>
  );
}

/* ─── First-budget guide ─── */
function BudgetGuideModal({ open, onClose }) {
  return (
    <OnbModal open={open} onClose={onClose} width={440}>
      <OnbClose onClose={onClose} />

      {/* Header */}
      <div style={{ padding: '24px 24px 16px' }}>
        <div style={{
          width: 38, height: 38, marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 9, background: 'hsl(var(--secondary))', color: 'hsl(var(--foreground))',
        }}>
          <Icon name="grid" size={19} />
        </div>
        <h2 className="text-section-heading" style={{ margin: 0, fontSize: 17 }}>This budget is empty — let's fill it</h2>
        <p className="text-caption" style={{ marginTop: 4, lineHeight: 1.55, textWrap: 'pretty' }}>
          Equilibrium lays each budget out as a T-account. Inflow and outflow sit side by side so the balance is always obvious.
        </p>
      </div>

      {/* Mini T-account diagram */}
      <div style={{ padding: '0 24px 4px' }}>
        <div style={{
          display: 'flex', alignItems: 'stretch',
          border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)',
          background: 'hsl(var(--background))', overflow: 'hidden',
        }}>
          <GuideColumn label="Inflow" color="hsl(var(--inflow))" sample="Salary" />
          <div style={{ width: 1, background: 'hsl(var(--border))' }} />
          <GuideColumn label="Outflow" color="hsl(var(--outflow))" sample="Rent" />
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: '16px 24px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <GuideStep n="1" text={<>Add what comes <strong style={{ fontWeight: 600 }}>in</strong> on the left, what goes <strong style={{ fontWeight: 600 }}>out</strong> on the right.</>} />
        <GuideStep n="2" text={<>Hit the <span style={{ display: 'inline-flex', verticalAlign: 'middle', width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 5, background: 'hsl(var(--secondary))', margin: '0 1px' }}><Icon name="plus" size={11} /></span> at the top of a column — or the add row — to create a record.</>} />
        <GuideStep n="3" text={<>The balance bar below tracks how much of your inflow is still unallocated.</>} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 24px 20px' }}>
        <EqButton variant="default" size="md" onClick={onClose}>Got it</EqButton>
      </div>
    </OnbModal>
  );
}

function GuideColumn({ label, color, sample }) {
  return (
    <div style={{ flex: 1, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, opacity: 0.8 }} />
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
        <span style={{ fontSize: 12, color: 'hsl(var(--foreground))' }}>{sample}</span>
        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color }}>Rp ···</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, border: '1px dashed hsl(var(--border))' }} />
    </div>
  );
}

function GuideStep({ n, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
      <span style={{
        width: 20, height: 20, flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', background: 'hsl(var(--secondary))',
        fontSize: 11, fontWeight: 600, color: 'hsl(var(--foreground))',
      }}>{n}</span>
      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.55, color: 'hsl(var(--foreground))', textWrap: 'pretty' }}>{text}</span>
    </div>
  );
}

Object.assign(window, { TourModal, BudgetGuideModal });
