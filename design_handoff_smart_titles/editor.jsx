// Shared editing UI for a single collection. Used by BOTH the master-detail
// layout and the accordion layout so behaviour stays identical.
const { useState, useRef, useEffect, useMemo } = React;

// ---- tiny icon set (simple shapes only) ----
function IconGrip() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true" className="st-grip">
      {[3, 7, 11].map((cy) => [2.5, 7.5].map((cx) => (
        <circle key={cx + "-" + cy} cx={cx} cy={cy} r="1.1" />
      )))}
    </svg>
  );
}
function IconX({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function IconPlus({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TypeTag({ type }) {
  return <span className="st-type">{type}</span>;
}

// ---- a property currently in the title (draggable + arrow-movable) ----
function IconChevron({ dir }) {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">
      <path d={dir === "left" ? "M5.5 1.5L2 6l3.5 4.5" : "M2.5 1.5L6 6l-3.5 4.5"} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PropChip({ prop, index, count, onRemove, onMove, dnd }) {
  const dragging = dnd.dragIndex === index;
  const isOver = dnd.overIndex === index && dnd.dragIndex !== index;
  return (
    <div
      className={"st-chip" + (dragging ? " is-dragging" : "") + (isOver ? " is-over" : "")}
      draggable
      onDragStart={(e) => { dnd.start(index); e.dataTransfer.effectAllowed = "move"; }}
      onDragEnter={(e) => { e.preventDefault(); dnd.enter(index); }}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={dnd.end}
      onDrop={(e) => { e.preventDefault(); dnd.drop(index); }}
      title="Drag to reorder"
    >
      <button className="st-chip-move" disabled={index === 0} onClick={() => onMove(index, -1)} title="Move left" aria-label={"Move " + prop.name + " left"}><IconChevron dir="left" /></button>
      <span className="st-chip-name">{prop.name}</span>
      <button className="st-chip-move" disabled={index === count - 1} onClick={() => onMove(index, 1)} title="Move right" aria-label={"Move " + prop.name + " right"}><IconChevron dir="right" /></button>
      <button className="st-chip-x" onClick={() => onRemove(index)} title={"Remove " + prop.name} aria-label={"Remove " + prop.name}>
        <IconX />
      </button>
    </div>
  );
}

// ---- searchable "+ Add property" popover (portaled to body, fixed-positioned) ----
function AddPropertyPopover({ available, onAdd, onClose, anchorRect }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function onKey(e) { if (e.key === "Escape") onClose(); }
    function onScroll() { onClose(); }
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return available;
    return available.filter((p) => p.name.toLowerCase().includes(s) || p.type.toLowerCase().includes(s));
  }, [q, available]);

  // position: fixed relative to the anchor button; flip up if more room above
  const W = 290, GAP = 8, MARGIN = 12, CAP = 360;
  const a = anchorRect || { left: 40, bottom: 120, top: 90 };
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
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search properties…"
          onKeyDown={(e) => { if (e.key === "Enter" && filtered[0]) onAdd(filtered[0]); }}
        />
      </div>
      <div className="st-pop-list">
        {filtered.length === 0 && <div className="st-pop-empty">No matches</div>}
        {filtered.map((p) => (
          <button key={p.name + p.type} className="st-pop-item" onClick={() => onAdd(p)}>
            <span className="st-pop-plus"><IconPlus size={10} /></span>
            <span className="st-pop-name">{p.name}</span>
            <TypeTag type={p.type} />
          </button>
        ))}
      </div>
      <div className="st-pop-foot">{available.length} available · click to add</div>
    </div>,
    document.body
  );
}

function SeparatorField({ value, onChange }) {
  return (
    <label className="st-sep">
      <span className="st-label">Separator</span>
      <input
        className="st-sep-input"
        value={value}
        maxLength={3}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </label>
  );
}

// ---- the full editor body for one collection ----
function CollectionEditor({ collection, onChange, headerExtra }) {
  const [popOpen, setPopOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const addBtnRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const openPop = () => {
    if (popOpen) { setPopOpen(false); return; }
    if (addBtnRef.current) setAnchorRect(addBtnRef.current.getBoundingClientRect());
    setPopOpen(true);
  };

  const set = (patch) => onChange({ ...collection, ...patch });

  const dnd = {
    dragIndex, overIndex,
    start: (i) => setDragIndex(i),
    enter: (i) => setOverIndex(i),
    end: () => { setDragIndex(null); setOverIndex(null); },
    drop: (i) => {
      if (dragIndex === null || dragIndex === i) { setDragIndex(null); setOverIndex(null); return; }
      const next = collection.inTitle.slice();
      const [moved] = next.splice(dragIndex, 1);
      next.splice(i, 0, moved);
      set({ inTitle: next });
      setDragIndex(null); setOverIndex(null);
    },
  };

  const addProp = (prop) => {
    set({
      inTitle: [...collection.inTitle, prop],
      available: collection.available.filter((a) => !(a.name === prop.name && a.type === prop.type)),
    });
    setPopOpen(false);
  };
  const removeProp = (index) => {
    const removed = collection.inTitle[index];
    set({
      inTitle: collection.inTitle.filter((_, i) => i !== index),
      available: [...collection.available, removed],
    });
  };
  const moveProp = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= collection.inTitle.length) return;
    const next = collection.inTitle.slice();
    [next[index], next[j]] = [next[j], next[index]];
    set({ inTitle: next });
  };

  const sep = collection.separator || "–";

  return (
    <div className="st-editor">
      {headerExtra}

      <div className="st-block">
        <div className="st-label">In title (in order)</div>
        <div className="st-chips">
          {collection.inTitle.map((prop, i) => (
            <PropChip key={prop.name + i} prop={prop} index={i} count={collection.inTitle.length} onRemove={removeProp} onMove={moveProp} dnd={dnd} />
          ))}
          <div className="st-add-wrap">
            <button ref={addBtnRef} className={"st-add" + (popOpen ? " is-open" : "")} onClick={openPop}>
              <IconPlus /> Add property
            </button>
            {popOpen && (
              <AddPropertyPopover available={collection.available} anchorRect={anchorRect} onAdd={addProp} onClose={() => setPopOpen(false)} />
            )}
          </div>
          {collection.inTitle.length === 0 && (
            <span className="st-empty-hint">No properties yet — add one →</span>
          )}
        </div>
      </div>

      <div className="st-row">
        <SeparatorField value={collection.separator} onChange={(v) => set({ separator: v })} />
      </div>

      <div className="st-preview">
        <span className="st-label">Preview</span>
        <span className="st-preview-line">
          <span className="st-pv-page">Page name</span><svg className="st-pv-arrow" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true"><path d="M3 8L8 3M8 3H4.4M8 3V6.6" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {collection.inTitle.map((prop, i) => (
            <React.Fragment key={i}>
              <span className="st-pv-sep">{" " + sep + " "}</span>
              <span className="st-pv-val">{prop.name}</span>
            </React.Fragment>
          ))}
          {collection.inTitle.length === 0 && <span className="st-pv-sep">{"  — no properties yet"}</span>}
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { CollectionEditor, IconX, IconPlus, IconSearch, TypeTag });
