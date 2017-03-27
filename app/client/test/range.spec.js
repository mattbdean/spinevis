let chai = require('chai');
let expect = chai.expect;

let range = require('../src/timeline/range.js');

describe('range', function() {
    describe('create', function() {
        it('should create a 3-property object', function() {
            let r = range.create(5, 15);
            expect(r.start).to.be.equal(5);
            expect(r.end).to.be.equal(15);
            expect(r.delta).to.be.equal(10);
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
});
