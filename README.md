# Zotero Utilities

Zotero utility code common across various codebases such as the Zotero client,
Zotero translation architecture and others.

`Zotero.Utilities.Item.itemFromCSLJSON` requires loading the Zotero `schema.json`.
You will need to call `Zotero.Schema.init(data)` with the `schema.json` for it to work.
Please bundle the [Zotero schema](https://github.com/zotero/zotero-schema) file with your repository, do not load it remotely.