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

		it("should drop a negative year", function () {
			assert.equal(Zotero.Date.strToMultipart('-0429'), '0000-00-00 -0429');
			assert.equal(Zotero.Date.strToMultipart('429 BCE'), '0000-00-00 429 BCE');
		});
	});
});
