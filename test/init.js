const fs = require('fs');
const path = require('path');

// Very minimal but enough to get existing tests working
globalThis.Zotero = {
    locale: 'en-US',
    debug: (s) => console.log(s),
    isNode: true
};

Zotero.Schema = require('../schema');
Zotero.Utilities = require('../utilities');
Zotero.Utilities.Item = require('../utilities_item');
Zotero.Date = require('../date');

let utilsResourceDir = process.env.UTILITIES_RESOURCE_DIR || 'resource';
Zotero.Schema.init(fs.readFileSync(path.join(utilsResourceDir, 'schema.json')).toString("utf-8"));
Zotero.Date.init(fs.readFileSync(path.join(utilsResourceDir, 'dateFormats.json')).toString("utf-8"));

let CachedTypes = require('../cachedTypes')
CachedTypes.setTypeSchema(require('../resource/zoteroTypeSchemaData'));
Object.assign(Zotero, CachedTypes);

let collator = new Intl.Collator(['en-US'], {
    numeric: true,
    sensitivity: 'base'
});
Zotero.localeCompare = (a, b) => collator.compare(a, b);

globalThis.assert = require('chai').assert;

let testDataDir = process.env.TEST_DATA_DIR || path.join('test', 'data');
globalThis.loadSampleData = function (name) {
    return JSON.parse(fs.readFileSync(path.join(testDataDir, name + '.js')).toString('utf-8'));
}

/**
 * Create a dummy item object with the item type set and array fields
 * initialized to empty arrays.
 *
 * @param {String} [itemType]
 * @returns {Object}
 */
globalThis.newItem = function (itemType) {
    return {
        itemType,
        attachments: [],
        creators: [],
        tags: [],
        seeAlso: [],
    }
}
