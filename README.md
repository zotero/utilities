# Zotero Utilities

Zotero utility code common across various codebases such as the Zotero client,
Zotero translation architecture and others.

Item utility functions require:
- Loading the Zotero `schema.json`.
  You will need to call `Zotero.Schema.init(data)` with the `schema.json` for it to work.
- Loading `resource/zoteroTypeSchemaData.js` before `cachedTypes.js` or in Node.js running
  ```
    let CachedTypes = require('./cachedTypes')
    CachedTypes.setTypeSchema(require('./resource/zoteroTypeSchemaData'))
  ```

Please bundle the [Zotero schema](https://github.com/zotero/zotero-schema) file with your repository, do not load it remotely.