const { useState: useS, useMemo: useM, useRef: useR, useEffect: useE } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#30CBBB",
  "layout": "Two-pane",
  "density": "Compact"
} /*EDITMODE-END*/;

function previewText(c) {
  const sep = c.separator || "–";
  return "Page name" + c.inTitle.map((p) => " " + sep + " " + p.name).join("");
}

// editable collection name that looks like a heading
function NameField({ value, onChange }) {
  return (
    <input
      className="st-name-input"
      value={value}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Collection name" />);


}

// ---------- searchable "add collection" picker (portaled, fixed-positioned) ----------
function AddCollectionPopover({ items, onPick, onClose, anchorRect }) {
  const [q, setQ] = useS("");
  const ref = useR(null),inputRef = useR(null);
  useE(() => {inputRef.current && inputRef.current.focus();}, []);
  useE(() => {
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) onClose();};
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    const onScroll = () => onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [onClose]);

  const filtered = useM(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((c) => c.name.toLowerCase().includes(s)) : items;
  }, [q, items]);

  const W = 264,GAP = 8,MARGIN = 12,CAP = 360;
  const a = anchorRect || { left: 40, bottom: 400, top: 360 };
  const left = Math.max(MARGIN, Math.min(a.left, window.innerWidth - W - MARGIN));
  const roomBelow = window.innerHeight - a.bottom - GAP - MARGIN;
  const roomAbove = a.top - GAP - MARGIN;
  const below = roomBelow >= roomAbove;
  const maxH = Math.max(160, Math.min(CAP, below ? roomBelow : roomAbove));
  const top = below ? a.bottom + GAP : Math.max(MARGIN, a.top - GAP - maxH);

  return ReactDOM.createPortal(
    <div className="st-pop" ref={ref} role="dialog" style={{ position: "fixed", width: W, maxHeight: maxH, left, top, display: "flex", flexDirection: "column" }}>
      <div className="st-pop-search">
        <IconSearch />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search collections…"
        onKeyDown={(e) => {if (e.key === "Enter" && filtered[0]) onPick(filtered[0]);}} />
      </div>
      <div className="st-pop-list">
        {filtered.length === 0 && <div className="st-pop-empty">No collections left to add</div>}
        {filtered.map((c) =>
        <button key={c.name} className="st-pop-item" onClick={() => onPick(c)}>
            <span className="st-pop-plus"><IconPlus size={10} /></span>
            <span className="st-pop-name">{c.name}</span>
            <span className="st-type">{c.available.length} props</span>
          </button>
        )}
      </div>
      <div className="st-pop-foot">{items.length} collections available</div>
    </div>,
    document.body
  );
}

// ---------- left rail row (master-detail) ----------
function RailRow({ c, selected, onSelect }) {
  return (
    <button className={"st-rail-row" + (selected ? " is-sel" : "")} onClick={onSelect}>
      <span className="st-rail-name">{c.name}</span>
      <span className="st-rail-count" title={c.inTitle.length + " properties in title"}>{c.inTitle.length}</span>
    </button>);

}

// ---------- master-detail layout ----------
function TwoPane({ collections, selectedId, setSelectedId, updateCollection, removeCollection, onAddClick }) {
  const [q, setQ] = useS("");
  const filtered = useM(() => {
    const s = q.trim().toLowerCase();
    if (!s) return collections;
    return collections.filter((c) => c.name.toLowerCase().includes(s) || previewText(c).toLowerCase().includes(s));
  }, [q, collections]);
  const selected = collections.find((c) => c.id === selectedId) || collections[0];

  return (
    <div className="st-twopane">
      <aside className="st-rail">
        <div className="st-rail-head">
          <span className="st-label">Collections</span>
          <span className="st-rail-total">{collections.length}</span>
        </div>
        <div className="st-rail-search">
          <IconSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a collection…" spellCheck={false} />
        </div>
        <div className="st-rail-list">
          {filtered.map((c) =>
          <RailRow key={c.id} c={c} selected={selected && c.id === selected.id} onSelect={() => setSelectedId(c.id)} />
          )}
          {filtered.length === 0 && <div className="st-rail-empty">No collections match “{q}”.</div>}
        </div>
        <button className="st-add-coll" onClick={(e) => onAddClick(e.currentTarget.getBoundingClientRect())}>
          <IconPlus /> Add collection
        </button>
      </aside>

      <section className="st-detail">
        {selected ?
        <CollectionEditor
          key={selected.id}
          collection={selected}
          onChange={(c) => updateCollection(c)}
          headerExtra={
          <div className="st-detail-head">
                <NameField value={selected.name} onChange={(name) => updateCollection({ ...selected, name })} />
                <button className="st-remove" onClick={() => removeCollection(selected.id)} title="Remove collection">
                  <IconX size={14} /> Remove
                </button>
              </div>
          } /> :


        <div className="st-detail-empty">Select a collection to edit.</div>
        }
      </section>
    </div>);

}

// ---------- accordion layout ----------
function Accordion({ collections, updateCollection, removeCollection, onAddClick, openId, setOpenId }) {
  return (
    <div className="st-acc">
      {collections.map((c) => {
        const open = c.id === openId;
        return (
          <div key={c.id} className={"st-acc-item" + (open ? " is-open" : "")}>
            <button className="st-acc-summary" onClick={() => setOpenId(open ? null : c.id)}>
              <span className={"st-acc-caret" + (open ? " is-open" : "")} aria-hidden="true">›</span>
              <span className="st-acc-name">{c.name}</span>
              <span className="st-acc-pv">{previewText(c)}</span>
              <span className="st-rail-count">{c.inTitle.length}</span>
            </button>
            {open &&
            <div className="st-acc-body">
                <CollectionEditor
                collection={c}
                onChange={(nc) => updateCollection(nc)}
                headerExtra={
                <div className="st-acc-head">
                      <NameField value={c.name} onChange={(name) => updateCollection({ ...c, name })} />
                      <button className="st-remove" onClick={() => removeCollection(c.id)} title="Remove collection">
                        <IconX size={14} /> Remove
                      </button>
                    </div>
                } />
              
              </div>
            }
          </div>);

      })}
      <button className="st-add-coll wide" onClick={(e) => onAddClick(e.currentTarget.getBoundingClientRect())}>
        <IconPlus /> Add collection
      </button>
    </div>);

}

let collCounter = 100;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [collections, setCollections] = useS(() => window.SEED_COLLECTIONS.map((c) => ({ ...c })));
  const [catalog, setCatalog] = useS(() => window.COLLECTION_CATALOG.map((c) => ({ ...c })));
  const [selectedId, setSelectedId] = useS(collections[0].id);
  const [openId, setOpenId] = useS(collections[1] ? collections[1].id : collections[0].id);
  const [addAnchor, setAddAnchor] = useS(null); // null = picker closed

  const updateCollection = (nc) =>
  setCollections((cs) => cs.map((c) => c.id === nc.id ? nc : c));

  const removeCollection = (id) =>
  setCollections((cs) => {
    const removed = cs.find((c) => c.id === id);
    const next = cs.filter((c) => c.id !== id);
    if (removed) {
      const back = { name: removed.name, separator: removed.separator, inTitle: [], available: removed.available };
      setCatalog((cat) => [...cat, back].sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (selectedId === id && next[0]) setSelectedId(next[0].id);
    if (openId === id) setOpenId(null);
    return next;
  });

  const pickCollection = (entry) => {
    const id = "coll-" + collCounter++;
    const nc = { ...entry, id };
    setCollections((cs) => [...cs, nc]);
    setCatalog((cat) => cat.filter((c) => c.name !== entry.name));
    setSelectedId(id);
    setOpenId(id);
    setAddAnchor(null);
  };

  const rootStyle = { "--accent": t.accent };

  return (
    <div className="st-shell" data-density={(t.density || "Comfortable").toLowerCase()} style={rootStyle}>
      <header className="st-header">
        <h1 className="st-title">Smart Titles</h1>
        <p className="st-desc">
          Show property values after page names in references, search results and the quick switcher.
          Pick a collection, then add the properties that should appear in its title.
        </p>
      </header>

      <main className="st-main">
        {t.layout === "Accordion" ?
        <Accordion
          collections={collections}
          updateCollection={updateCollection}
          removeCollection={removeCollection}
          onAddClick={(rect) => setAddAnchor(rect)}
          openId={openId}
          setOpenId={setOpenId} /> :


        <TwoPane
          collections={collections}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          updateCollection={updateCollection}
          removeCollection={removeCollection}
          onAddClick={(rect) => setAddAnchor(rect)} />

        }
      </main>

      <footer className="st-footer">
        <button className="st-btn st-btn-ghost">Cancel</button>
        <button className="st-btn st-btn-primary">Save</button>
      </footer>

      {addAnchor &&
      <AddCollectionPopover
        items={catalog}
        anchorRect={addAnchor}
        onPick={pickCollection}
        onClose={() => setAddAnchor(null)} />

      }

      <TweaksPanel>
        <TweakSection label="Layout" />
        <TweakRadio label="Pattern" value={t.layout} options={["Two-pane", "Accordion"]} onChange={(v) => setTweak("layout", v)} />
        <TweakRadio label="Density" value={t.density} options={["Comfortable", "Compact"]} onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent} options={["#30CBBB", "#5B8CFF", "#C9A227", "#7ED957", "#FF7A59"]} onChange={(v) => setTweak("accent", v)} />
      </TweaksPanel>
    </div>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);