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
}

/* --- settings dialog --- */
.texp-backdrop {
	position: fixed; inset: 0; z-index: 10000;
	background: rgba(0, 0, 0, 0.55);
	display: flex; align-items: flex-start; justify-content: center;
}
.texp-dialog {
	margin-top: 8vh; width: 560px; max-width: 92vw; max-height: 80vh;
	overflow-y: auto;
	background: #1f2023; color: #d7d8db;
	border: 1px solid #3a3b40; border-radius: 8px;
	box-shadow: 0 18px 50px rgba(0,0,0,.5);
	padding: 20px 22px;
	font-size: 14px;
}
.texp-dialog h2 { margin: 0 0 4px; font-size: 17px; color: #fff; }
.texp-dialog .texp-hint { color: #8b8d94; font-size: 12.5px; margin: 0 0 14px; }
.texp-card {
	border: 1px solid #36373c; border-radius: 6px;
	padding: 12px 14px; margin-bottom: 12px; background: #232428;
}
.texp-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.texp-card-head .texp-col-name { font-weight: 600; color: #fff; flex: 1; }
.texp-section-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #8b8d94; margin: 10px 0 6px; }
.texp-pills { display: flex; flex-wrap: wrap; gap: 6px; min-height: 26px; }
.texp-pill {
	display: inline-flex; align-items: center; gap: 5px;
	border-radius: 12px; padding: 2px 10px; font-size: 12.5px;
	background: #2e3035; border: 1px solid #43454b; color: #d7d8db;
	cursor: pointer; user-select: none;
}
.texp-pill:hover { border-color: #6b6e76; }
.texp-pill.texp-chosen { background: #2c3b3a; border-color: #3f5d5a; }
.texp-pill .texp-type { color: #8b8d94; font-size: 11px; }
.texp-pill button {
	all: unset; cursor: pointer; color: #9a9da5; font-size: 11px; line-height: 1; padding: 1px 2px;
}
.texp-pill button:hover { color: #fff; }
.texp-sep-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.texp-sep-row label { font-size: 12.5px; color: #8b8d94; }
.texp-sep-input {
	width: 70px; background: #1a1b1e; color: #fff;
	border: 1px solid #43454b; border-radius: 4px; padding: 3px 8px; font-size: 13px;
	font-family: monospace;
}
.texp-preview { margin-top: 10px; font-size: 13px; color: #8b8d94; }
.texp-preview .texp-suffix { pointer-events: auto; }
.texp-add-row { margin: 4px 0 14px; }
.texp-select {
	background: #1a1b1e; color: #d7d8db; border: 1px solid #43454b;
	border-radius: 4px; padding: 5px 8px; font-size: 13px; max-width: 100%;
}
.texp-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.texp-btn {
	all: unset; cursor: pointer; border-radius: 5px; padding: 6px 14px; font-size: 13px;
	border: 1px solid #43454b; color: #d7d8db;
}
.texp-btn:hover { border-color: #6b6e76; color: #fff; }
.texp-btn-primary { background: #2f6b62; border-color: #2f6b62; color: #fff; }
.texp-btn-primary:hover { background: #387d72; border-color: #387d72; }
.texp-icon-btn { all: unset; cursor: pointer; color: #8b8d94; padding: 2px 6px; font-size: 14px; }
.texp-icon-btn:hover { color: #fff; }
.texp-empty { color: #8b8d94; font-style: italic; font-size: 13px; }
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
	model = null;       // settings dialog working copy
	allCols = null;     // [{name, fields:[{label,type}]}] for the dialog

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
		if (this.settingsEl) this.settingsEl.remove();
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
		if (this.settingsEl) { this.settingsEl.remove(); this.settingsEl = null; }

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

		const backdrop = document.createElement('div');
		backdrop.className = 'texp-backdrop';
		backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) this.closeSettings(); });
		const dialog = document.createElement('div');
		dialog.className = 'texp-dialog';
		backdrop.appendChild(dialog);
		document.body.appendChild(backdrop);
		this.settingsEl = backdrop;
		this.settingsKeyHandler = (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.closeSettings(); } };
		document.addEventListener('keydown', this.settingsKeyHandler, true);

		this.renderSettings(dialog);
	}

	closeSettings() {
		if (this.settingsEl) { this.settingsEl.remove(); this.settingsEl = null; }
		if (this.settingsKeyHandler) { document.removeEventListener('keydown', this.settingsKeyHandler, true); this.settingsKeyHandler = null; }
	}

	renderSettings(dialog) {
		dialog.innerHTML = '';

		const h2 = document.createElement('h2');
		h2.textContent = 'Smart Titles';
		const hint = document.createElement('p');
		hint.className = 'texp-hint';
		hint.textContent = 'Show property values after page names in references, search results and the quick switcher. Pick a collection, then click its properties to add them to the title.';
		dialog.append(h2, hint);

		for (const m of this.model) {
			dialog.appendChild(this.renderCollectionCard(dialog, m));
		}

		if (!this.model.length) {
			const empty = document.createElement('p');
			empty.className = 'texp-empty';
			empty.textContent = 'No collections configured yet. Add one below.';
			dialog.appendChild(empty);
		}

		// add-collection row
		const addRow = document.createElement('div');
		addRow.className = 'texp-add-row';
		const select = document.createElement('select');
		select.className = 'texp-select';
		const placeholder = document.createElement('option');
		placeholder.value = '';
		placeholder.textContent = '+ Add collection…';
		select.appendChild(placeholder);
		const configured = new Set(this.model.map((m) => m.name));
		for (const c of this.allCols) {
			if (configured.has(c.name) || !c.fields.length) continue;
			const opt = document.createElement('option');
			opt.value = c.name;
			opt.textContent = c.name;
			select.appendChild(opt);
		}
		select.addEventListener('change', () => {
			if (!select.value) return;
			this.model.push({ name: select.value, fields: [], separator: DEFAULT_SEPARATOR });
			this.renderSettings(dialog);
		});
		addRow.appendChild(select);
		dialog.appendChild(addRow);

		// footer
		const footer = document.createElement('div');
		footer.className = 'texp-footer';
		const cancel = document.createElement('button');
		cancel.className = 'texp-btn';
		cancel.textContent = 'Cancel';
		cancel.addEventListener('click', () => this.closeSettings());
		const save = document.createElement('button');
		save.className = 'texp-btn texp-btn-primary';
		save.textContent = 'Save';
		save.addEventListener('click', () => this.saveSettings(save));
		footer.append(cancel, save);
		dialog.appendChild(footer);
	}

	renderCollectionCard(dialog, m) {
		const colInfo = this.allCols.find((c) => c.name === m.name);
		const available = colInfo ? colInfo.fields : [];
		const typeOf = (label) => { const f = available.find((x) => x.label === label); return f ? f.type : null; };

		const card = document.createElement('div');
		card.className = 'texp-card';

		const head = document.createElement('div');
		head.className = 'texp-card-head';
		const name = document.createElement('span');
		name.className = 'texp-col-name';
		name.textContent = m.name;
		const remove = document.createElement('button');
		remove.className = 'texp-icon-btn';
		remove.title = 'Remove this collection from Smart Titles';
		remove.textContent = '✕';
		remove.addEventListener('click', () => {
			this.model = this.model.filter((x) => x !== m);
			this.renderSettings(dialog);
		});
		head.append(name, remove);
		card.appendChild(head);

		// chosen fields, in order
		const chosenLabel = document.createElement('div');
		chosenLabel.className = 'texp-section-label';
		chosenLabel.textContent = 'In title (in order)';
		card.appendChild(chosenLabel);
		const chosen = document.createElement('div');
		chosen.className = 'texp-pills';
		if (!m.fields.length) {
			const none = document.createElement('span');
			none.className = 'texp-empty';
			none.textContent = 'Nothing yet — click a property below to add it.';
			chosen.appendChild(none);
		}
		m.fields.forEach((label, i) => {
			const pill = document.createElement('span');
			pill.className = 'texp-pill texp-chosen';
			const left = document.createElement('button');
			left.textContent = '‹';
			left.title = 'Move earlier';
			left.disabled = i === 0;
			left.addEventListener('click', () => {
				if (i === 0) return;
				[m.fields[i - 1], m.fields[i]] = [m.fields[i], m.fields[i - 1]];
				this.renderSettings(dialog);
			});
			const right = document.createElement('button');
			right.textContent = '›';
			right.title = 'Move later';
			right.addEventListener('click', () => {
				if (i >= m.fields.length - 1) return;
				[m.fields[i + 1], m.fields[i]] = [m.fields[i], m.fields[i + 1]];
				this.renderSettings(dialog);
			});
			const text = document.createElement('span');
			text.textContent = label;
			const x = document.createElement('button');
			x.textContent = '✕';
			x.title = 'Remove from title';
			x.addEventListener('click', () => {
				m.fields = m.fields.filter((f) => f !== label);
				this.renderSettings(dialog);
			});
			pill.append(left, text, right, x);
			chosen.appendChild(pill);
		});
		card.appendChild(chosen);

		// available fields
		const availLabel = document.createElement('div');
		availLabel.className = 'texp-section-label';
		availLabel.textContent = 'Available properties (click to add)';
		card.appendChild(availLabel);
		const avail = document.createElement('div');
		avail.className = 'texp-pills';
		const unused = available.filter((f) => !m.fields.includes(f.label));
		if (!unused.length) {
			const none = document.createElement('span');
			none.className = 'texp-empty';
			none.textContent = available.length ? 'All properties added.' : 'This collection has no usable properties.';
			avail.appendChild(none);
		}
		for (const f of unused) {
			const pill = document.createElement('span');
			pill.className = 'texp-pill';
			pill.title = 'Add to title';
			const text = document.createElement('span');
			text.textContent = f.label;
			const type = document.createElement('span');
			type.className = 'texp-type';
			type.textContent = f.type;
			pill.append(text, type);
			pill.addEventListener('click', () => {
				m.fields.push(f.label);
				this.renderSettings(dialog);
			});
			avail.appendChild(pill);
		}
		card.appendChild(avail);

		// separator
		const sepRow = document.createElement('div');
		sepRow.className = 'texp-sep-row';
		const sepLabel = document.createElement('label');
		sepLabel.textContent = 'Separator';
		const sepInput = document.createElement('input');
		sepInput.className = 'texp-sep-input';
		sepInput.value = m.separator;
		sepInput.addEventListener('input', () => {
			m.separator = sepInput.value;
			preview.replaceChildren(this.buildPreview(m));
		});
		sepRow.append(sepLabel, sepInput);
		card.appendChild(sepRow);

		// live preview
		const preview = document.createElement('div');
		preview.className = 'texp-preview';
		preview.appendChild(this.buildPreview(m));
		card.appendChild(preview);

		return card;
	}

	buildPreview(m) {
		const frag = document.createDocumentFragment();
		const name = document.createElement('span');
		name.textContent = 'Preview:  Page name';
		frag.appendChild(name);
		if (m.fields.length) {
			const suffix = document.createElement('span');
			suffix.className = 'texp-suffix';
			suffix.textContent = m.separator + m.fields.join(m.separator);
			frag.appendChild(suffix);
		}
		return frag;
	}

	async saveSettings(saveBtn) {
		saveBtn.disabled = true;
		saveBtn.textContent = 'Saving…';
		try {
			const collections = {};
			for (const m of this.model) {
				if (!m.fields.length) continue; // skip empty configs
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
