/**
 * Smart Titles — computed title suffixes for Thymer.
 *
 * Appends the values of configured properties, grayed out, after the page name:
 *   - on references that stand alone on a line
 *   - on page headings in search results
 *   - on options in Jump To / quick switcher and other record autocompletes
 * It deliberately does NOT decorate:
 *   - the open page's H1 title (you're already on the page)
 *   - collection views (table / board / gallery / calendar)
 *   - references inside a sentence (text before or after on the same line)
 *
 * The stored title is never modified; everything is display-only DOM decoration.
 *
 * Configure via the "Smart Titles Settings" command in the command palette,
 * or directly in the plugin config JSON ("custom" field):
 *   "custom": {
 *     "collections": {
 *       "<Collection name>": {
 *         "fields": ["<Field label>", ...],   // properties to show, in order
 *         "separator": " – "                  // between name and each value
 *       }
 *     }
 *   }
 */

const DEFAULT_SEPARATOR = ' – ';

const CSS = `
.texp-suffix {
	opacity: 0.5;
	font-weight: normal;
	display: inline-block; /* blocks inherited underline from reference styling */
	pointer-events: none;
	white-space: pre;
}

/* Widen the inline @ menu so suffixes have room (Thymer's default is 400px).
 * A fixed width is required: the menu's rows are absolutely positioned, so
 * content-based sizing (max-content) collapses to the minimum. Desktop only —
 * narrow/mobile screens keep Thymer's native sizing. */
@media (min-width: 800px) {
	.cmdpal--inline {
		width: 600px !important;
		max-width: calc(100vw - 20px) !important;
	}
	.cmdpal--dialog {
		width: 650px !important;
		max-width: calc(100vw - 20px) !important;
	}
}

/* --- settings dialog (master-detail) ---
 * All colors come from Thymer's own theme tokens so the dialog follows the
 * user's theme (light/dark) and accent automatically. */
.texp-backdrop {
	position: fixed; inset: 0; z-index: 10000;
	background: var(--full-scrim, rgba(0, 0, 0, 0.45));
	display: flex; align-items: flex-start; justify-content: center;
}
.st-shell {
	margin-top: 6vh; width: 920px; max-width: calc(100vw - 32px);
	max-height: calc(100vh - 64px);
	display: flex; flex-direction: column; overflow: hidden;
	background: var(--modal-bg); color: var(--text-color);
	border: 1px solid color-mix(in srgb, var(--button-2nd-border-color) 35%, var(--modal-bg));
	border-radius: 9px;
	box-shadow: 0 24px 60px -24px rgba(0,0,0,.7);
	font-family: var(--font-sans);
	font-size: 14px;
}
.st-head { padding: 24px 26px 18px; border-bottom: 1px solid var(--cards-border-color); }
.st-title { margin: 0 0 6px; font-size: 22px; font-weight: 700; color: var(--color-text-100, var(--text-color)); }
.st-desc { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--color-text-600, var(--text-color)); }
.st-body { display: flex; flex: 1; min-height: 0; }
.st-rail {
	width: 280px; flex: none; display: flex; flex-direction: column; min-height: 0;
	border-right: 1px solid var(--cards-border-color); background: var(--cards-bg);
}
.st-rail-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 8px; }
.st-label {
	font-size: 10.5px; font-weight: 700; text-transform: uppercase;
	letter-spacing: .14em; color: var(--color-text-800, var(--text-color));
}
.st-count-pill {
	font-size: 11px; padding: 1px 7px; color: var(--color-text-600);
	background: var(--button-minimal-bg-color); border: 1px solid var(--button-border-color);
	border-radius: var(--button-radius, 5px);
}
.st-search {
	margin: 0 12px 10px; padding: 7px 9px; display: flex; align-items: center; gap: 6px;
	background: var(--button-minimal-bg-color); border: 1px solid var(--button-border-color);
	border-radius: var(--button-radius, 5px);
}
.st-search:focus-within { border-color: var(--color-primary-500); }
.st-search svg { flex: none; opacity: .45; }
.st-search input {
	all: unset; flex: 1; min-width: 0; font-size: 13px;
	font-family: var(--font-mono); color: var(--text-color);
}
.st-rail-list { flex: 1; overflow-y: auto; padding: 0 10px 10px; display: flex; flex-direction: column; gap: 2px; }
.st-rail-row {
	all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 10px;
	padding: 8px 10px; border: 1px solid transparent; border-radius: var(--button-radius, 5px);
	cursor: pointer;
}
.st-rail-row:hover { background: var(--cmdpal-hover-bg-color, var(--button-bg-hover-color)); }
.st-rail-row.sel {
	background: var(--color-primary-950);
	border-color: color-mix(in srgb, var(--color-primary-500) 38%, transparent);
}
.st-rail-row .nm { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-rail-row.sel .nm { color: var(--link-color); }
.st-badge {
	font-size: 11px; min-width: 22px; text-align: center; padding: 1px 4px;
	color: var(--color-text-600); background: var(--button-bg-color);
	border: 1px solid var(--button-border-color); border-radius: var(--button-radius, 5px);
}
.st-rail-row.sel .st-badge {
	background: transparent; color: var(--link-color);
	border-color: color-mix(in srgb, var(--color-primary-500) 38%, transparent);
}
.st-add-coll {
	all: unset; box-sizing: border-box; margin: 10px 12px 12px; padding: 7px; text-align: center;
	font-size: 13px; color: var(--color-text-600); cursor: pointer;
	border: 1px dashed var(--button-2nd-border-color); border-radius: var(--button-radius, 5px);
}
.st-add-coll:hover { color: var(--link-color); border-color: var(--color-primary-500); }
.st-detail { flex: 1; min-width: 0; overflow-y: auto; padding: 22px 26px 28px; }
.st-ed-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.st-ed-name { font-size: 19px; font-weight: 700; color: var(--color-text-100, var(--text-color)); }
.st-remove {
	all: unset; box-sizing: border-box; padding: 4px 10px; font-size: 12px; cursor: pointer;
	color: var(--color-text-800); border: 1px solid var(--button-border-color);
	border-radius: var(--button-radius, 5px); transition: color .13s, border-color .13s;
}
.st-remove:hover { color: #ff8d7a; border-color: #ff8d7a; }
.st-sec-label { margin: 20px 0 8px; }
.st-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.st-chip {
	display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px;
	line-height: 1.4;
	background: var(--color-primary-950);
	border: 1px solid color-mix(in srgb, var(--color-primary-500) 38%, transparent);
	border-radius: var(--button-radius, 5px);
	font-family: var(--font-mono); font-size: 12px; font-weight: 700;
	color: var(--link-color); cursor: grab;
}
.st-chip.st-dragging { opacity: .4; }
.st-chip.st-droptarget { box-shadow: -3px 0 0 var(--color-primary-500); }
.st-chip button {
	all: unset; cursor: pointer; padding: 0 2px; font-size: 12px; line-height: 1;
	color: color-mix(in srgb, var(--link-color) 55%, transparent);
}
.st-chip button:hover { color: var(--link-color); }
.st-chip button[disabled] { opacity: .3; cursor: default; }
.st-add {
	all: unset; box-sizing: border-box; padding: 5px 10px; font-size: 12.5px; cursor: pointer;
	line-height: 1.4;
	color: var(--color-text-600); background: var(--button-minimal-bg-color);
	border: 1px dashed var(--button-2nd-border-color); border-radius: var(--button-radius, 5px);
}
.st-add:hover, .st-add.open {
	color: var(--link-color); background: var(--color-primary-950);
	border-color: color-mix(in srgb, var(--color-primary-500) 38%, transparent);
}
.st-popover {
	position: fixed; z-index: 10001; display: flex; flex-direction: column; overflow: hidden;
	background: var(--modal-bg); border: 1px solid var(--button-border-color);
	border-radius: 7px; box-shadow: 0 18px 44px -16px rgba(0,0,0,.8);
}
.st-popover .st-search { margin: 8px 8px 6px; }
.st-pop-list { max-height: 240px; overflow-y: auto; padding: 0 6px 6px; }
.st-pop-item {
	display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer;
	border-radius: var(--button-radius, 5px); font-family: var(--font-mono); font-size: 13px;
}
.st-pop-item:hover { background: var(--cmdpal-hover-bg-color, var(--button-bg-hover-color)); }
.st-pop-item .plus { color: var(--link-color); }
.st-pop-item .nm { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-pop-item .tag { font-size: 11px; color: var(--color-text-800); }
.st-pop-foot { padding: 6px 10px; font-size: 11px; color: var(--color-text-800); border-top: 1px solid var(--cards-border-color); }
.st-sep-input {
	width: 44px; box-sizing: border-box; padding: 5px 0; text-align: center;
	background: var(--button-minimal-bg-color); color: var(--text-color);
	border: 1px solid var(--button-2nd-border-color); border-radius: var(--button-radius, 5px);
	font-family: var(--font-mono); font-size: 13px;
}
.st-sep-input:focus { outline: none; border-color: var(--color-primary-500); }
.st-preview {
	padding: 14px 16px; background: var(--cards-bg);
	border: 1px solid var(--cards-border-color); border-radius: 6px;
	font-family: var(--font-mono); font-size: 14px;
}
.st-pv-name {
	color: var(--link-color); font-weight: 700;
	text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px;
}
.st-pv-arrow { color: var(--link-color); font-size: 12px; margin-left: 3px; }
.st-pv-val { color: var(--link-color); opacity: .5; font-weight: 400; }
.st-empty { color: var(--color-text-800); font-style: italic; font-size: 13px; }
.st-foot {
	display: flex; justify-content: flex-end; gap: 8px; padding: 14px 22px;
	border-top: 1px solid var(--cards-border-color); background: var(--cards-bg);
}
.st-btn {
	all: unset; box-sizing: border-box; padding: 6px 14px; font-size: 13px; font-weight: 600;
	color: var(--color-text-600); cursor: pointer;
	border: 1px solid var(--button-2nd-border-color); border-radius: var(--button-radius, 5px);
	transition: color .13s, border-color .13s;
}
.st-btn:hover { color: var(--text-color); border-color: var(--text-color); }
.st-btn[disabled] { opacity: .5; cursor: default; }
.st-btn-primary {
	background: var(--button-primary-bg-color); border-color: var(--button-primary-bg-color);
	color: var(--button-primary-fg-color);
}
.st-btn-primary:hover { filter: brightness(1.07); color: var(--button-primary-fg-color); }
@media (max-width: 680px) {
	.st-body { flex-direction: column; }
	.st-rail { width: auto; max-height: 42%; border-right: none; border-bottom: 1px solid var(--cards-border-color); }
}
`;

/* Containers in which references must NOT be decorated. */
const SKIP_CONTAINERS = [
	'.table-view',
	'.board-view',
	'.gallery-view',
	'.calendar-view',
	'.page-props-editor',
	'.panel-tab',
].join(', ');

/* Line children that don't count as "content" when deciding if a ref is alone. */
const IGNORED_LINE_CHILDREN = [
	'listitem-indentline',
	'line-chrome-ulist',
	'lineitem-lineref',
	'lineitem-backlink-pill',
	'texp-suffix',
];

/* Collection fields that never make sense in a title suffix. */
const EXCLUDED_FIELD_IDS = ['title', 'banner', 'icon'];

class Plugin extends AppPlugin {

	/* Initialized as class fields so a stray onUnload() on a never-loaded
	 * instance (e.g. during the plugin editor's validate/preview cycle)
	 * doesn't crash on undefined state. */
	conf = {};
	cols = new Map();   // collection guid -> {fieldTypes, settings}
	cache = new Map();  // record guid -> suffix string | null
	pending = false;
	observer = null;
	handlers = [];
	settingsEl = null;
	shellEl = null;
	popEl = null;
	popAnchor = null;
	dragIdx = null;
	model = null;       // settings dialog working copy
	allCols = null;     // [{name, fields:[{label,type}]}] for the dialog
	selName = null;
	railQ = '';

	onLoad() {
		const custom = (this.getConfiguration() || {}).custom || {};
		this.conf = custom.collections || {};

		this.ui.injectCSS(CSS);

		this.ui.addCommandPaletteCommand({
			label: 'Smart Titles Settings',
			icon: 'ti-text-size',
			onSelected: () => this.openSettings(),
		});

		this.rebuildCols().then(() => {
			if (!this.cols.size) return;
			this.refresh();
			// second pass shortly after load: when the plugin is reloaded (e.g. after
			// saving config), the outgoing instance's cleanup can race the first pass
			setTimeout(() => this.refresh(), 500);
			this.startObserver();
		});

		this.handlers.push(this.events.on('record.updated', () => {
			this.cache.clear();
			this.schedule();
		}));
	}

	onUnload() {
		if (this.observer) this.observer.disconnect();
		for (const h of (this.handlers || [])) this.events.off(h);
		this.closeSettings();
		document.querySelectorAll('.texp-suffix').forEach((el) => el.remove());
	}

	startObserver() {
		if (this.observer) return;
		this.observer = new MutationObserver((muts) => this.onMutations(muts));
		this.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
	}

	async rebuildCols() {
		const all = await this.data.getAllCollections();
		this.cols.clear();
		for (const c of all) {
			const settings = this.conf[c.getName()];
			if (!settings || !Array.isArray(settings.fields) || !settings.fields.length) continue;
			const fieldTypes = new Map();
			const cfg = c.getConfiguration() || {};
			for (const f of (cfg.fields || [])) fieldTypes.set(f.label, f.type);
			this.cols.set(c.getGuid(), { fieldTypes, settings });
		}
	}

	onMutations(muts) {
		for (const m of muts) {
			// Ignore mutations caused purely by our own suffix spans.
			if (m.target && m.target.nodeType === 1 && m.target.closest && m.target.closest('.texp-suffix')) continue;
			let onlyOurs = m.addedNodes.length > 0 && m.removedNodes.length === 0;
			for (const n of m.addedNodes) {
				if (!(n.nodeType === 1 && n.classList && n.classList.contains('texp-suffix'))) { onlyOurs = false; break; }
			}
			if (onlyOurs) continue;
			this.schedule();
			return;
		}
	}

	schedule() {
		if (this.pending) return;
		this.pending = true;
		// setTimeout rather than requestAnimationFrame: rAF is suspended while the
		// window is occluded, which would leave stale titles when it comes back.
		setTimeout(() => {
			this.pending = false;
			this.refresh();
		}, 50);
	}

	refresh() {
		this.decorateReferences();
		this.decorateAutocomplete();
	}

	/* --- standalone references and search result headings --- */

	decorateReferences() {
		for (const ref of document.querySelectorAll('span.lineitem-ref[data-guid]')) {
			if (ref.closest(SKIP_CONTAINERS)) { this.removeSuffix(ref); continue; }
			const line = ref.closest('.line-div');
			if (!line || !this.refIsAlone(ref, line)) { this.removeSuffix(ref); continue; }
			this.applySuffix(ref, ref.getAttribute('data-guid'));
		}
	}

	refIsAlone(ref, line) {
		let refCount = 0;
		for (const node of line.childNodes) {
			if (node.nodeType === 3) { // text node
				if (node.textContent.replace(/[\s ​]/g, '') !== '') return false;
				continue;
			}
			if (node.nodeType !== 1) continue;
			const cl = node.classList;
			if (IGNORED_LINE_CHILDREN.some((c) => cl.contains(c))) continue;
			if (cl.contains('lineitem-ref')) { refCount++; continue; }
			// any other element with visible text means the ref is part of a sentence
			if (node.textContent.replace(/[\s ​]/g, '') !== '') return false;
		}
		return refCount === 1;
	}

	/* --- Jump To / quick switcher and other record autocompletes ---
	 *
	 * Autocomplete option rows carry no record guid in the DOM; the mapping
	 * lives in the focused component's internal state (results[i].obj.json.guid
	 * aligned with cachedResultDomNodes[i]). Undocumented internals — wrapped in
	 * try/catch so a Thymer update degrades to "no decoration" only. */

	findAutocomplete(comp, depth) {
		if (!comp || depth > 4) return null;
		if (comp.results && comp.cachedResultDomNodes) return comp;
		if (comp.autocomplete && comp.autocomplete.results && comp.autocomplete.cachedResultDomNodes) return comp.autocomplete;
		if (Array.isArray(comp.children)) {
			for (const ch of comp.children) {
				const found = this.findAutocomplete(ch, depth + 1);
				if (found) return found;
			}
		}
		return null;
	}

	decorateAutocomplete() {
		try {
			const ac = this.findAutocomplete(window.g_focusedComponent, 0);
			if (!ac) return;
			for (const idx of Object.keys(ac.cachedResultDomNodes)) {
				const node = ac.cachedResultDomNodes[idx];
				const result = ac.results[idx];
				if (!node || !node.nodeType || !result) continue;
				const label = node.querySelector('.autocomplete--option-label');
				if (!label) continue;
				const guid = this.guidFromResult(result.obj || result);
				if (guid) this.applySuffix(label, guid);
				else this.removeSuffix(label);
			}
		} catch (e) {
			/* internals changed — skip silently */
		}
	}

	/* Record guid of an autocomplete entry. Jump To stores it as json.guid;
	 * the inline @ menu stores it directly as the option's value. */
	guidFromResult(o) {
		if (!o) return null;
		if (o.json && o.json.guid) return o.json.guid;
		if (typeof o.value === 'string' && this.looksLikeGuid(o.value)) return o.value;
		return null;
	}

	looksLikeGuid(s) {
		// Thymer record guids: 20+ chars, uppercase letters + digits, no spaces.
		return /^[0-9A-Z]{20,}$/.test(s);
	}

	/* --- suffix computation and DOM application --- */

	applySuffix(el, guid) {
		const suffix = guid ? this.suffixFor(guid) : null;
		const existing = el.querySelector('.texp-suffix');
		if (!suffix) { if (existing) existing.remove(); return; }
		if (existing && existing.textContent === suffix) return;
		if (existing) existing.remove();
		const span = document.createElement('span');
		span.className = 'texp-suffix';
		span.textContent = suffix;
		// the inline @ menu ends its labels with a trailing "→" — sometimes as
		// its own text node, sometimes glued to the name (e.g. "Name ... → ").
		// Split the arrow off and keep it last so every row reads "Name – props →".
		const last = el.lastChild;
		if (last && last.nodeType === 3) {
			const m = last.textContent.match(/^([\s\S]*?)(\s*→\s*)$/);
			if (m) {
				last.textContent = m[1];
				el.appendChild(span);
				el.appendChild(document.createTextNode(m[2]));
				return;
			}
		}
		el.appendChild(span);
	}

	removeSuffix(el) {
		const existing = el.querySelector('.texp-suffix');
		if (existing) existing.remove();
	}

	suffixFor(guid) {
		if (this.cache.has(guid)) return this.cache.get(guid);
		let out = null;
		const rec = this.data.getRecord(guid);
		const col = rec ? this.cols.get(this.collectionGuidOf(rec)) : null;
		if (rec && col) {
			const sep = col.settings.separator != null ? col.settings.separator : DEFAULT_SEPARATOR;
			const parts = [];
			for (const field of col.settings.fields) {
				const v = this.formatField(rec, field, col.fieldTypes.get(field));
				if (v) parts.push(v);
			}
			out = parts.length ? sep + parts.join(sep) : null;
		}
		this.cache.set(guid, out);
		return out;
	}

	/* Relies on the record's internal row (pguid = collection guid); there is no
	 * public collection accessor on PluginRecord in the current SDK. Degrades to
	 * "no decoration" if the internal shape changes. */
	collectionGuidOf(rec) {
		try {
			return rec._getRow().pguid || null;
		} catch (e) {
			return null;
		}
	}

	formatField(rec, label, type) {
		// Use only the accessor that matches the field's declared type. Calling
		// e.g. rec.number() on a record-type field returns the value *count*, and
		// rec.text() returns the raw target guid — both wrong. A record field
		// whose target was deleted (dangling reference) simply yields no name and
		// is shown as empty; the only repair is re-picking the value on the record.
		try {
			switch (type) {
			case 'record': {
				const names = rec.linkedRecords(label).map((r) => r.getName()).filter(Boolean);
				return names.length ? names.join(', ') : null;
			}
			case 'choice': {
				const prop = rec.prop(label);
				if (!prop) return null;
				const labels = prop.selectedChoiceLabels();
				if (labels && labels.length) return labels.join(', ');
				return prop.choiceLabel();
			}
			case 'user': {
				const names = rec.users(label).map((u) => u.name || u.handle || '').filter(Boolean);
				return names.length ? names.join(', ') : null;
			}
			case 'number': {
				const n = rec.number(label);
				return n == null ? null : String(n);
			}
			case 'date':
			case 'datetime': {
				const d = rec.date(label);
				return d ? d.toLocaleDateString() : null;
			}
			default: {
				const texts = rec.texts(label);
				const t = texts && texts.length ? texts.join(', ') : rec.text(label);
				return t || null;
			}
			}
		} catch (e) {
			return null;
		}
	}

	/* =================== settings dialog =================== */

	async openSettings() {
		this.closeSettings();

		// Available collections + their usable fields
		const cols = await this.data.getAllCollections();
		this.allCols = cols.map((c) => {
			const cfg = c.getConfiguration() || {};
			const fields = (cfg.fields || [])
				.filter((f) => f.active !== false && !EXCLUDED_FIELD_IDS.includes(f.id) && f.type !== 'banner')
				.map((f) => ({ label: f.label, type: f.type }));
			return { name: c.getName(), fields };
		}).sort((a, b) => a.name.localeCompare(b.name));

		// Working copy of the current configuration
		this.model = Object.entries(this.conf).map(([name, s]) => ({
			name,
			fields: [...(s.fields || [])],
			separator: s.separator != null ? s.separator : DEFAULT_SEPARATOR,
		}));
		this.selName = this.model.length ? this.model[0].name : null;
		this.railQ = '';

		const backdrop = document.createElement('div');
		backdrop.className = 'texp-backdrop';
		backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) this.closeSettings(); });
		this.shellEl = document.createElement('div');
		this.shellEl.className = 'st-shell';
		backdrop.appendChild(this.shellEl);
		document.body.appendChild(backdrop);
		this.settingsEl = backdrop;
		this.settingsKeyHandler = (e) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				if (this.popEl) this.closePopover();
				else this.closeSettings();
			}
		};
		document.addEventListener('keydown', this.settingsKeyHandler, true);

		this.renderSettings();
	}

	closeSettings() {
		this.closePopover();
		if (this.settingsEl) { this.settingsEl.remove(); this.settingsEl = null; this.shellEl = null; }
		if (this.settingsKeyHandler) { document.removeEventListener('keydown', this.settingsKeyHandler, true); this.settingsKeyHandler = null; }
	}

	/* tiny element helper */
	mk(tag, cls, text) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (text != null) el.textContent = text;
		return el;
	}

	searchIcon() {
		const span = document.createElement('span');
		span.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';
		span.style.display = 'flex';
		return span.firstChild ? span : span;
	}

	renderSettings() {
		if (!this.shellEl) return;
		this.closePopover();
		const shell = this.shellEl;
		shell.innerHTML = '';

		// header
		const head = this.mk('div', 'st-head');
		head.appendChild(this.mk('h2', 'st-title', 'Smart Titles'));
		head.appendChild(this.mk('p', 'st-desc', 'Show property values after page names in references, search results and the quick switcher. Pick a collection, then choose which of its properties appear in the title.'));
		shell.appendChild(head);

		// body: rail + detail
		const body = this.mk('div', 'st-body');
		body.appendChild(this.renderRail());
		body.appendChild(this.renderDetail());
		shell.appendChild(body);

		// footer
		const foot = this.mk('div', 'st-foot');
		const cancel = this.mk('button', 'st-btn', 'Cancel');
		cancel.addEventListener('click', () => this.closeSettings());
		const save = this.mk('button', 'st-btn st-btn-primary', 'Save');
		save.addEventListener('click', () => this.saveSettings(save));
		foot.append(cancel, save);
		shell.appendChild(foot);
	}

	renderRail() {
		const rail = this.mk('div', 'st-rail');

		const head = this.mk('div', 'st-rail-head');
		head.appendChild(this.mk('span', 'st-label', 'Collections'));
		head.appendChild(this.mk('span', 'st-count-pill', String(this.model.length)));
		rail.appendChild(head);

		const search = this.mk('div', 'st-search');
		search.appendChild(this.searchIcon());
		const input = document.createElement('input');
		input.type = 'text';
		input.placeholder = 'Find a collection…';
		input.value = this.railQ;
		search.appendChild(input);
		rail.appendChild(search);

		const list = this.mk('div', 'st-rail-list');
		const fillList = () => {
			list.innerHTML = '';
			const q = this.railQ.trim().toLowerCase();
			for (const m of this.model) {
				if (q && !(m.name.toLowerCase().includes(q) || m.fields.join(' ').toLowerCase().includes(q))) continue;
				const row = this.mk('button', 'st-rail-row' + (m.name === this.selName ? ' sel' : ''));
				row.appendChild(this.mk('span', 'nm', m.name));
				row.appendChild(this.mk('span', 'st-badge', String(m.fields.length)));
				row.addEventListener('click', () => { this.selName = m.name; this.renderSettings(); });
				list.appendChild(row);
			}
			if (!list.childElementCount) {
				const empty = this.mk('div', 'st-empty', this.model.length ? 'No matches.' : 'Nothing configured yet.');
				empty.style.padding = '8px 10px';
				list.appendChild(empty);
			}
		};
		fillList();
		input.addEventListener('input', () => { this.railQ = input.value; fillList(); });
		rail.appendChild(list);

		const add = this.mk('button', 'st-add-coll', '+ Add collection');
		add.addEventListener('click', () => this.openCollectionPicker(add));
		rail.appendChild(add);

		return rail;
	}

	renderDetail() {
		const detail = this.mk('div', 'st-detail');
		const m = this.model.find((x) => x.name === this.selName);
		if (!m) {
			const empty = this.mk('div', 'st-empty', 'Select a collection to edit.');
			empty.style.marginTop = '8px';
			detail.appendChild(empty);
			return detail;
		}
		const colInfo = this.allCols.find((c) => c.name === m.name);
		const available = colInfo ? colInfo.fields : [];

		// editor header
		const head = this.mk('div', 'st-ed-head');
		head.appendChild(this.mk('div', 'st-ed-name', m.name));
		const remove = this.mk('button', 'st-remove', '\u2715 Remove');
		remove.addEventListener('click', () => {
			this.model = this.model.filter((x) => x !== m);
			this.selName = this.model.length ? this.model[0].name : null;
			this.renderSettings();
		});
		head.appendChild(remove);
		detail.appendChild(head);

		// chips
		detail.appendChild(this.mk('div', 'st-label st-sec-label', 'In title (in order)'));
		const chips = this.mk('div', 'st-chips');
		m.fields.forEach((label, i) => chips.appendChild(this.renderChip(m, label, i)));
		const addBtn = this.mk('button', 'st-add', '+ Add property');
		addBtn.addEventListener('click', () => this.openPropertyPicker(addBtn, m, available));
		chips.appendChild(addBtn);
		if (!m.fields.length) chips.insertBefore(this.mk('span', 'st-empty', 'No properties yet \u2014 add one.'), addBtn);
		detail.appendChild(chips);

		// separator
		detail.appendChild(this.mk('div', 'st-label st-sec-label', 'Separator'));
		const sep = document.createElement('input');
		sep.className = 'st-sep-input';
		sep.maxLength = 3;
		sep.value = m.separator;
		detail.appendChild(sep);

		// preview
		detail.appendChild(this.mk('div', 'st-label st-sec-label', 'Preview'));
		const preview = this.mk('div', 'st-preview');
		const fillPreview = () => {
			preview.innerHTML = '';
			preview.appendChild(this.mk('span', 'st-pv-name', 'Page name'));
			preview.appendChild(this.mk('span', 'st-pv-arrow ti ti-arrow-up-right'));
			if (m.fields.length) {
				const sepText = m.separator.trim() ? ' ' + m.separator.trim() + ' ' : m.separator;
				preview.appendChild(this.mk('span', 'st-pv-val', m.fields.map((f) => sepText + f).join('')));
			} else {
				preview.appendChild(this.mk('span', 'st-empty', '  \u2014 no properties yet'));
			}
		};
		fillPreview();
		sep.addEventListener('input', () => { m.separator = sep.value; fillPreview(); });
		detail.appendChild(preview);

		return detail;
	}

	renderChip(m, label, i) {
		const chip = this.mk('span', 'st-chip');
		chip.draggable = true;

		const left = this.mk('button', null, '\u2039');
		left.title = 'Move earlier';
		if (i === 0) left.disabled = true;
		left.addEventListener('click', () => {
			if (i === 0) return;
			[m.fields[i - 1], m.fields[i]] = [m.fields[i], m.fields[i - 1]];
			this.renderSettings();
		});
		const name = this.mk('span', null, label);
		const right = this.mk('button', null, '\u203a');
		right.title = 'Move later';
		if (i >= m.fields.length - 1) right.disabled = true;
		right.addEventListener('click', () => {
			if (i >= m.fields.length - 1) return;
			[m.fields[i + 1], m.fields[i]] = [m.fields[i], m.fields[i + 1]];
			this.renderSettings();
		});
		const x = this.mk('button', null, '\u2715');
		x.title = 'Remove from title';
		x.addEventListener('click', () => {
			m.fields = m.fields.filter((f) => f !== label);
			this.renderSettings();
		});
		chip.append(left, name, right, x);

		// drag reorder
		chip.addEventListener('dragstart', (e) => {
			this.dragIdx = i;
			chip.classList.add('st-dragging');
			e.dataTransfer.effectAllowed = 'move';
		});
		chip.addEventListener('dragend', () => {
			this.dragIdx = null;
			chip.classList.remove('st-dragging');
		});
		chip.addEventListener('dragover', (e) => {
			if (this.dragIdx == null || this.dragIdx === i) return;
			e.preventDefault();
			chip.classList.add('st-droptarget');
		});
		chip.addEventListener('dragleave', () => chip.classList.remove('st-droptarget'));
		chip.addEventListener('drop', (e) => {
			e.preventDefault();
			if (this.dragIdx == null || this.dragIdx === i) return;
			const [moved] = m.fields.splice(this.dragIdx, 1);
			m.fields.splice(i, 0, moved);
			this.dragIdx = null;
			this.renderSettings();
		});

		return chip;
	}

	/* --- portaled, flip-aware popover --- */

	openPopover(anchor, width, build) {
		this.closePopover();
		const pop = this.mk('div', 'st-popover');
		pop.style.width = width + 'px';
		build(pop);
		this.settingsEl.appendChild(pop);

		const r = anchor.getBoundingClientRect();
		const ph = pop.offsetHeight;
		const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
		const below = window.innerHeight - r.bottom;
		let top;
		if (below < ph + 12 && r.top > below) top = Math.max(8, r.top - ph - 6);
		else top = Math.min(r.bottom + 6, window.innerHeight - ph - 8);
		pop.style.left = left + 'px';
		pop.style.top = top + 'px';

		this.popEl = pop;
		this.popAnchor = anchor;
		anchor.classList.add('open');
		this.popOutsideHandler = (e) => {
			if (pop.contains(e.target) || anchor.contains(e.target)) return;
			this.closePopover();
		};
		this.popScrollHandler = (e) => {
			if (e && e.target && pop.contains(e.target)) return;
			this.closePopover();
		};
		setTimeout(() => {
			document.addEventListener('mousedown', this.popOutsideHandler, true);
			document.addEventListener('scroll', this.popScrollHandler, true);
			window.addEventListener('resize', this.popScrollHandler);
		}, 0);
		const inp = pop.querySelector('input');
		if (inp) inp.focus();
	}

	closePopover() {
		if (!this.popEl) return;
		this.popEl.remove();
		this.popEl = null;
		if (this.popAnchor) { this.popAnchor.classList.remove('open'); this.popAnchor = null; }
		if (this.popOutsideHandler) { document.removeEventListener('mousedown', this.popOutsideHandler, true); this.popOutsideHandler = null; }
		if (this.popScrollHandler) {
			document.removeEventListener('scroll', this.popScrollHandler, true);
			window.removeEventListener('resize', this.popScrollHandler);
			this.popScrollHandler = null;
		}
	}

	openPropertyPicker(anchor, m, available) {
		this.openPopover(anchor, 290, (pop) => {
			const search = this.mk('div', 'st-search');
			search.appendChild(this.searchIcon());
			const input = document.createElement('input');
			input.type = 'text';
			input.placeholder = 'Search properties\u2026';
			search.appendChild(input);
			pop.appendChild(search);

			const list = this.mk('div', 'st-pop-list');
			pop.appendChild(list);
			const foot = this.mk('div', 'st-pop-foot');
			pop.appendChild(foot);

			const pool = () => available.filter((f) => !m.fields.includes(f.label));
			const fill = () => {
				list.innerHTML = '';
				const q = input.value.trim().toLowerCase();
				const items = pool().filter((f) => !q || f.label.toLowerCase().includes(q) || f.type.includes(q));
				for (const f of items) {
					const item = this.mk('div', 'st-pop-item');
					item.appendChild(this.mk('span', 'plus', '+'));
					item.appendChild(this.mk('span', 'nm', f.label));
					item.appendChild(this.mk('span', 'tag', f.type));
					item.addEventListener('click', () => { m.fields.push(f.label); this.renderSettings(); });
					list.appendChild(item);
				}
				if (!items.length) list.appendChild(this.mk('div', 'st-empty', q ? 'No matches.' : 'All properties added.'));
				foot.textContent = pool().length + ' available \u00b7 click to add';
				return items;
			};
			let current = fill();
			input.addEventListener('input', () => { current = fill(); });
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && current.length) { m.fields.push(current[0].label); this.renderSettings(); }
			});
		});
	}

	openCollectionPicker(anchor) {
		this.openPopover(anchor, 264, (pop) => {
			const search = this.mk('div', 'st-search');
			search.appendChild(this.searchIcon());
			const input = document.createElement('input');
			input.type = 'text';
			input.placeholder = 'Search collections\u2026';
			search.appendChild(input);
			pop.appendChild(search);

			const list = this.mk('div', 'st-pop-list');
			pop.appendChild(list);

			const configured = () => new Set(this.model.map((x) => x.name));
			const pool = () => this.allCols.filter((c) => !configured().has(c.name) && c.fields.length);
			const fill = () => {
				list.innerHTML = '';
				const q = input.value.trim().toLowerCase();
				const items = pool().filter((c) => !q || c.name.toLowerCase().includes(q));
				for (const c of items) {
					const item = this.mk('div', 'st-pop-item');
					item.appendChild(this.mk('span', 'plus', '+'));
					item.appendChild(this.mk('span', 'nm', c.name));
					item.appendChild(this.mk('span', 'tag', c.fields.length + ' props'));
					item.addEventListener('click', () => {
						this.model.push({ name: c.name, fields: [], separator: DEFAULT_SEPARATOR });
						this.selName = c.name;
						this.renderSettings();
					});
					list.appendChild(item);
				}
				if (!items.length) list.appendChild(this.mk('div', 'st-empty', q ? 'No matches.' : 'All collections added.'));
				return items;
			};
			let current = fill();
			input.addEventListener('input', () => { current = fill(); });
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && current.length) {
					this.model.push({ name: current[0].name, fields: [], separator: DEFAULT_SEPARATOR });
					this.selName = current[0].name;
					this.renderSettings();
				}
			});
		});
	}

	async saveSettings(saveBtn) {
		saveBtn.disabled = true;
		saveBtn.textContent = 'Saving\u2026';
		try {
			const collections = {};
			for (const m of this.model) {
				collections[m.name] = { fields: m.fields, separator: m.separator };
			}
			const conf = this.getConfiguration() || {};
			conf.custom = conf.custom || {};
			conf.custom.collections = collections;

			const all = await this.data.getAllGlobalPlugins();
			const self = all.find((g) => g.guid === this.getGuid());
			if (!self) throw new Error('plugin handle not found');
			await self.saveConfiguration(conf);

			// apply immediately in this instance too (saveConfiguration may not reload)
			this.conf = collections;
			await this.rebuildCols();
			this.cache.clear();
			document.querySelectorAll('.texp-suffix').forEach((el) => el.remove());
			if (this.cols.size) { this.refresh(); this.startObserver(); }

			this.closeSettings();
			this.ui.addToaster({
				title: 'Smart Titles',
				message: 'Settings saved.',
				dismissible: true,
				autoDestroyTime: 2500,
			});
		} catch (e) {
			saveBtn.disabled = false;
			saveBtn.textContent = 'Save';
			this.ui.addToaster({
				title: 'Smart Titles',
				message: 'Could not save settings: ' + (e && e.message || e),
				dismissible: true,
			});
		}
	}
}
