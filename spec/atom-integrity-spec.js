'use babel';

import AtomIntegrity from '../lib/atom-integrity';

const testFilePath = __dirname + '/testfile.js';
const testHash256 = 'sha256-S7qN42nuB0oR0xwQMlje3fl1VLkoKLGVUN1ZmsEFt/U';
const testHash512 = 'sha512-uySecrA0ELBwC2urESX4FQnKLfpGA/bLBLq9IiwitWfmuMjj6R14DPlWNTn0l4bgYtzjPk6JMceMiZIJhOswJA';
const editorFake = {
	onDidSave() {},
	onDidDestroy() {},
	getPath() { return testFilePath }
};
const statusBarFake = {
	addLeftTile() {
		return {
			dispose() {}
		};
	}
};

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('AtomIntegrity', () => {
	let workspaceElement;

	beforeEach(() => {
		workspaceElement = atom.views.getView(atom.workspace);
	});

	describe('Activation and Deactivation', () => {
		it('registers text editor observer and active pane observer', () => {
			spyOn(atom.workspace, 'observeTextEditors').andCallThrough();
			spyOn(atom.workspace, 'observeActivePaneItem').andCallThrough();

			AtomIntegrity.activate();

			expect(atom.workspace.observeTextEditors).toHaveBeenCalled();
			expect(atom.workspace.observeActivePaneItem).toHaveBeenCalled();
		});

		it('cleans up after itself', () => {
			AtomIntegrity.activate();
			AtomIntegrity.consumeStatusBar(statusBarFake);

			spyOn(AtomIntegrity.subscriptions, 'dispose');
			spyOn(AtomIntegrity.statusbarPanel, 'dispose');

			AtomIntegrity.deactivate();

			expect(AtomIntegrity.subscriptions.dispose).toHaveBeenCalled();
			expect(AtomIntegrity.statusbarPanel.dispose).toHaveBeenCalled();
		});
	});

	describe('Wiring to TextEditor Events/Hooks in onObserveTextEditor', () => {
		it('wires up to onDidSave', () => {
			spyOn(editorFake, 'onDidSave');

			AtomIntegrity.activate();
			AtomIntegrity.onObserveTextEditor(editorFake);

			expect(editorFake.onDidSave).toHaveBeenCalled();
		});

		it('wires up to onDidDestroy', () => {
			spyOn(editorFake, 'onDidDestroy');

			AtomIntegrity.activate();
			AtomIntegrity.onObserveTextEditor(editorFake);

			expect(editorFake.onDidDestroy).toHaveBeenCalled();
		});

		it('calls processFile', () => {
			spyOn(AtomIntegrity, 'processFile');

			AtomIntegrity.activate();
			AtomIntegrity.onObserveTextEditor(editorFake);

			expect(AtomIntegrity.processFile).toHaveBeenCalled();
		});

		it('calls processFile for path provided by observed editor', () => {
			spyOn(AtomIntegrity, 'processFile');

			AtomIntegrity.activate();
			AtomIntegrity.onObserveTextEditor(editorFake);

			expect(AtomIntegrity.processFile.calls[0].args[0]).toEqual(testFilePath);
		});
	});

	describe('Status Bar', () => {

		it('adds status bar panel', () => {
			AtomIntegrity.activate();
			AtomIntegrity.consumeStatusBar({
				addLeftTile(obj) {
					expect(obj.item).toEqual(AtomIntegrity.statusbarPanelItem);
				}
			});

		});

		it('sets hash value from click handler call', () => {
			const evt = {
				currentTarget: {
					dataset: {
						hash: 'foobar'
					}
				}
			};

			AtomIntegrity.activate();

			AtomIntegrity.onStatusPanelItemClick(evt);
			expect(atom.clipboard.read()).toEqual('foobar');
		});

		it('adds status bar panel, registers click event, and registers tooltip', () => {
			spyOn(AtomIntegrity.statusbarPanelItem, 'addEventListener');
			spyOn(statusBarFake, 'addLeftTile');
			spyOn(AtomIntegrity, 'registerTooltip');

			AtomIntegrity.activate();
			AtomIntegrity.consumeStatusBar(statusBarFake);

			expect(AtomIntegrity.statusbarPanelItem.addEventListener.wasCalled).toEqual(true);
			expect(AtomIntegrity.registerTooltip.wasCalled).toEqual(true);
			expect(statusBarFake.addLeftTile.wasCalled).toEqual(true);
		});

		it('assigns hash to status bar panel item dataset', () => {
			AtomIntegrity.activate();
			AtomIntegrity.displayHash(testHash256);

			expect(AtomIntegrity.statusbarPanelItem.dataset.hash).toEqual(testHash256);
		});

		it('constructs status bar panel item', () => {
			atom.config.set('atom-integrity.cypher', 'sha256');

			AtomIntegrity.activate();

			spyOn(AtomIntegrity.statusbarPanelItem.classList, 'add');

			AtomIntegrity.displayHash(testHash256);

			expect(AtomIntegrity.statusbarPanelItem.classList.add).toHaveBeenCalledWith('atom-integrity', 'badge', 'badge-small');
			expect(
				AtomIntegrity.statusbarPanelItem
				.querySelector('.cypher')
				.firstChild.nodeValue
			).toEqual('Subresource integrity: sha256');
		});
	});

	describe('Tooltips', () => {

		it('registers tooltip', () => {
			AtomIntegrity.activate();

			spyOn(atom.tooltips, 'add');
			spyOn(AtomIntegrity.subscriptions, 'add');

			AtomIntegrity.registerTooltip();

			expect(atom.tooltips.add).toHaveBeenCalled();
			expect(AtomIntegrity.subscriptions.add).toHaveBeenCalled();
		});
	});

	describe('File Processing', () => {
		it('matches js and css files only', () => {
			expect(AtomIntegrity.pathMatchesAllowedFiles('/foo/bar/baz.css')).toBe(true);
			expect(AtomIntegrity.pathMatchesAllowedFiles('/foo/bar/baz.js')).toBe(true);
			expect(AtomIntegrity.pathMatchesAllowedFiles('/foo/bar/baz.html')).toBe(false);
			expect(AtomIntegrity.pathMatchesAllowedFiles('/foo/bar/baz.json')).toBe(false);
			expect(AtomIntegrity.pathMatchesAllowedFiles('/foo/bar/baz.axjs')).toBe(false);
			expect(AtomIntegrity.pathMatchesAllowedFiles('/foo/bar/baz.scss')).toBe(false);
			expect(AtomIntegrity.pathMatchesAllowedFiles('/foo/bar/baz.cssop')).toBe(false);
		});

		it('hashes current open file to clipboard', () => {
			const callback = () => {};

			spyOn(atom.workspace, 'getActiveTextEditor').andCallFake(() => {
				return editorFake;
			});
			spyOn(atom.clipboard, 'write');
			spyOn(AtomIntegrity, 'processFile').andCallFake((path, callback) => {
				callback(testHash256);
			});

			AtomIntegrity.hashCurrentFileToClipboard();

			expect(AtomIntegrity.processFile).toHaveBeenCalled();
			expect(atom.clipboard.write).toHaveBeenCalled();
		});

		it('hashes selected file to clipboard', () => {
			const targetFake = {
				dataset: { path: testFilePath }
			};

			spyOn(atom.clipboard, 'write');
			spyOn(AtomIntegrity, 'processFile').andCallFake((path, callback) => {
				callback(testHash256);
			});

			AtomIntegrity.hashSelectedFileToClipboard(targetFake);

			expect(AtomIntegrity.processFile).toHaveBeenCalled();
			expect(atom.clipboard.write).toHaveBeenCalled();
		});

		it('passes correct path to hash method', () => {
			const path = '/foo/bar/baz.js';
			const callback = () => {};

			spyOn(AtomIntegrity, 'generateIntegrityString');

			AtomIntegrity.processFile(path, callback);

			expect(AtomIntegrity.generateIntegrityString).toHaveBeenCalledWith(path, callback);
		});

		it('calls panel clear method when invalid path is passed', () => {
			const path = '/foo/bar/baz.html';

			spyOn(AtomIntegrity, 'clearIntegrityPanel');
			spyOn(AtomIntegrity, 'generateIntegrityString');

			AtomIntegrity.processFile(path);

			expect(AtomIntegrity.clearIntegrityPanel).toHaveBeenCalled();
			expect(AtomIntegrity.generateIntegrityString.wasCalled).toEqual(false);
		});

		it('does not call panel clear method when valid path is passed', () => {
			const path = '/foo/bar/baz.js';

			spyOn(AtomIntegrity, 'clearIntegrityPanel');
			spyOn(AtomIntegrity, 'generateIntegrityString');

			AtomIntegrity.processFile(path);

			expect(AtomIntegrity.clearIntegrityPanel.wasCalled).toEqual(false);
			expect(AtomIntegrity.generateIntegrityString).toHaveBeenCalled();
		});
	});

	describe('Hash Generation', () => {
		it('hashes using sha256 via processFile', () => {
			atom.config.set('atom-integrity.cypher', 'sha256');

			waitsForPromise(() => {
				return new Promise((resolve, reject) => {
					AtomIntegrity.processFile(testFilePath, (hash) => {
						expect(hash).toEqual(testHash256);
						resolve();
					});
				});
			});
		});

		it('hashes using sha512 via processFile', () => {
			atom.config.set('atom-integrity.cypher', 'sha512');

			waitsForPromise(() => {
				return new Promise((resolve, reject) => {
					AtomIntegrity.processFile(testFilePath, (hash) => {
						expect(hash).toEqual(testHash512);
						resolve();
					});
				});
			});
		});

		it('hashes using sha256 via generateIntegrityString', () => {
			atom.config.set('atom-integrity.cypher', 'sha256');

			waitsForPromise(() => {
				return new Promise((resolve, reject) => {
					AtomIntegrity.generateIntegrityString(testFilePath, (hash) => {
						expect(hash).toEqual(testHash256);
						resolve();
					});
				});
			});
		});

		it('hashes using sha512 via generateIntegrityString', () => {
			atom.config.set('atom-integrity.cypher', 'sha512');

			waitsForPromise(() => {
				return new Promise((resolve, reject) => {
					AtomIntegrity.generateIntegrityString(testFilePath, (hash) => {
						expect(hash).toEqual(testHash512);
						resolve();
					});
				});
			});
		});
	});
});
