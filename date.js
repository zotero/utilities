/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2009 Center for History and New Media
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

(function() {

var Utilities_Date = new function(){
	this.isSQLDate = isSQLDate;
	this.isSQLDateTime = isSQLDateTime;
	this.sqlHasYear = sqlHasYear;
	this.sqlHasMonth = sqlHasMonth;
	this.sqlHasDay = sqlHasDay;
	this.getUnixTimestamp = getUnixTimestamp;
	this.toUnixTimestamp = toUnixTimestamp;
	this.getFileDateString = getFileDateString;
	this.getFileTimeString = getFileTimeString;
	this.getLocaleDateOrder = getLocaleDateOrder;

	var _localeDateOrder = null;
	var _months;
	var _monthsWithEnglish;

	/**
	 * Initializes localized months for strToDate month parsing
	 * @param dateFormatsJSON {Object} the JSON from resource/dateFormats.json
	 */
	this.init = function (dateFormatsJSON) {
		if ((Zotero.isFx || Zotero.isElectron) && !dateFormatsJSON) {
			dateFormatsJSON = Zotero.File.getResource('resource://zotero/schema/dateFormats.json');
		}
		if (!dateFormatsJSON) {
			throw new Error("Zotero.Date.init() must be called with dateFormats.json");
		}
		if (typeof dateFormatsJSON == 'string') {
			dateFormatsJSON = JSON.parse(dateFormatsJSON);
		}

		var locale = Zotero.locale;
		var english = locale.startsWith('en');
		// If no exact match, try first two characters ('de')
		if (!dateFormatsJSON[locale]) {
			locale = locale.substr(0, 2);
		}
		// Try first two characters repeated ('de-DE')
		if (!dateFormatsJSON[locale]) {
			locale = locale + "-" + locale.toUpperCase();
		}
		// Look for another locale with same first two characters
		if (!dateFormatsJSON[locale]) {
			let sameLang = Object.keys(dateFormatsJSON).filter(l => l.startsWith(locale.substr(0, 2)));
			if (sameLang.length) {
				locale = sameLang[0];
			}
		}
		// If all else fails, use English
		if (!dateFormatsJSON[locale]) {
			locale = 'en-US';
			english = true;
		}
		_months = dateFormatsJSON[locale];

		// Add English versions if not already added
		if (english) {
			_monthsWithEnglish = _months;
		}
		else {
			_monthsWithEnglish = {};
			for (let key in _months) {
				_monthsWithEnglish[key] = _months[key].concat(dateFormatsJSON['en-US'][key]);
			}
		}
		
		let months = _monthsWithEnglish.short.map(m => m.toLowerCase())
			.concat(_monthsWithEnglish.long.map(m => m.toLowerCase()));
		// TODO: Switch back to native RegExp in Fx102 when Unicode property escapes are supported
		_monthRe = Zotero.Utilities.XRegExp("(.*)(?:^|[^\\p{L}])(" + months.join("|") + ")[^ ]*(?: (.*)$|$)", "iu");
	};


	/**
	 * @param {Boolean} [withEnglish = false] - Include English months
	 * @return {Object} - Object with 'short' and 'long' arrays
	 */
	this.getMonths = function (withEnglish) {
		if (withEnglish) {
			if (_monthsWithEnglish) return _monthsWithEnglish;
		}
		else {
			if (_months) return _months;
		}

		throw new Error("Zotero.Date: Zotero.Date.init() not called with resource/dateFormats.json");
	}

	/**
	 * Convert an SQL date in the form '2006-06-13 11:03:05' into a JS Date object
	 *
	 * Can also accept just the date part (e.g. '2006-06-13')
	 **/
	this.sqlToDate = function (sqldate, isUTC) {
		try {
			if (!this.isSQLDate(sqldate)
				&& !this.isSQLDateTime(sqldate)
				&& !this.isSQLDateTimeWithoutSeconds(sqldate)) {
				throw new Error("Invalid date");
			}

			var datetime = sqldate.split(' ');
			var dateparts = datetime[0].split('-');
			if (datetime[1]){
				var timeparts = datetime[1].split(':');
			}
			else {
				timeparts = [false, false, false];
			}

			// Invalid date part
			if (dateparts.length==1){
				throw new Error("Invalid date part");
			}
			// Allow missing seconds
			if (timeparts.length == 2) {
				timeparts[2] = '00';
			}

			if (isUTC){
				return new Date(Date.UTC(dateparts[0], dateparts[1]-1, dateparts[2],
					timeparts[0], timeparts[1], timeparts[2]));
			}

			return new Date(dateparts[0], dateparts[1]-1, dateparts[2],
				timeparts[0], timeparts[1], timeparts[2]);
		}
		catch (e){
			Zotero.debug(sqldate + ' is not a valid SQL date', 2)
			return false;
		}
	}


	/**
	 * Convert a JS Date object to an SQL date in the form '2006-06-13 11:03:05'
	 *
	 * If _toUTC_ is true, creates a UTC date
	 **/
	this.dateToSQL = function (date, toUTC) {
		try {
			if (toUTC){
				var year = date.getUTCFullYear();
				var month = date.getUTCMonth();
				var day = date.getUTCDate();
				var hours = date.getUTCHours();
				var minutes = date.getUTCMinutes();
				var seconds = date.getUTCSeconds();
			}
			else {
				var year = date.getFullYear();
				var month = date.getMonth();
				var day = date.getDate();
				var hours = date.getHours();
				var minutes = date.getMinutes();
				var seconds = date.getSeconds();
			}

			year = Zotero.Utilities.lpad(year, '0', 4);
			month = Zotero.Utilities.lpad(month + 1, '0', 2);
			day = Zotero.Utilities.lpad(day, '0', 2);
			hours = Zotero.Utilities.lpad(hours, '0', 2);
			minutes = Zotero.Utilities.lpad(minutes, '0', 2);
			seconds = Zotero.Utilities.lpad(seconds, '0', 2);

			return year + '-' + month + '-' + day + ' '
				+ hours + ':' + minutes + ':' + seconds;
		}
		catch (e){
			Zotero.debug(date + ' is not a valid JS date', 2);
			return '';
		}
	}


	/**
	 * Convert a JS Date object to an ISO 8601 UTC date/time
	 *
	 * @param	{Date}		date		JS Date object
	 * @return	{String}				ISO 8601 UTC date/time
	 *									e.g. 2008-08-15T20:00:00Z
	 */
	this.dateToISO = function (date) {
		var year = date.getUTCFullYear();
		var month = date.getUTCMonth();
		var day = date.getUTCDate();
		var hours = date.getUTCHours();
		var minutes = date.getUTCMinutes();
		var seconds = date.getUTCSeconds();

		year = Zotero.Utilities.lpad(year, '0', 4);
		month = Zotero.Utilities.lpad(month + 1, '0', 2);
		day = Zotero.Utilities.lpad(day, '0', 2);
		hours = Zotero.Utilities.lpad(hours, '0', 2);
		minutes = Zotero.Utilities.lpad(minutes, '0', 2);
		seconds = Zotero.Utilities.lpad(seconds, '0', 2);

		return year + '-' + month + '-' + day + 'T'
			+ hours + ':' + minutes + ':' + seconds + 'Z';
	}


	var _re8601 = /^([0-9]{4})(-([0-9]{2})(-([0-9]{2})(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?$/;

	/**
	 * @return {Boolean} - True if string is an ISO 8601 date, false if not
	 */
	this.isISODate = function (str) {
		return _re8601.test(str);
	}

	/**
	 * Convert an ISO 8601–formatted date/time to a JS Date
	 *
	 * @param	{String}		isoDate		ISO 8601 date
	 * @return {Date|False} - JS Date, or false if not a valid date
	 */
	this.isoToDate = function (isoDate) {
		var d = isoDate.match(_re8601);
		if (!d) return false;
		return new Date(isoDate);
	}


	this.isoToSQL = function (isoDate) {
		return Utilities_Date.dateToSQL(Utilities_Date.isoToDate(isoDate), true); // no 'this' for translator sandbox
	}


	/*
	 * converts a string to an object containing:
	 *    day: integer form of the day
	 *    month: integer form of the month (indexed from 0, not 1)
	 *    year: 4 digit year (or, year + BC/AD/etc.)
	 *    part: anything that does not fall under any of the above categories
	 *          (e.g., "Summer," etc.)
	 *
	 * Note: the returned object is *not* a JS Date object
	 */
	var _slashRe = /^(.*?)\b([0-9]{1,4})(?:([\-\/\.\u5e74])([0-9]{1,2}))?(?:([\-\/\.\u6708])([0-9]{1,4}))?((?:\b|[^0-9]).*?)$/
	var _yearRe = /^(.*?)\b((?:circa |around |about |c\.? ?)?[0-9]{1,4}(?: ?B\.? ?C\.?(?: ?E\.?)?| ?C\.? ?E\.?| ?A\.? ?D\.?)|[0-9]{3,4})\b(.*?)$/i;
	var _monthRe = null;
	var _dayRe = null;

	this.strToDate = function (string) {
		var date = {
			order: ''
		};

		if (typeof string == 'string' || typeof string == 'number') {
			string = Zotero.Utilities.trimInternal(string.toString());
		}

		// skip empty things
		if(!string) {
			return date;
		}

		var parts = [];

		// first, directly inspect the string
		var m = _slashRe.exec(string);
		if(m &&
			((!m[5] || !m[3]) || m[3] == m[5] || (m[3] == "\u5e74" && m[5] == "\u6708")) &&	// require sane separators
			((m[2] && m[4] && m[6]) || (!m[1] && !m[7]))) {						// require that either all parts are found,
			// or else this is the entire date field
			// figure out date based on parts
			if(m[2].length == 3 || m[2].length == 4 || m[3] == "\u5e74") {
				// ISO 8601 style date (big endian)
				date.year = m[2];
				date.month = m[4];
				date.day = m[6];
				date.order += m[2] ? 'y' : '';
				date.order += m[4] ? 'm' : '';
				date.order += m[6] ? 'd' : '';
			} else if(m[2] && !m[4] && m[6]) {
				date.month = m[2];
				date.year = m[6];
				date.order += m[2] ? 'm' : '';
				date.order += m[6] ? 'y' : '';
			} else {
				// local style date (middle or little endian)
				var country = Zotero.locale ? Zotero.locale.substr(3) : "US";
				if(country == "US" ||	// The United States
					country == "FM" ||	// The Federated States of Micronesia
					country == "PW" ||	// Palau
					country == "PH") {	// The Philippines
					date.month = m[2];
					date.day = m[4];
					date.order += m[2] ? 'm' : '';
					date.order += m[4] ? 'd' : '';
				} else {
					date.month = m[4];
					date.day = m[2];
					date.order += m[2] ? 'd' : '';
					date.order += m[4] ? 'm' : '';
				}
				date.year = m[6];
				if (m[6] !== undefined) {
					date.order += 'y';
				}
			}

			var longYear = date.year && date.year.toString().length > 2;
			if(date.year) date.year = parseInt(date.year, 10);
			if(date.day) date.day = parseInt(date.day, 10);
			if(date.month) {
				date.month = parseInt(date.month, 10);

				if(date.month > 12) {
					// swap day and month
					var tmp = date.day;
					date.day = date.month
					date.month = tmp;
					date.order = date.order.replace('m', 'D')
						.replace('d', 'M')
						.replace('D', 'd')
						.replace('M', 'm');
				}
			}

			if((!date.month || date.month <= 12) && (!date.day || date.day <= 31)) {
				// Parse pre-100 years with leading zeroes (001, 0001, 012, 0012, 0123, but not 08)
				if (date.year && date.year < 100 && !longYear) {
					var today = new Date();
					var year = today.getFullYear();
					var twoDigitYear = year % 100;
					var century = year - twoDigitYear;

					if(date.year <= twoDigitYear) {
						// assume this date is from our century
						date.year = century + date.year;
					} else {
						// assume this date is from the previous century
						date.year = century - 100 + date.year;
					}
				}

				if(date.month) date.month--;		// subtract one for JS style
				else delete date.month;

				//Zotero.debug("DATE: retrieved with algorithms: "+JSON.stringify(date));

				parts.push(
					{ part: m[1], before: true },
					{ part: m[7] }
				);
			} else {
				// give up; we failed the sanity check
				Zotero.debug("DATE: algorithms failed sanity check");
				var date = {
					order: ''
				};
				parts.push({ part: string });
			}
		} else {
			//Zotero.debug("DATE: could not apply algorithms");
			parts.push({ part: string });
		}

		// couldn't find something with the algorithms; use regexp
		// YEAR
		if(!date.year) {
			for (var i in parts) {
				var m = _yearRe.exec(parts[i].part);
				if (m) {
					date.year = m[2];
					date.order = _insertDateOrderPart(date.order, 'y', parts[i]);
					parts.splice(
						i, 1,
						{ part: m[1], before: true },
						{ part: m[3] }
					);
					//Zotero.debug("DATE: got year (" + date.year + ", " + JSON.stringify(parts) + ")");
					break;
				}
			}
		}

		// MONTH
		if(date.month === undefined) {
			// compile month regular expression
			let months = Utilities_Date.getMonths(true); // no 'this' for translator sandbox
			months = months.short.map(m => m.toLowerCase())
				.concat(months.long.map(m => m.toLowerCase()));
			for (var i in parts) {
				var m = _monthRe.exec(parts[i].part);
				if (m) {
					// Modulo 12 in case we have multiple languages
					date.month = months.indexOf(m[2].toLowerCase()) % 12;
					date.order = _insertDateOrderPart(date.order, 'm', parts[i]);
					parts.splice(
						i, 1,
						{ part: m[1], before: "m" },
						{ part: m[3], after: "m" }
					);
					//Zotero.debug("DATE: got month (" + date.month + ", " + JSON.stringify(parts) + ")");
					break;
				}
			}
		}

		// DAY
		if(!date.day) {
			// compile day regular expression
			if(!_dayRe) {
				var daySuffixes = Zotero.isClient ? Zotero.getString("date.daySuffixes").replace(/, ?/g, "|") : "";
				_dayRe = new RegExp("\\b([0-9]{1,2})(?:"+daySuffixes+")?\\b(.*)", "i");
			}

			for (var i in parts) {
				var m = _dayRe.exec(parts[i].part);
				if (m) {
					var day = parseInt(m[1], 10);
					// Sanity check
					if (day <= 31) {
						date.day = day;
						date.order = _insertDateOrderPart(date.order, 'd', parts[i]);
						if(m.index > 0) {
							var part = parts[i].part.substr(0, m.index);
							if(m[2]) {
								part += " " + m[2];;
							}
						} else {
							var part = m[2];
						}
						parts.splice(
							i, 1,
							{ part: part }
						);
						//Zotero.debug("DATE: got day (" + date.day + ", " + JSON.stringify(parts) + ")");
						break;
					}
				}
			}
		}

		// Concatenate date parts
		date.part = '';
		for (var i in parts) {
			date.part += parts[i].part + ' ';
		}

		// clean up date part
		if(date.part) {
			date.part = date.part.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
		}

		if(date.part === "" || date.part == undefined) {
			delete date.part;
		}

		//make sure year is always a string
		if(date.year || date.year === 0) date.year += '';

		return date;
	}

	this.isHTTPDate = function(str) {
		var dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
			"Oct", "Nov", "Dec"];
		str = str.trim();
		var temp = str.split(',');
		if (temp.length > 1) {
			var dayOfWeek = temp[0];
			if(dayNames.indexOf(dayOfWeek) == -1) {
				return false;
			}

			str = temp[1].trim();
		}
		temp = str.split(' ');
		temp = temp.filter((t) => ! t.match(/^\s*$/));
		if (temp.length < 5) {
			return false;
		}
		if (!temp[0].trim().match(/[0-3]\d/)) {
			return false;
		}
		if (monthNames.indexOf(temp[1].trim()) == -1) {
			return false;
		}
		if (!temp[2].trim().match(/\d\d\d\d/)) {
			return false;
		}
		temp.splice(0, 3);
		var time = temp[0].trim().split(':');
		if (time.length < 2) {
			return false;
		}
		for (let t of time) {
			if (!t.match(/\d\d/)) {
				return false;
			}
		}
		temp.splice(0, 1);
		var zone = temp.join(' ').trim();
		return !!zone.match(/([+-]\d\d\d\d|UTC?|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT)/)
	};


	function _insertDateOrderPart(dateOrder, part, partOrder) {
		if (!dateOrder) {
			return part;
		}
		if (partOrder.before === true) {
			return part + dateOrder;
		}
		if (partOrder.after === true) {
			return dateOrder + part;
		}
		if (partOrder.before) {
			var pos = dateOrder.indexOf(partOrder.before);
			if (pos == -1) {
				return dateOrder;
			}
			return dateOrder.replace(new RegExp("(" + partOrder.before + ")"), part + '$1');
		}
		if (partOrder.after) {
			var pos = dateOrder.indexOf(partOrder.after);
			if (pos == -1) {
				return dateOrder + part;
			}
			return dateOrder.replace(new RegExp("(" + partOrder.after + ")"), '$1' + part);
		}
		return dateOrder + part;
	}



	/**
	 * does pretty formatting of a date object returned by strToDate()
	 *
	 * @param {Object} date A date object, as returned from strToDate()
	 * @param {Boolean} shortFormat Whether to return a short (12/1/95) date
	 * @return A formatted date string
	 * @type String
	 **/
	this.formatDate = function (date, shortFormat) {
		if(shortFormat) {
			var localeDateOrder = getLocaleDateOrder();
			var string = localeDateOrder[0]+"/"+localeDateOrder[1]+"/"+localeDateOrder[2];
			return string.replace("y", (date.year !== undefined ? date.year : "00"))
				.replace("m", (date.month !== undefined ? 1+date.month : "0"))
				.replace("d", (date.day !== undefined ? date.day : "0"));
		} else {
			var string = "";

			if(date.part) {
				string += date.part+" ";
			}

			var months = Utilities_Date.getMonths().long; // no 'this' for translator sandbox
			if(date.month != undefined && months[date.month]) {
				// get short month strings from CSL interpreter
				string += months[date.month];
				if(date.day) {
					string += " "+date.day+", ";
				} else {
					string += " ";
				}
			}

			if(date.year) {
				string += date.year;
			}
		}

		return string;
	}

	this.strToISO = function (str) {
		var date = this.strToDate(str);

		if(date.year) {
			var dateString = Zotero.Utilities.lpad(date.year, "0", 4);
			if (parseInt(date.month) == date.month) {
				dateString += "-"+Zotero.Utilities.lpad(date.month+1, "0", 2);
				if(date.day) {
					dateString += "-"+Zotero.Utilities.lpad(date.day, "0", 2);
				}
			}
			return dateString;
		}
		return false;
	}


	this.sqlToISO8601 = function (sqlDate) {
		var date = sqlDate.substr(0, 10);
		var matches = date.match(/^([0-9]{4})\-([0-9]{2})\-([0-9]{2})/);
		if (!matches) {
			return false;
		}
		date = matches[1];
		// Drop parts for reduced precision
		if (matches[2] !== "00") {
			date += "-" + matches[2];
			if (matches[3] !== "00") {
				date += "-" + matches[3];
			}
		}
		var time = sqlDate.substr(11);
		// TODO: validate times
		if (time) {
			date += "T" + time + "Z";
		}
		return date;
	}

	// A date, optionally followed by a slash and a second date, where each date is a
	// 4-digit year with an optional minus sign followed by month/day/time/qualifier
	// characters
	var _edtfShapeRE = /^-?[0-9]{4}[-0-9T:+Z~?%]*(\/-?[0-9]{4}[-0-9T:+Z~?%]*)?$/i;

	// Era markers, with optional periods and spaces
	var _bceMarker = 'B\\.?\\s?C\\.?(?:\\s?E\\.?)?';
	var _ceMarker = 'C\\.?\\s?E\\.?|A\\.?\\s?D\\.?';
	var _bceMarkerRE = new RegExp(`^${_bceMarker}$`, 'i');
	// A year with an era marker after it ("429 BCE") or, for CE, before it ("AD 429")
	var _eraYearRE = new RegExp(
		`^(?:(${_ceMarker})\\s*)?([0-9]{1,4})(?:\\s*(${_bceMarker}|${_ceMarker}))?$`, 'i'
	);
	// A range of years with an era marker on either year
	var _eraRangeRE = new RegExp(
		`^(?:(${_ceMarker})\\s*)?([0-9]{1,4})(?:\\s*(${_bceMarker}|${_ceMarker}))?`
			+ `\\s*-\\s*([0-9]{1,4})(?:\\s*(${_bceMarker}|${_ceMarker}))?$`, 'i'
	);

	// Convert a year and an era marker to a signed, zero-padded EDTF year
	function _toEDTFYear(year, marker) {
		return (_bceMarkerRE.test(marker) ? '-' : '') + year.padStart(4, '0');
	}

	/**
	 * Convert a year or range of years with an era marker to EDTF, with BCE years as
	 * negative years
	 *
	 * On a range, a marker on only one of the years applies to both ("1000-900 BCE",
	 * "AD 429-500"), so ranges spanning the eras need both ("100 BCE-50 CE").
	 *
	 * @param {String} str
	 * @return {String|false} - An EDTF year or interval, or false if the string isn't
	 *     a year or range of years with an era marker
	 */
	function _eraToEDTF(str) {
		var match = str.match(_eraRangeRE) || str.match(_eraYearRE);
		if (!match) {
			return false;
		}
		var [, prefix, beginYear, beginMarker, endYear, endMarker] = match;
		// A marker both before and after the same year is nonsense
		if (prefix && beginMarker) {
			return false;
		}
		beginMarker = prefix || beginMarker;
		if (!beginMarker && !endMarker) {
			return false;
		}
		// Neither era has a year zero
		if (/^0+$/.test(beginYear) || (endYear && /^0+$/.test(endYear))) {
			return false;
		}
		var edtf = _toEDTFYear(beginYear, beginMarker || endMarker);
		if (endYear) {
			edtf += '/' + _toEDTFYear(endYear, endMarker || beginMarker);
		}
		return edtf;
	}

	// A year with an era marker next to it ("429 BCE", "AD 429")
	var _eraMarkerRE = new RegExp(
		`[0-9]\\s*(?:${_bceMarker}|${_ceMarker})|(?:${_ceMarker})\\s*[0-9]`, 'i'
	);
	// A negative year, at the beginning of a string or after an interval slash
	var _negativeYearRE = /(?:^|\/)-[0-9]/;
	var _eraMarkersRE = new RegExp(`${_bceMarker}|${_ceMarker}`, 'gi');
	// A circa prefix, in EDTF's notation or in words
	var _circaPrefixRE = /^(?:~|circa |ca\.? ?|c\. ?|about |around )\s*/i;
	// EDTF punctuation, and nothing a date could be spelled out with
	var _edtfCharsRE = /^[-0-9T:+Z~?%/\s.]*$/i;

	// Treat en dashes, em dashes, minus signs, and double hyphens as hyphens, since
	// ranges are written with all of them ("1995–1996", "1995--1996")
	function _normalizeDashes(str) {
		return str.replace(/[\u2013\u2014\u2212]/g, '-').replace(/--+/g, '-');
	}

	// Check whether a string gives a year in a notation strToDate() misreads, either a
	// negative year or an era marker. An era marker counts only if the rest of the
	// string is EDTF punctuation, so that spelled-out dates ("January 10 200 BCE") are
	// left to strToDate(), which reads their months and days.
	function _hasEraNotation(str) {
		return _negativeYearRE.test(str)
			|| (_eraMarkerRE.test(str) && _edtfCharsRE.test(str.replace(_eraMarkersRE, '')));
	}

	/**
	 * Convert a year with an era marker ("200 BCE", "AD 200") to a signed year
	 *
	 * strToDate() leaves the marker in the year it returns, which citeproc-js reads as
	 * a CE year, since it runs date parts through parseInt().
	 *
	 * @param {String} str
	 * @return {Number|false} - A signed year, or false if the string isn't a year with
	 *     an era marker
	 */
	this.parseEraYear = function (str) {
		if (typeof str != 'string') {
			return false;
		}
		var edtf = _eraToEDTF(_normalizeDashes(str.trim()));
		if (!edtf || edtf.includes('/')) {
			return false;
		}
		return parseInt(edtf, 10);
	};

	/**
	 * Check whether a string is written as an EDTF date -- an EDTF-shaped value, a
	 * negative year, or an era marker
	 *
	 * strToDate() reads a year and a season out of such a string, giving a CE year for
	 * a BCE date and a season for the second half of a range, so a string that
	 * parseEDTF() rejects is better treated as a literal date than reinterpreted.
	 *
	 * @param {String} str
	 * @return {Boolean}
	 */
	this.looksLikeEDTF = function (str) {
		if (typeof str != 'string') {
			return false;
		}
		str = _normalizeDashes(str.trim()).replace(_circaPrefixRE, '');
		return _hasEraNotation(str) || _edtfShapeRE.test(str);
	};

	/**
	 * Parse a string in EDTF (ISO 8601-2) format
	 *
	 * Handles the subset of EDTF that maps to other Zotero date handling: dates with
	 * optional uncertain/approximate qualifiers and closed intervals. Some common
	 * non-EDTF notations are normalized to EDTF equivalents:
	 *
	 *   - Dash-separated year ranges ("1995-1996"), including condensed ranges
	 *     ("1995-96", "2021-22"), become intervals, with en dashes and other dashes
	 *     treated as hyphens
	 *   - Circa prefixes ("~1995", "circa 1995", "ca. 1995") become approximate
	 *     qualifiers
	 *   - Era markers become signed years, on a single year ("429 BCE", "AD 429") or
	 *     on a range, where a marker on only one year applies to both ("1000-900 BCE")
	 *
	 * Anything else is rejected, including seasons, whose EDTF notation ("2021-22"
	 * for Summer 2021) collides with condensed ranges, and strings that only parse
	 * at EDTF level 2 (e.g., "429", which is a level 2 notation for the decade 429X).
	 *
	 * @param {String} str
	 * @return {Object|false} - Object with 'begin' ({year, month, day} -- month 0-indexed,
	 *     as in strToDate()), 'end' (same, for intervals), and 'circa' (true if any part
	 *     is uncertain or approximate); false if the string isn't EDTF, uses unsupported
	 *     features, or the EDTF library isn't loaded
	 */
	this.parseEDTF = function (str) {
		if (typeof EDTF == 'undefined' || typeof str != 'string') {
			return false;
		}
		str = _normalizeDashes(str.trim());
		// Fast path for plain ISO dates, which don't need the full EDTF parser
		var iso = str.match(/^([0-9]{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12][0-9]|3[01]))?)?$/);
		if (iso) {
			let begin = { year: parseInt(iso[1], 10) };
			if (iso[2]) {
				begin.month = parseInt(iso[2], 10) - 1;
				if (iso[3]) {
					begin.day = parseInt(iso[3], 10);
				}
			}
			return { begin };
		}
		// Convert a circa prefix to an approximate qualifier below
		var circa = _circaPrefixRE.test(str);
		if (circa) {
			str = str.replace(_circaPrefixRE, '');
		}
		// Convert era markers to signed years ("429 BCE" to "-0429", "AD 429" to "0429")
		var eraEDTF = _eraToEDTF(str);
		if (eraEDTF) {
			str = eraEDTF;
		}
		// EDTF contains no spaces and begins with a digit or minus sign
		if (!/^[-0-9]\S*$/.test(str)) {
			return false;
		}
		// Allow unpadded negative years (e.g., "-429" for "-0429")
		str = str.replace(
			/(^|\/)-([0-9]{1,3})(?=[-~?%/]|$)/g,
			(m, pre, year) => pre + '-' + year.padStart(4, '0')
		);
		// Treat dash-separated years as a range ("1995-1996"), including condensed
		// ranges ("1995-96", "2021-22") when the second value is greater than the
		// first and so can't be a month
		var range = str.match(/^([0-9]{4})-([0-9]{2}|[0-9]{4})$/);
		if (range) {
			let begin = parseInt(range[1], 10);
			let end = parseInt(range[2], 10);
			if (range[2].length == 2) {
				end = end > 12 ? Math.floor(begin / 100) * 100 + end : 0;
			}
			if (end > begin) {
				str = range[1] + '/' + String(end).padStart(4, '0');
			}
		}
		if (circa && !/[~?%]$/.test(str)) {
			str += '~';
		}
		// Skip the parser for strings that can't be in the supported EDTF subset,
		// e.g., other numeric date formats like "5/13/2021" and "13.5.2021"
		if (!_edtfShapeRE.test(str)) {
			return false;
		}
		var parsed;
		try {
			parsed = EDTF.parse(str);
		}
		catch (e) {
			return false;
		}

		// Only plain dates at level 0-1, without unspecified digits (e.g., "196X")
		function convertDate(date) {
			if (!date || date.type != 'Date' || date.level > 1 || date.unspecified) {
				return false;
			}
			let converted = { year: date.values[0] };
			if (date.values.length > 1) {
				converted.month = date.values[1];
			}
			if (date.values.length > 2) {
				converted.day = date.values[2];
			}
			return converted;
		}

		let result = {};
		if (parsed.type == 'Date') {
			result.begin = convertDate(parsed);
			if (!result.begin) {
				return false;
			}
			if (parsed.uncertain || parsed.approximate) {
				result.circa = true;
			}
		}
		else if (parsed.type == 'Interval') {
			result.begin = convertDate(parsed.values[0]);
			result.end = convertDate(parsed.values[1]);
			if (!result.begin || !result.end) {
				return false;
			}
			// Reject reversed and degenerate intervals
			let toComparable = date => date.year * 10000
				+ (date.month !== undefined ? (date.month + 1) * 100 : 0)
				+ (date.day || 0);
			if (toComparable(result.end) <= toComparable(result.begin)) {
				return false;
			}
			for (let value of parsed.values) {
				if (value.uncertain || value.approximate) {
					result.circa = true;
				}
			}
		}
		else {
			return false;
		}
		return result;
	};

	this.strToMultipart = function (str) {
		if (!str){
			return '';
		}

		// For an EDTF date, sort by the start of any range, ignoring qualifiers
		var edtfDate = this.parseEDTF(str);
		var parts;
		if (edtfDate) {
			parts = edtfDate.begin;
		}
		// A date whose era strToDate() would drop has no sortable year, since the sort
		// key can't represent one anyway
		else if (_hasEraNotation(_normalizeDashes(str.trim()).replace(_circaPrefixRE, ''))) {
			parts = {};
		}
		else {
			parts = this.strToDate(str);
		}

		// FIXME: Until we have a better BCE date solution,
		// remove year value if not between 1 and 9999
		if (parts.year) {
			var year = parts.year + '';
			if (!year.match(/^[0-9]{1,4}$/)) {
				delete parts.year;
			}
		}

		parts.month = typeof parts.month != "undefined" ? parts.month + 1 : '';

		var multi = (parts.year ? Zotero.Utilities.lpad(parts.year, '0', 4) : '0000') + '-'
			+ Zotero.Utilities.lpad(parts.month, '0', 2) + '-'
			+ (parts.day ? Zotero.Utilities.lpad(parts.day, '0', 2) : '00')
			+ ' '
			+ str;
		return multi;
	}

	// Regexes for multipart and SQL dates
	// Allow zeroes in multipart dates
	// TODO: Allow negative multipart in DB and here with \-?
	var _multipartRE = /^[0-9]{4}\-(0[0-9]|10|11|12)\-(0[0-9]|[1-2][0-9]|30|31) /;
	var _sqldateRE = /^\-?[0-9]{4}\-(0[1-9]|10|11|12)\-(0[1-9]|[1-2][0-9]|30|31)$/;
	var _sqldateWithZeroesRE = /^\-?[0-9]{4}\-(0[0-9]|10|11|12)\-(0[0-9]|[1-2][0-9]|30|31)$/;
	var _sqldatetimeRE = /^\-?[0-9]{4}\-(0[1-9]|10|11|12)\-(0[1-9]|[1-2][0-9]|30|31) ([0-1][0-9]|[2][0-3]):([0-5][0-9]):([0-5][0-9])$/;
	var _sqlDateTimeWithoutSecondsRE = /^\-?[0-9]{4}\-(0[1-9]|10|11|12)\-(0[1-9]|[1-2][0-9]|30|31) ([0-1][0-9]|[2][0-3]):([0-5][0-9])$/;

	/**
	 * Tests if a string is a multipart date string
	 * e.g. '2006-11-03 November 3rd, 2006'
	 */
	this.isMultipart = function (str) {
		if (this.isSQLDateTime(str) || this.isSQLDateTimeWithoutSeconds(str)) {
			return false;
		}
		return _multipartRE.test(str);
	}


	/**
	 * Returns the SQL part of a multipart date string
	 * (e.g. '2006-11-03 November 3rd, 2006' returns '2006-11-03')
	 */
	this.multipartToSQL = function (multi) {
		if (!multi){
			return '';
		}

		if (!this.isMultipart(multi)) {
			return '0000-00-00';
		}

		return multi.substr(0, 10);
	}


	/**
	 * Returns the user part of a multipart date string
	 * (e.g. '2006-11-03 November 3rd, 2006' returns 'November 3rd, 2006')
	 */
	this.multipartToStr = function (multi) {
		if (!multi){
			return '';
		}

		if (!this.isMultipart(multi)) {
			return multi;
		}

		return multi.substr(11);
	}


	/**
	 * Convert 'yesterday'/'today'/'tomorrow' to SQL date, or else return original string
	 *
	 * @param {String} str
	 * @return {String}
	 */
	this.parseDescriptiveString = function (str) {
		// Parse 'yesterday'/'today'/'tomorrow' and convert to dates,
		// since it doesn't make sense for those to be actual metadata values
		var lc = str.toLowerCase().trim();
		if (lc == 'yesterday' || lc == Zotero.getString('date.yesterday')) {
			str = Utilities_Date.dateToSQL(new Date(new Date().getTime() - 86400000)).substr(0, 10);
		}
		else if (lc == 'today' || lc == Zotero.getString('date.today')) {
			str = Utilities_Date.dateToSQL(new Date()).substr(0, 10);
		}
		else if (lc == 'tomorrow' || lc == Zotero.getString('date.tomorrow')) {
			str = Utilities_Date.dateToSQL(new Date(new Date().getTime() + 86400000)).substr(0, 10);
		}
		return str;
	};


	function isSQLDate(str, allowZeroes) {
		if (allowZeroes) {
			return _sqldateWithZeroesRE.test(str);
		}
		return _sqldateRE.test(str);
	}


	function isSQLDateTime(str){
		return _sqldatetimeRE.test(str);
	}


	this.isSQLDateTimeWithoutSeconds = function (str) {
		return _sqlDateTimeWithoutSecondsRE.test(str);
	}


	function sqlHasYear(sqldate){
		return isSQLDate(sqldate, true) && sqldate.substr(0,4)!='0000';
	}


	function sqlHasMonth(sqldate){
		return isSQLDate(sqldate, true) && sqldate.substr(5,2)!='00';
	}


	function sqlHasDay(sqldate){
		return isSQLDate(sqldate, true) && sqldate.substr(8,2)!='00';
	}


	function getUnixTimestamp() {
		return Math.round(Date.now() / 1000);
	}


	function toUnixTimestamp(date) {
		if (date === null || typeof date != 'object' ||
			date.constructor.name != 'Date') {
			throw new Error(`'${date}' is not a valid date`);
		}
		return Math.round(date.getTime() / 1000);
	}


	/**
	 * Convert a JS Date to a relative date (e.g., "5 minutes ago")
	 *
	 * Adapted from http://snipplr.com/view/10290/javascript-parse-relative-date/
	 *
	 * @param	{Date}	date
	 * @return	{String}
	 */
	this.toRelativeDate = function (date) {
		var str;
		var now = new Date();
		var timeSince = now.getTime() - date;
		var inSeconds = timeSince / 1000;
		var inMinutes = timeSince / 1000 / 60;
		var inHours = timeSince / 1000 / 60 / 60;
		var inDays = timeSince / 1000 / 60 / 60 / 24;
		var inYears = timeSince / 1000 / 60 / 60 / 24 / 365;

		var n;

		// in seconds
		if (Math.round(inSeconds) == 1) {
			var key = "secondsAgo";
		}
		else if (inMinutes < 1.01) {
			var key = "secondsAgo";
			n = Math.round(inSeconds);
		}

		// in minutes
		else if (Math.round(inMinutes) == 1) {
			var key = "minutesAgo";
		}
		else if (inHours < 1.01) {
			var key = "minutesAgo";
			n = Math.round(inMinutes);
		}

		// in hours
		else if (Math.round(inHours) == 1) {
			var key = "hoursAgo";
		}
		else if (inDays < 1.01) {
			var key = "hoursAgo";
			n = Math.round(inHours);
		}

		// in days
		else if (Math.round(inDays) == 1) {
			var key = "daysAgo";
		}
		else if (inYears < 1.01) {
			var key = "daysAgo";
			n = Math.round(inDays);
		}

		// in years
		else if (Math.round(inYears) == 1) {
			var key = "yearsAgo";
		}
		else {
			var key = "yearsAgo";
			var n = Math.round(inYears);
		}

		return Zotero.getString("date.relative." + key + "." + (n ? "multiple" : "one"), n);
	}


	this.toFriendlyDate = function (date) {
		// 6:14:36 PM
		if (isToday(date)) {
			return date.toLocaleString(false, { hour: 'numeric', minute: 'numeric' })
		}
		// 'Thursday'
		if (isThisWeek(date)) {
			return date.toLocaleString(false, { weekday: 'long' });
		}
		return date.toLocaleDateString(false, { year: '2-digit', month: 'numeric', day: 'numeric' });
	};


	function isToday(date) {
		var d = new Date();
		return d.getDate() == date.getDate()
			&& d.getMonth() == date.getMonth()
			&& d.getFullYear() == date.getFullYear();
	}


	function isThisWeek(date) {
		var d = new Date();
		return d.getFullYear() == date.getFullYear() && getWeekNumber(d) == getWeekNumber(date);
	}


	// https://stackoverflow.com/a/27125580
	function getWeekNumber(date) {
		let onejan = new Date(date.getFullYear(), 0, 1);
		return Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
	}


	function getFileDateString(file){
		var date = new Date();
		date.setTime(file.lastModifiedTime);
		return date.toLocaleDateString();
	}


	function getFileTimeString(file){
		var date = new Date();
		date.setTime(file.lastModifiedTime);
		return date.toLocaleTimeString();
	}

	/**
	 * Get the order of the date components based on the current locale
	 *
	 * Returns a string with y, m, and d (e.g. 'ymd', 'mdy')
	 */
	function getLocaleDateOrder(){
		if (!_localeDateOrder) {
			switch (Zotero.locale ? Zotero.locale.substr(3) : "US") {
				// middle-endian
			case 'US': // The United States
			case 'BZ': // Belize
			case 'FM': // The Federated States of Micronesia
			case 'PA': // Panama
			case 'PH':	// The Philippines
			case 'PW':	// Palau
			case 'ZW': // Zimbabwe
				_localeDateOrder = 'mdy';
				break;

				// big-endian
			case 'fa': // Persian
			case 'AL': // Albania
			case 'CA': // Canada
			case 'CN': // China
			case 'HU': // Hungary
			case 'JP': // Japan
			case 'KE': // Kenya
			case 'KR': // Korea
			case 'LT': // Lithuania
			case 'LV': // Latvia
			case 'MN': // Mongolia
			case 'SE': // Sweden
			case 'TW': // Taiwan
			case 'ZA': // South Africa
				_localeDateOrder = 'ymd';
				break;

				// little-endian
			default:
				_localeDateOrder = 'dmy';
			}
		}
		return _localeDateOrder;
	}
}

if (typeof module != 'undefined') {
	module.exports = Utilities_Date;
} else if (typeof Zotero != 'undefined') {
	Zotero.Date = Utilities_Date;
}

})();
