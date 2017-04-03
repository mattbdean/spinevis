let chai = require('chai');
let expect = chai.expect;

let range = require('../src/core/range.js');

describe('range', function() {
    describe('create', function() {
        it('should create a frozen 4-property object', function() {
            let r = range.create(5, 15);
            expect(r.start).to.be.equal(5);
            expect(r.end).to.be.equal(15);
            expect(r.delta).to.be.equal(10);
            expect(r.middle).to.be.equal(10);

            r.start = 100;
            expect(r.start).to.be.equal(5);
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

    describe('fromPadding', function() {
        it('should accept a single padding', function() {
            let r = range.fromPadding(100, 10);

            expect(r.start).to.equal(90);
            expect(r.end).to.equal(110);
            expect(r.middle).to.equal(100);
        });
    });

    describe('copy', function() {
        it('should copy the ranges properties', function() {
            let r = range.create(0, 10);
            let copy = range.copy(r);

            // r !== copy
            expect(r).to.not.equal(copy);
            // r must have the same contents as its copy
            expect(r).to.deep.equal(copy);
        });
    });
});
