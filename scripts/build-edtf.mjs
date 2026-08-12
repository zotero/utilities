import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { buildSync } from 'esbuild';

let root = fileURLToPath(new URL('..', import.meta.url));

let { version } = JSON.parse(
	readFileSync(root + 'node_modules/edtf/package.json', 'utf8')
);

buildSync({
	entryPoints: [root + 'node_modules/edtf/index.js'],
	outfile: root + 'edtf.js',
	bundle: true,
	format: 'iife',
	globalName: 'EDTF',
	// The connector loads the bundle without transpiling it, so target its
	// minimum supported browsers
	target: ['firefox115', 'safari16.6'],
	banner: {
		js: `/*
	edtf.js ${version} -- EDTF / ISO 8601-2 parser
	https://github.com/inukshuk/edtf.js
	License: BSD-2-Clause

	Generated single-file bundle (includes nearley and randexp) -- do not edit directly.
	To regenerate: npm run build-edtf
*/`
	},
	footer: {
		js: `if (typeof module != 'undefined') {
	module.exports = EDTF;
}`
	}
});
