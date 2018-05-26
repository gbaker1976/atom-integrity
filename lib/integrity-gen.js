const crypto = require('crypto');
const fs = require('fs');
const hasher = (path, cypher, writeStream) => {
	if (!path || !cypher || !writeStream) {
		process.exit(0);
	}

	let hash = crypto.createHash(cypher);

	fs.readFile(path, {encoding: 'utf8'}, (err, str) => {
		if (err) process.exit(1);

		hash.update(str);

		writeStream.write( cypher + '-' + hash.digest('base64').replace(/\=/g, '') );
		process.exit(0);
	});
};

if (require.main === module) {
	const path = process.argv.length >= 3 && process.argv[2];
	const cypher = process.argv.length >= 4 && process.argv[3];
	hasher(path, cypher, process.stdout);
} else {
    module.exports = hasher;
}
