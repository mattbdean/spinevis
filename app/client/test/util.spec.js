let expect = require('chai').expect;

let util = require('../src/core/util.js');

describe('util', function() {
    describe('format', function() {
        describe('duration', function() {
            it('should report differences in the [hours]h [minutes]m format', function() {
                let start = new Date();
                // 90 minutes into the future
                let end = new Date(start.getTime() + (90 * 60 * 1000));
                expect(util.format.duration(start.toString(), end.toString())).to.be.equal('1h 30m');
            });
        });
    });
});
