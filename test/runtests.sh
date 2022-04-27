#!/bin/bash

SCRIPT_DIR=$(dirname "$0")
PARENT_REPO_DIR=$(git rev-parse --show-superproject-working-tree)
export UTILITIES_RESOURCE_DIR="$SCRIPT_DIR/../resource"
export TEST_DATA_DIR="$SCRIPT_DIR/data"
if [ ! -f "$UTILITIES_RESOURCE_DIR/schema.json" ]; then
	if [ -f "$PARENT_REPO_DIR/resource/schema/global/schema.json" ]; then
		cp "$PARENT_REPO_DIR/resource/schema/global/schema.json" "$UTILITIES_RESOURCE_DIR/schema.json"
	else
		wget -O "$UTILITIES_RESOURCE_DIR/schema.json" -- https://api.zotero.org/schema
	fi
fi

mocha \
	--recursive \
	--file "$SCRIPT_DIR/init.js" \
	--grep "$1" \
	test/tests
