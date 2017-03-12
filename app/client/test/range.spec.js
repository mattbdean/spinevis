let expect = require('chai').expect;

let range = require('../src/core/range.js');

describe('range', function() {
    describe('create', function() {
        it('should create a 2-property object', function() {
            let r = range.create(0, 10);
            expect(r.start).to.be.equal(0);
            expect(r.end).to.be.equal(10);
        });

        it('should flip ranges that go backwards', function() {
            let r = range.create(10, 0);
            expect(r.start).to.be.equal(0);
            expect(r.end).to.be.equal(10);
        });
    });

    describe('merge', function() {
        it('should leave unrelated ranges alone', function() {
            let ranges = [range.create(0, 5), range.create(10, 15)];
            let merged = range.merge(ranges);
            expect(merged.length).to.be.equal(2);
            expect(ranges).to.be.deep.equal(merged);
        });

        it('should merge ranges when one ecompasses the other', function() {
            let ranges = [range.create(5, 6), range.create(0, 10)];
            let merged = range.merge(ranges);
            expect(merged.length).to.be.equal(1);
            expect(merged).to.be.deep.equal([range.create(0, 10)]);
        });

        it('should merge ranges when one intersects another', function() {
            let ranges = [range.create(3, 7), range.create(5, 9)];
            let merged = range.merge(ranges);
            expect(merged.length).to.be.equal(1);
            expect(merged).to.be.deep.equal([range.create(3, 9)]);
        });
    });

    describe('contained', function() {
        it('should return true when big encompasses small', function() {
            expect(range.contained(range.create(0, 10), range.create(4, 5))).to.be.equal(true);
        });

        it('should return false when big does not encompass small', function() {
            expect(range.contained(range.create(0, 5), range.create(4, 9))).to.be.equal(false);
        });
    });

    describe('squeeze', function() {
        // Ranges to use as first parameter to squeeze() for all tests
        let ranges = [range.create(0, 10), range.create(20, 30)];

        it('should leave fit alone when necessary', function() {
            let fit = range.create(14, 15);
            let squeezed = range.squeeze(ranges, fit);
            expect(squeezed).to.be.deep.equal(fit);
        });

        it('should adjust start when necessary', function() {
            let fit = range.create(5, 15);
            let squeezed = range.squeeze(ranges, fit);
            expect(squeezed.start).to.be.equal(10);
            expect(squeezed.end).to.be.equal(fit.end);
        });

        it('should adjust end when necessary', function() {
            let fit = range.create(15, 25);
            let squeezed = range.squeeze(ranges, fit);
            expect(squeezed.start).to.be.equal(fit.start);
            expect(squeezed.end).to.be.equal(20);
        });

        it('should return null when squeezing is impossible', function() {
            let fit = range.create(5, 6);
            let squeezed = range.squeeze(ranges, fit);
            expect(squeezed).to.be.null;
        });
    });
});
