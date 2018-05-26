'use babel';

import AtomIntegrity from '../lib/atom-integrity';

const testFilePath = __dirname + '/testfile.js';
const testHash256 = 'sha256-S7qN42nuB0oR0xwQMlje3fl1VLkoKLGVUN1ZmsEFt/U';
const testHash512 = 'sha512-uySecrA0ELBwC2urESX4FQnKLfpGA/bLBLq9IiwitWfmuMjj6R14DPlWNTn0l4bgYtzjPk6JMceMiZIJhOswJA';

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.
//
// To run a specific `it` or `describe` block add an `f` to the front (e.g. `fit`
// or `fdescribe`). Remove the `f` to unfocus the block.

describe('AtomIntegrity', () => {
	let workspaceElement;

	beforeEach(() => {
		workspaceElement = atom.views.getView(atom.workspace);
	});

	describe('Activation', () => {
		it('registers text editor observer and active pane observer', () => {
			spyOn(atom.workspace, 'observeTextEditors');
			spyOn(atom.workspace, 'observeActivePaneItem');

			AtomIntegrity.activate();

			runs(() => {
				expect(atom.workspace.observeTextEditors).toHaveBeenCalled();
				expect(atom.workspace.observeActivePaneItem).toHaveBeenCalled();
			});
		});
	});

	describe('Status Bar', () => {

		it('adds status bar panel', () => {
			AtomIntegrity.activate();
			runs(() => {
				AtomIntegrity.consumeStatusBar({
					addLeftTile(obj) {
						expect(obj.item).toEqual(AtomIntegrity.statusbarPanelItem);
					}
				});
			});

		});

		it('sets hash value on click', () => {
			const evt = {
				currentTarget: {
					dataset: {
						hash: 'foobar'
					}
				}
			};

			AtomIntegrity.activate();

			runs(() => {
				AtomIntegrity.onStatusPanelItemClick(evt);
				expect(atom.clipboard.read()).toEqual('foobar');
			});
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

			expect(AtomIntegrity.statusbarPanelItem.classList.add).toHaveBeenCalledWith('atom-integrity', 'badge', 'badge-info', 'badge-small');
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

			runs(() => {

				spyOn(atom.tooltips, 'add');
				spyOn(AtomIntegrity.subscriptions, 'add');

				AtomIntegrity.registerTooltip();

				expect(atom.tooltips.add).toHaveBeenCalled();
				expect(AtomIntegrity.subscriptions.add).toHaveBeenCalled();
			});

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
			expect(AtomIntegrity.generateIntegrityString.calls.length).toEqual(0);
		});

		it('does not call panel clear method when valid path is passed', () => {
			const path = '/foo/bar/baz.js';

			spyOn(AtomIntegrity, 'clearIntegrityPanel');
			spyOn(AtomIntegrity, 'generateIntegrityString');

			AtomIntegrity.processFile(path);

			expect(AtomIntegrity.clearIntegrityPanel.calls.length).toEqual(0);
			expect(AtomIntegrity.generateIntegrityString).toHaveBeenCalled();
		});
	});

	describe('Hash Generation', () => {
		it('hashes using sha256', () => {
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

		it('hashes using sha512', () => {
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
	});
});
