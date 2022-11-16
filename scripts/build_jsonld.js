let path = require('path');
let browserify = require('browserify');
let fs = require('fs');

let b = browserify(path.join(__dirname, '..', 'node_modules', 'jsonld', 'lib', 'jsonld.js'), {
	insertGlobalVars: {
		self: () => 'globalThis'
	},
	builtins: ['timers', '_process'],
	standalone: 'JSONLD'
});
let outputPath = path.join(__dirname, '..', 'jsonld.js');
b.bundle().pipe(fs.createWriteStream(outputPath));
console.log(`Wrote browserified jsonld.js to ${outputPath}`);
