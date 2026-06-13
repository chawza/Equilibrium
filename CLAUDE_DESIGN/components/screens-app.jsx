/* ═══════════════════════════════════════
   Settings — data management & about
   ═══════════════════════════════════════ */

function Settings({ onReset, theme, onToggleTheme, onShowTour, onShowBudgetGuide, onShowShortcuts }) {
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState(null);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  }

  return (
    <div className="page-enter" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="text-page-title" style={{ marginBottom: 28 }}>Settings</h1>

      {/* Appearance section */}
      <div style={{ marginBottom: 32 }}>
        <div className="text-section-heading" style={{ marginBottom: 12 }}>Appearance</div>
        <EqCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0, display: 'flex' }}>
                <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Dark mode</div>
                <div className="text-caption">{theme === 'dark' ? 'Using the dark theme' : 'Using the light theme'}</div>
              </div>
            </div>
            <ThemeSwitch on={theme === 'dark'} onChange={onToggleTheme} />
          </div>
        </EqCard>
      </div>

      {/* Help section */}
      {/* Data section */}
      <div style={{ marginBottom: 32 }}>
        <div className="text-section-heading" style={{ marginBottom: 12 }}>Data</div>
        <EqCard>
          <div style={{ padding: '4px 0' }}>
            <SettingsRow
              icon="download"
              title="Export to JSON"
              description="Download all budgets as a JSON file"
              action={<EqButton variant="outline" size="sm" onClick={() => showToast('Exported successfully')}>Export</EqButton>} />
            
            <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0 18px' }} />
            <SettingsRow
              icon="upload"
              title="Import from JSON"
              description="Restore budgets from a previously exported file"
              action={<EqButton variant="outline" size="sm" onClick={() => showToast('Import dialog opened')}>Import</EqButton>} />
            
            <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0 18px' }} />
            <SettingsRow
              icon="database"
              title="Copy SQLite file"
              description="Copy the raw database file to a location of your choice"
              action={<EqButton variant="outline" size="sm" onClick={() => showToast('File copied')}>Copy</EqButton>} />
            
          </div>
        </EqCard>
      </div>

      {/* Help section */}
      <div style={{ marginBottom: 32 }}>
        <div className="text-section-heading" style={{ marginBottom: 12 }}>Help</div>
        <EqCard>
          <div style={{ padding: '4px 0' }}>
            <SettingsRow
              icon="book"
              title="App Tour"
              description="A quick walk-through of the main screens and concepts."
              action={<EqButton variant="outline" size="sm" onClick={onShowTour}>Show again</EqButton>} />

            <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0 18px' }} />
            <SettingsRow
              icon="grid"
              title="Budget Guide"
              description="How to set up a budget and add your first records."
              action={<EqButton variant="outline" size="sm" onClick={onShowBudgetGuide}>Show again</EqButton>} />

            <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0 18px' }} />
            <SettingsRow
              icon="keyboard"
              title="Keyboard Shortcuts"
              description="View all available keyboard shortcuts."
              action={<EqButton variant="outline" size="sm" onClick={onShowShortcuts}>View</EqButton>} />

          </div>
        </EqCard>
      </div>

      {/* Danger zone */}
      <div style={{ marginBottom: 32 }}>
        <div className="text-section-heading" style={{ marginBottom: 12, color: 'hsl(var(--destructive))' }}>
          Danger Zone
        </div>
        <EqCard style={{ borderColor: 'hsl(var(--destructive) / 0.2)' }}>
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Reset all data</div>
              <div className="text-caption">Permanently delete all budgets and records</div>
            </div>
            {!showResetConfirm ?
            <EqButton variant="destructive" size="sm" onClick={() => setShowResetConfirm(true)}>
                Reset
              </EqButton> :

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'hsl(var(--destructive))' }}>Are you sure?</span>
                <EqButton variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </EqButton>
                <EqButton variant="destructive" size="sm" onClick={() => {
                onReset();
                setShowResetConfirm(false);
                showToast('All data has been reset');
              }}>
                  Confirm
                </EqButton>
              </div>
            }
          </div>
        </EqCard>
      </div>

      {/* About */}
      <div>
        <div className="text-section-heading" style={{ marginBottom: 12 }}>About</div>
        <EqCard style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              background: 'hsl(var(--foreground))'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M2 12h20M12 2v20" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round" />
                <circle cx="6" cy="8" r="2" fill="hsl(142 76% 36%)" />
                <circle cx="18" cy="16" r="2" fill="hsl(0 72% 51%)" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Equilibrium</div>
              <div className="text-caption">Version 1.0.0</div>
            </div>
          </div>
          <div className="text-caption" style={{ lineHeight: 1.6 }}>
            A local-first personal budgeting app.<br />
            Built with Tauri + Svelte. Your data stays on your machine.
          </div>
        </EqCard>
      </div>

      {/* Toast */}
      {toastMsg &&
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        background: 'hsl(var(--foreground))',
        color: 'hsl(var(--background))',
        fontSize: 13,
        fontWeight: 500,
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: 200,
        animation: 'pageEnter 0.15s ease-out'
      }}>
          {toastMsg}
        </div>
      }
    </div>);

}

function SettingsRow({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px',
      gap: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
          <Icon name={icon} size={18} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
          <div className="text-caption">{description}</div>
        </div>
      </div>
      {action}
    </div>);

}

Object.assign(window, { Settings, SettingsRow, ThemeSwitch });

// iOS-style toggle switch
function ThemeSwitch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      style={{
        width: 44, height: 26, borderRadius: 13, border: 'none', padding: 3,
        cursor: 'pointer', flexShrink: 0,
        background: on ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
        transition: 'background 0.18s ease',
        display: 'flex', alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start'
      }}>
      
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        background: on ? 'hsl(var(--primary-foreground))' : 'hsl(var(--background))',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'background 0.18s ease'
      }} />
    </button>);

}


/* ═══════════════════════════════════════
   App shell — routing, state, tweaks
   ═══════════════════════════════════════ */
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "recordStyle": "compact",
  "columnGap": 16,
  "showTagsInList": true
} /*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [shortcutsOpen, setShortcutsOpen] = useStateApp(false);
  // First-launch tour — shown once until eq_toured is set.
  const [tourOpen, setTourOpen] = useStateApp(() => {
    try { return !localStorage.getItem('eq_toured'); } catch (e) { return false; }
  });
  // First-budget guide — opened by BudgetForm the first time an empty budget is viewed.
  const [budgetGuideOpen, setBudgetGuideOpen] = useStateApp(false);

  function dismissTour() {
    try { localStorage.setItem('eq_toured', 'true'); } catch (e) {}
    setTourOpen(false);
  }
  function replayTour() {
    try { localStorage.removeItem('eq_toured'); } catch (e) {}
    setTourOpen(true);
  }
  function dismissBudgetGuide() {
    try { localStorage.setItem('eq_budget_guided', 'true'); } catch (e) {}
    setBudgetGuideOpen(false);
  }
  function replayBudgetGuide() {
    try { localStorage.removeItem('eq_budget_guided'); } catch (e) {}
    setBudgetGuideOpen(true);
  }
  const [page, setPage] = useStateApp(() => {
    const saved = localStorage.getItem('eq_page') || 'dashboard';
    // selectedTag isn't persisted — don't land on a tag detail with no tag.
    return saved === 'tagDetail' ? 'tags' : saved;
  });
  const [selectedBudgetId, setSelectedBudgetId] = useStateApp(() => {
    const saved = localStorage.getItem('eq_selectedBudget');
    return saved ? parseInt(saved, 10) : null;
  });
  const [selectedTag, setSelectedTag] = useStateApp(null);
  const [budgets, setBudgets] = useStateApp(() => {
    const saved = localStorage.getItem('eq_budgets');
    const savedVersion = parseInt(localStorage.getItem('eq_data_version') || '0', 10);
    if (saved && savedVersion === DATA_VERSION) {
      try {return JSON.parse(saved);} catch (e) {}
    }
    return createSampleData();
  });
  // Bumped whenever the tag registry changes (it lives outside React).
  const [, bumpTags] = useStateApp(0);
  const forceTagRefresh = () => bumpTags((v) => v + 1);

  // Theme (light / dark)
  const [theme, setThemeState] = useStateApp(() => {
    return localStorage.getItem('eq_theme') === 'dark' ? 'dark' : 'light';
  });
  // Keep the module-level theme + <html> class + storage in sync.
  setEqTheme(theme);
  useEffectApp(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('eq_theme', theme);
    // Force a reflow so inherited var()-based colors repaint immediately.
    void document.body.offsetHeight;
  }, [theme]);
  function toggleTheme() {
    setThemeState((t) => t === 'dark' ? 'light' : 'dark');
  }

  // Persist state
  useEffectApp(() => {
    localStorage.setItem('eq_budgets', JSON.stringify(budgets));
    localStorage.setItem('eq_data_version', String(DATA_VERSION));
  }, [budgets]);
  useEffectApp(() => {
    localStorage.setItem('eq_page', page);
  }, [page]);
  useEffectApp(() => {
    if (selectedBudgetId) localStorage.setItem('eq_selectedBudget', selectedBudgetId);
  }, [selectedBudgetId]);

  function navigate(p) {
    setPage(p);
  }

  function selectBudget(id) {
    setSelectedBudgetId(id);
    setPage('budget');
  }

  function selectTag(tag) {
    setSelectedTag(tag);
    setPage('tagDetail');
  }

  function createBudget() {
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const name = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const newBudget = {
      id: nextId(),
      name,
      startDate: `${monthNames[now.getMonth()].slice(0, 3)} 1, ${now.getFullYear()}`,
      endDate: `${monthNames[now.getMonth()].slice(0, 3)} ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}, ${now.getFullYear()}`,
      status: 'plan',
      records: []
    };
    setBudgets((prev) => [...prev, newBudget]);
    selectBudget(newBudget.id);
  }

  function updateBudget(id, updates) {
    setBudgets((prev) => prev.map((b) =>
    b.id === id ? { ...b, ...updates } : b
    ));
  }

  function deleteBudget(id) {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    if (selectedBudgetId === id) {
      setPage('dashboard');
    }
  }

  function resetAll() {
    setBudgets(createSampleData());
    setPage('dashboard');
    setSelectedBudgetId(null);
  }

  // ─── Tag management ───
  function handleRenameTag(oldName, newName) {
    const finalKey = renameTagInRegistry(oldName, newName);
    if (!finalKey || finalKey === oldName) {forceTagRefresh();return;}
    setBudgets((prev) => prev.map((b) => ({
      ...b,
      records: b.records.map((r) => {
        if (!r.tags || !r.tags.includes(oldName)) return r;
        const next = r.tags.map((t) => t === oldName ? finalKey : t);
        return { ...r, tags: [...new Set(next)] };
      })
    })));
    setSelectedTag((p) => p === oldName ? finalKey : p);
    forceTagRefresh();
  }
  function handleRecolorTag(name, color) {
    setTagColor(name, color);
    forceTagRefresh();
  }
  function handleDeleteTag(name) {
    removeTagFromRegistry(name);
    setBudgets((prev) => prev.map((b) => ({
      ...b,
      records: b.records.map((r) =>
      r.tags && r.tags.includes(name) ? { ...r, tags: r.tags.filter((t) => t !== name) } : r
      )
    })));
    forceTagRefresh();
  }
  function handleCreateTag(name, color) {
    registerTag(name, color);
    forceTagRefresh();
  }

  // ─── Global keyboard shortcuts ───
  useEffectApp(() => {
    function handleGlobalKey(e) {
      // Ignore when typing in an input/textarea
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      // ? to toggle shortcut help (only when not typing)
      if (e.key === '?' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + / to toggle shortcut help
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // Navigation shortcuts: Cmd/Ctrl + 1/2/3/,
      if (e.metaKey || e.ctrlKey) {
        const navMap = { '1': 'dashboard', '2': 'stats', '3': 'tags', ',': 'settings' };
        if (navMap[e.key]) {
          e.preventDefault();
          navigate(navMap[e.key]);
          return;
        }
        // Cmd/Ctrl+N — context-sensitive new
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          if (page === 'dashboard') createBudget();
          // Tags page: the TagManager handles its own "new tag" UX
          return;
        }
      }
    }
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [page]);

  const selectedBudget = budgets.find((b) => b.id === selectedBudgetId);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'hsl(var(--background))'
    }}>
      {/* Sidebar */}
      <Sidebar activePage={page === 'tagDetail' ? 'tags' : page} onNavigate={navigate} />

      {/* Main content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: 32,
        position: 'relative'
      }}>
        {page === 'dashboard' &&
        <Dashboard
          budgets={budgets}
          onSelectBudget={selectBudget}
          onCreateBudget={createBudget} />

        }
        {page === 'budget' && selectedBudget &&
        <BudgetForm
          budget={selectedBudget}
          onBack={() => navigate('dashboard')}
          onUpdateBudget={updateBudget}
          onShowGuide={() => setBudgetGuideOpen(true)}
          tweaks={tweaks} />

        }
        {page === 'stats' &&
        <Stats budgets={budgets} />
        }
        {page === 'tags' &&
        <TagManager
          budgets={budgets}
          onCreate={handleCreateTag}
          onOpenTag={selectTag} />

        }
        {page === 'tagDetail' && selectedTag && allTags().includes(selectedTag) &&
        <TagDetail
          tag={selectedTag}
          budgets={budgets}
          onBack={() => navigate('tags')}
          onRename={handleRenameTag}
          onRecolor={handleRecolorTag}
          onDelete={(t) => {handleDeleteTag(t);navigate('tags');}}
          onOpenBudget={selectBudget} />

        }
        {page === 'settings' &&
        <Settings
          onReset={resetAll}
          theme={theme}
          onToggleTheme={toggleTheme}
          onShowTour={replayTour}
          onShowBudgetGuide={replayBudgetGuide}
          onShowShortcuts={() => setShortcutsOpen(true)} />
        }
      </main>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)} />

      {/* Onboarding modals */}
      <TourModal open={tourOpen} onClose={dismissTour} />
      <BudgetGuideModal open={budgetGuideOpen} onClose={dismissBudgetGuide} />
      

      {/* Tweaks Panel */}
      <TweaksPanel>
        <TweakSection label="Records" />
        <TweakRadio
          label="Row style"
          value={tweaks.recordStyle}
          options={['compact', 'comfortable']}
          onChange={(v) => setTweak('recordStyle', v)} />
        
        <TweakToggle
          label="Show tags"
          value={tweaks.showTagsInList}
          onChange={(v) => setTweak('showTagsInList', v)} />
        
        <TweakSection label="Layout" />
        <TweakSlider
          label="Column gap"
          value={tweaks.columnGap}
          min={8}
          max={32}
          step={4}
          unit="px"
          onChange={(v) => setTweak('columnGap', v)} />
        
      </TweaksPanel>
    </div>);

}

// ─── Mount ───
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);