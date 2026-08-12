describe("Zotero.Date", function () {
	describe("parseEDTF", function () {
		it("should parse a date with qualifiers", function () {
			let o = Zotero.Date.parseEDTF('2004-06~');
			assert.deepEqual(o.begin, { year: 2004, month: 5 });
			assert.isTrue(o.circa);
		});

		it("should parse an interval", function () {
			let o = Zotero.Date.parseEDTF('2021/2026');
			assert.deepEqual(o.begin, { year: 2021 });
			assert.deepEqual(o.end, { year: 2026 });
			assert.isUndefined(o.circa);
		});

		it("should parse an unpadded negative year", function () {
			let o = Zotero.Date.parseEDTF('-429?');
			assert.deepEqual(o.begin, { year: -429 });
			assert.isTrue(o.circa);
		});

		it("should parse dash-separated year ranges", function () {
			let o = Zotero.Date.parseEDTF('1995-1996');
			assert.deepEqual(o.begin, { year: 1995 });
			assert.deepEqual(o.end, { year: 1996 });

			// Condensed range, not an EDTF season
			o = Zotero.Date.parseEDTF('2021-22');
			assert.deepEqual(o.begin, { year: 2021 });
			assert.deepEqual(o.end, { year: 2022 });

			// Two-digit values up to 12 are months
			o = Zotero.Date.parseEDTF('1995-05');
			assert.deepEqual(o.begin, { year: 1995, month: 4 });
			assert.isUndefined(o.end);

			// En dash
			o = Zotero.Date.parseEDTF('1995–1996');
			assert.deepEqual(o.begin, { year: 1995 });
			assert.deepEqual(o.end, { year: 1996 });

			// Double hyphen
			o = Zotero.Date.parseEDTF('1995--96');
			assert.deepEqual(o.begin, { year: 1995 });
			assert.deepEqual(o.end, { year: 1996 });
		});

		it("should convert a circa prefix to a qualifier", function () {
			let o = Zotero.Date.parseEDTF('~1995');
			assert.deepEqual(o.begin, { year: 1995 });
			assert.isTrue(o.circa);

			o = Zotero.Date.parseEDTF('ca. 1995');
			assert.deepEqual(o.begin, { year: 1995 });
			assert.isTrue(o.circa);
		});

		it("should convert a BCE suffix to a negative year", function () {
			let o = Zotero.Date.parseEDTF('429 BCE');
			assert.deepEqual(o.begin, { year: -429 });
			assert.isUndefined(o.circa);

			o = Zotero.Date.parseEDTF('~429 BCE');
			assert.deepEqual(o.begin, { year: -429 });
			assert.isTrue(o.circa);
		});

		it("should convert a CE/AD marker to a year", function () {
			let o = Zotero.Date.parseEDTF('429 CE');
			assert.deepEqual(o.begin, { year: 429 });

			o = Zotero.Date.parseEDTF('AD 429');
			assert.deepEqual(o.begin, { year: 429 });
		});

		it("should convert era markers on ranges", function () {
			let o = Zotero.Date.parseEDTF('1000 BCE-900 BCE');
			assert.deepEqual(o.begin, { year: -1000 });
			assert.deepEqual(o.end, { year: -900 });

			// Marker on only one year applies to both
			o = Zotero.Date.parseEDTF('1000–900 BCE');
			assert.deepEqual(o.begin, { year: -1000 });
			assert.deepEqual(o.end, { year: -900 });

			o = Zotero.Date.parseEDTF('AD 429-500');
			assert.deepEqual(o.begin, { year: 429 });
			assert.deepEqual(o.end, { year: 500 });

			// Ranges spanning the eras need both markers
			o = Zotero.Date.parseEDTF('100 BCE-50 CE');
			assert.deepEqual(o.begin, { year: -100 });
			assert.deepEqual(o.end, { year: 50 });

			o = Zotero.Date.parseEDTF('ca. 480 B.C. - 323 B.C.');
			assert.deepEqual(o.begin, { year: -480 });
			assert.deepEqual(o.end, { year: -323 });
			assert.isTrue(o.circa);
		});

		it("should reject unsupported strings", function () {
			// Level 2 decade
			assert.isFalse(Zotero.Date.parseEDTF('429'));
			// Unspecified digits
			assert.isFalse(Zotero.Date.parseEDTF('196X'));
			// Open interval
			assert.isFalse(Zotero.Date.parseEDTF('2021/..'));
			// Backwards or degenerate ranges
			assert.isFalse(Zotero.Date.parseEDTF('1996-1995'));
			assert.isFalse(Zotero.Date.parseEDTF('2021-21'));
			assert.isFalse(Zotero.Date.parseEDTF('2026/2021'));
			assert.isFalse(Zotero.Date.parseEDTF('2021/2021'));
			assert.isFalse(Zotero.Date.parseEDTF('2021-05/2021-04'));
			assert.isFalse(Zotero.Date.parseEDTF('900-1000 BCE'));
			assert.isFalse(Zotero.Date.parseEDTF('50 CE-100 BCE'));
			// Era markers before and after the same year
			assert.isFalse(Zotero.Date.parseEDTF('AD 429 BCE'));
			// No year zero in either era
			assert.isFalse(Zotero.Date.parseEDTF('0 CE'));
			assert.isFalse(Zotero.Date.parseEDTF('AD 0'));
			// Non-EDTF date
			assert.isFalse(Zotero.Date.parseEDTF('May 13, 2021'));
		});
	});

	describe("strToMultipart", function () {
		it("should convert a plain date", function () {
			assert.equal(Zotero.Date.strToMultipart('2021-05-13'), '2021-05-13 2021-05-13');
		});

		it("should sort an EDTF interval by its start", function () {
			assert.equal(Zotero.Date.strToMultipart('2021/2026'), '2021-00-00 2021/2026');
			assert.equal(Zotero.Date.strToMultipart('2021-05/2021-06'), '2021-05-00 2021-05/2021-06');
		});

		it("should ignore EDTF qualifiers", function () {
			assert.equal(Zotero.Date.strToMultipart('2004-06~'), '2004-06-00 2004-06~');
			assert.equal(Zotero.Date.strToMultipart('ca. 1900'), '1900-00-00 ca. 1900');
		});

		it("should sort a year with a CE marker", function () {
			assert.equal(Zotero.Date.strToMultipart('429 CE'), '0429-00-00 429 CE');
		});

		it("should drop a negative year", function () {
			assert.equal(Zotero.Date.strToMultipart('-0429'), '0000-00-00 -0429');
			assert.equal(Zotero.Date.strToMultipart('429 BCE'), '0000-00-00 429 BCE');
		});
	});
});
