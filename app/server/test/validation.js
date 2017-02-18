let assert = require('assert');
let validation = require('../src/routes/validation.js');

describe('input validation', function() {
    describe('trialId', function() {
        let t = validation.trialId;
        it('should recognize valid input', function() {
            assert.ok(t('BMWR34:20160106:1:1'));
            assert.ok(t('BMWR30:20151123:2:1'));
        });
        it('should reject invalid input', function() {
            assert.ok(!t('SOMETHING:DATE:FOV:RUN'));
            assert.ok(!t('invalid'));
            assert.ok(!t('12345:20160106:1:1'))
            assert.ok(!t('ABCDEF:20160106:1:1'))
        });
    });

    describe('partialNameRegex', function() {
        let t = validation.partialName;
        it('should recognize valid input', function() {
            assert.ok(t('something'));
            assert.ok(t('something-else0'));
        });

        it('should reject invalid input', function() {
            assert.ok(!t('invalid!character'));
            assert.ok(!t('__file__'));
        })
    });
});
