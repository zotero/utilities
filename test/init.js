import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import chai from "chai";

import Schema from "../schema.js";
import Utilities from "../utilities.js";
import Utilities_Item from "../utilities_item.js";
import DateUtil from "../date.js";
import CachedTypes from "../cachedTypes.js";
import { ZOTERO_TYPE_SCHEMA } from "../resource/zoteroTypeSchemaData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Very minimal but enough to get existing tests working
globalThis.Zotero = {
    locale: 'en-US',
    debug: (s) => console.log(s),
    isNode: true
};

Zotero.Schema = Schema;
Zotero.Utilities = Utilities;
Zotero.Utilities.Item = Utilities_Item;
Zotero.Date = DateUtil;

let schemaPath = process.env.UTILITIES_SCHEMA_PATH;
if (!schemaPath) {
    throw new Error('No UTILITIES_SCHEMA_PATH provided');
}

Zotero.Schema.init(
    fs.readFileSync(schemaPath).toString("utf-8")
);

Zotero.Date.init(
    fs.readFileSync(
        path.join(__dirname, '..', 'resource', 'dateFormats.json')
    ).toString("utf-8")
);

CachedTypes.setTypeSchema(ZOTERO_TYPE_SCHEMA);
Object.assign(Zotero, CachedTypes);

let collator = new Intl.Collator(['en-US'], {
    numeric: true,
    sensitivity: 'base'
});
Zotero.localeCompare = (a, b) => collator.compare(a, b);

globalThis.assert = chai.assert;

let testDataDir = path.join(__dirname, 'data');

globalThis.loadTestData = function (filename) {
    return fs.readFileSync(path.join(testDataDir, filename)).toString('utf-8');
}

globalThis.loadSampleData = function (name) {
    return JSON.parse(loadTestData(name + '.json'));
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
