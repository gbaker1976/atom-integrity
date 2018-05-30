# Atom Integrity
A simple subresource integrity hash generator for JavaScript and CSS files.

## Installation
Install via CLI:

`apm install atom-integrity`

Or install via Settings > Install by searching for **Atom Integrity**.

## Usage

### Open a JavaScript or CSS File
Just open a JavaScript or CSS file to generate a hash in either sha256 or sha512 (default is sha256).

A clickable panel will appear in the status bar. By clicking the panel, the hash is copied to your clipboard.

### Editor Pane Context Menu
In the editor pane of a supported file type, you can select the **Copy Current File's Hash to Clipboard** context menu option to copy the file's hash to your clipboard.

### Project Pane Context Menu
In the project pane, you can select the **Copy File Hash** context menu option to copy the selected file's hash to your clipboard.

## Settings
You may change the hash algorithm in package settings. The current options are sha256 and sha512.
