'use babel';

import {
	CompositeDisposable,
	BufferedNodeProcess,
	Panel,
	TextEditor
} from 'atom';

var IntegrityGen = require('./integrity-gen');

export default {

	subscriptions: null,
	tooltipDisposable: null,
	statusbarPanelItem: document.createElement('div'),
	statusbarPanel: null,
	allowedSourcesRegex: /^.*?\.(?:css|js)$/,
	statusBar: null,

	config: {
		cypher: {
			type: 'string',
			default: 'sha256',
			enum: ['sha256', 'sha512']
		}
	},

	activate(state) {
		this.subscriptions = new CompositeDisposable();

		this.subscriptions.add(
			atom.workspace.observeTextEditors(this.onObserveTextEditor.bind(this))
		);
		this.subscriptions.add(
			atom.workspace.observeActivePaneItem(this.onObserveActivePaneItem.bind(this))
		);
		this.subscriptions.add(
			atom.commands.add('atom-workspace', {
				'atom-integrity:editor-hash-copy': () => this.hashCurrentFileToClipboard()
			})
		);
		this.subscriptions.add(
			atom.commands.add('.tree-view .file > .name', {
				'atom-integrity:file-hash-copy': () => this.hashSelectedFileToClipboard()
			})
		);
	},

	consumeStatusBar(statusBar) {
		this.statusBar = statusBar;

		this.statusbarPanel = statusBar.addLeftTile({
			item: this.statusbarPanelItem,
			priority: 100
		});

		this.statusbarPanelItem.addEventListener('click', this.onStatusPanelItemClick.bind(this));

		this.registerTooltip();
	},

	registerTooltip() {
		this.subscriptions.add(
			atom.tooltips.add(
				this.statusbarPanelItem, {
					title: 'Click to copy subresource integrity value to clipboard',
					delay: 0
				}
			)
		);
	},

	deactivate() {
		this.subscriptions.dispose();
		this.statusbarPanel.dispose();
	},

	serialize() {
		return {
			atomIntegrityViewState: {}
		};
	},

	generateIntegrityString(path, callback) {
		if (path) {
			const proc = new BufferedNodeProcess({
				command: __dirname + '/integrity-gen.js',
				args: [path, atom.config.get('atom-integrity.cypher')],
				stdout: callback,
				stderr: callback
			});
		}
	},

	pathMatchesAllowedFiles(path) {
		return this.allowedSourcesRegex.test(path);
	},

	processFile(path, callback) {
		if (this.pathMatchesAllowedFiles(path)) {
			this.generateIntegrityString(path, callback);
		} else {
			this.clearIntegrityPanel();
		}
	},

	hashCurrentFileToClipboard() {
		const editor = atom.workspace.getActiveTextEditor();

		if (editor) {
			const path = editor.getPath();

			if (path) {
				this.processFile(path, (hash) => {
					atom.clipboard.write(hash);
				});
			}
		}
	},

	hashSelectedFileToClipboard(target) {
		const path = target.dataset.path;

		if (path) {
			this.processFile(path, (hash) => {
				atom.clipboard.write(hash);
			});
		}
	},

	onStatusPanelItemClick(e) {
		const hash = e.currentTarget.dataset.hash;

		if (hash) {
			atom.clipboard.write(hash);
		}
	},

	onObserveTextEditor(editor) {
		const callback = this.displayHash.bind(this);

		editor.onDidSave(() => {
			this.onSaveTextEditor(editor);
		});
		editor.onDidDestroy(() => {
			this.onDestroyedTextEditor(editor);
		});

		this.processFile(editor.getPath(), callback);
	},

	onSaveTextEditor(editor) {
		this.processFile(editor.getPath(), this.displayHash.bind(this));
	},

	onDestroyedTextEditor(editor) {
		if (this.pathMatchesAllowedFiles(editor.getPath())) {
			this.clearIntegrityPanel(editor);
		}
	},

	onObserveActivePaneItem(item) {
		if (item instanceof TextEditor) {
			this.processFile(item.getPath(), this.displayHash.bind(this));
		}
	},

	displayHash(hash) {
		this.statusbarPanelItem.classList.add('atom-integrity', 'badge', 'badge-small');
		this.statusbarPanelItem.innerHTML = `<span class="icon icon-check"></span><span class="cypher">Subresource integrity: ${atom.config.get('atom-integrity.cypher')}</span>`;
		this.statusbarPanelItem.dataset.hash = hash;
	},

	clearIntegrityPanel(editor) {
		this.statusbarPanelItem.className = '';
		this.statusbarPanelItem.innerHTML = '';
	}

};
