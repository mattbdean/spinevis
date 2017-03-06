let assert = require('assert');
let validation = require('../src/routes/validation.js');

let setUpSuite = function(validationFn, strict, validInput, invalidInput) {
    if (typeof validationFn === 'string') {
        validationFn = validation[validationFn];
    }

    describe(validationFn.name, function() {
        it('should recognize valid input', function() {
            for (let valid of validInput) {
                if (strict) {
                    assert.strictEqual(validationFn(valid), true, `${valid} was unexpectedly invalid`);
                } else {
                    assert.ok(validationFn(valid), `${valid} was unexpectedly invalid`);
                }
            }
        });
        it('should reject invalid input', function() {
            for (let invalid of invalidInput) {
                if (strict) {
                    assert.strictEqual(validationFn(invalid), false, `${invalid} was unexpectedly valid`);
                } else {
                    assert.ok(!validationFn(invalid), `${invalid} was unexpectedly valid`);
                }
            }
        });
    });
}

describe('input validation', function() {
    setUpSuite('sessionId', true,
        /*valid = */['BMWR34:20160106:1:1', 'BMWR30:20151123:2:1'],
        /*invalid = */['SOMETHING:DATE:FOV', 'invalid', '12345:20160601:1:1', 'ABCDEF:20160106:1:1']
    );

    setUpSuite('partialName', true,
        /*valid = */['something', 'something-else0'],
        /*invalid = */['invalid!character', '__file__']
    );

    setUpSuite('integer', false,
        /*valid = */['4', '8', '994'],
        /*invalid = */['bla', 'foo', 'bar']
    );

    setUpSuite(function integerStrict(input) { return validation.integerStrict(input, 0, 10); }, true,
        /*valid = */['4', '8', '9', 3],
        /*invalid = */['bla', 'foo', 'bar', '11', '15', 54, '5.5']
    );

    setUpSuite('alphabeticWords', true,
        /*valid = */['hello there', 'something nice', ['array input', 'is cool']],
        /*invalid = */['numb3r', 4, false, ['array input with', '!invalid!members!']]
    );

    setUpSuite(function enumerated(input) { return validation.enumerated(['a', 'b', 'c', '1'], input); }, true,
        /*valid = */['a', 'b', 'c', '1'],
        /*invalid = */['d', 'e', 1]
    );
});
