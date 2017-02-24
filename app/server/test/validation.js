let assert = require('assert');
let validation = require('../src/routes/validation.js');

let setUpSuite = function(validationFnName, validInput, invalidInput) {
    describe(validationFnName, function() {
        let validate = validation[validationFnName];
        it('should recognize valid input', function() {
            for (let valid of validInput) {
                assert.ok(validate(valid));
            }
        });
        it('should reject invalid input', function() {
            for (let valid of invalidInput) {
                assert.ok(!validate(valid));
            }
        });
    });
}

describe('input validation', function() {
    setUpSuite('sessionId',
        /*valid = */['BMWR34:20160106:1:1', 'BMWR30:20151123:2:1'],
        /*invalid = */['SOMETHING:DATE:FOV', 'invalid', '12345:20160601:1:1', 'ABCDEF:20160106:1:1']
    );

    setUpSuite('partialName',
        /*valid = */['something', 'something-else0'],
        /*invalid = */['invalid!character', '__file__']
    );
});
