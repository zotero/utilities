/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2011 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org
    
    This file is part of Zotero.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

/**
 * Emulates very small parts of cachedTypes.js and itemFields.js APIs for use with connector
 */

import Utilities from "./utilities.js";

let TypeSchema;
if (typeof ZOTERO_TYPE_SCHEMA != 'undefined') {
	TypeSchema = ZOTERO_TYPE_SCHEMA;
}

const CachedTypes = new function() {
	const schemaTypes = ["itemTypes", "creatorTypes", "fields"];
	let typeData = {};
	let itemTypes, creatorTypes, fields;

	this.setTypeSchema = function(typeSchema) {
		TypeSchema = typeSchema;
		typeData = {};

		// attach IDs and make referenceable by either ID or name
		for (let i = 0; i < schemaTypes.length; i++) {
			let schemaType = schemaTypes[i];
			typeData[schemaType] = Utilities.deepCopy(TypeSchema[schemaType]);
			for (let id in TypeSchema[schemaType]) {
				let entry = typeData[schemaType][id];
				entry.unshift(parseInt(id, 10));
				typeData[schemaType][entry[1]/* name */] = entry;
			}
		}

		itemTypes = typeData.itemTypes;
		creatorTypes = typeData.creatorTypes;
		fields = typeData.fields;
	};
	
	if (TypeSchema) {
		this.setTypeSchema(TypeSchema);
	}

	class Types {
		constructor(schemeType) {
			this.schemeType = schemeType;
		}

		get type() {
			return typeData[this.schemeType];
		}

		getID(idOrName) {
			const type = this.type[idOrName];
			return (type ? type[0]/* id */ : false);
		}

		getName(idOrName) {
			const type = this.type[idOrName];
			return (type ? type[1]/* name */ : false);
		}

		getLocalizedString(idOrName) {
			const type = this.type[idOrName];
			return (type ? type[2]/* localizedString */ : false);
		}
	}

	this.ItemTypes = new (class extends Types {
		constructor() {
			super("itemTypes");
		}
	})();

	this.CreatorTypes = new (class extends Types {
		constructor() {
			super("creatorTypes");
		}
		
		getTypesForItemType(idOrName) {
			const itemType = itemTypes[idOrName];
			if(!itemType) return false;
			
			const itemCreatorTypes = itemType[3]; // creatorTypes
			if (!itemCreatorTypes
					// TEMP: 'note' and 'attachment' have an array containing false
					|| (itemCreatorTypes.length == 1 && !itemCreatorTypes[0])) {
				return [];
			}
			const n = itemCreatorTypes.length;
			const outputTypes = new Array(n);
			
			for(let i=0; i<n; i++) {
				const creatorType = creatorTypes[itemCreatorTypes[i]];
				outputTypes[i] = {"id":creatorType[0]/* id */,
					"name":creatorType[1]/* name */};
			}
			return outputTypes;
		};
		
		getPrimaryIDForType(idOrName) {
			const itemType = itemTypes[idOrName];
			if(!itemType) return false;
			return itemType[3]/* creatorTypes */[0];
		};
		
		isValidForItemType(creatorTypeID, itemTypeID) {
			const itemType = itemTypes[itemTypeID];
			return itemType[3]/* creatorTypes */.includes(creatorTypeID);
		};
	})();
	
	this.ItemFields = new (class extends Types {
		constructor() {
			super("fields");
		}
		
		isValidForType(fieldIdOrName, typeIdOrName) {
			const field = fields[fieldIdOrName], itemType = itemTypes[typeIdOrName];
			
			// mimics itemFields.js
			if(!field || !itemType) return false;
			
				   /* fields */        /* id */
			return itemType[4].indexOf(field[0]) !== -1;
		};
		
		isBaseField(fieldID) {
			return fields[fieldID][2];
		};
		
		getFieldIDFromTypeAndBase(typeIdOrName, fieldIdOrName) {
			let baseField = fields[fieldIdOrName], itemType = itemTypes[typeIdOrName];
			
			if(!baseField || !itemType) return false;
			
			// get as ID
			baseField = baseField[0]/* id */;
			
			// loop through base fields for item type
			const baseFields = itemType[5];
			for(let i in baseFields) {
				if(baseFields[i] === baseField) {
					return i;
				}
			}
			
			return false;
		};
		
		getBaseIDFromTypeAndField(typeIdOrName, fieldIdOrName) {
			const field = fields[fieldIdOrName], itemType = itemTypes[typeIdOrName];
			if(!field || !itemType) {
				throw new Error("Invalid field or type ID");
			}
			
			const baseField = itemType[5]/* baseFields */[field[0]/* id */];
			return baseField ? baseField : false;
		};
		
		getItemTypeFields(typeIdOrName) {
			return itemTypes[typeIdOrName][4]/* fields */.slice();
		};
	})();
}();

export { CachedTypes };
export default CachedTypes;
