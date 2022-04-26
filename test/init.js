const fs = require('fs');
const path = require('path');

globalThis.Zotero = {
    locale: 'en-US'
};

Zotero.Schema = require('../schema');
Zotero.Utilities = require('../utilities');
Zotero.Utilities.Item = require('../utilities_item');
Zotero.Date = require('../date');

let resourceDir = process.env.UTILITIES_RESOURCE_DIR || '.';
Zotero.Schema.init(fs.readFileSync(path.join(resourceDir, 'schema.json')).toString("utf-8"));
Zotero.Date.init(fs.readFileSync(path.join(resourceDir, 'dateFormats.json')).toString("utf-8"));

let CachedTypes = require('../cachedTypes')
CachedTypes.setTypeSchema(require('../resource/zoteroTypeSchemaData'))

let collator = new Intl.Collator(['en-US'], {
    numeric: true,
    sensitivity: 'base'
});
Zotero.localeCompare = (a, b) => collator.compare(a, b);
