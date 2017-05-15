const validation = require('../src/routes/validation.js');
const expect = require('chai').expect;

const setUpSuite = function(validationFn, strict, validInput, invalidInput) {
    if (typeof validationFn === 'string') {
        validationFn = validation[validationFn];
    }

    describe(validationFn.name, function() {
        it('should recognize valid input', function() {
            for (const valid of validInput) {
                if (strict) {
                    expect(validationFn(valid)).to.equal(true,
                        `${valid} was unexpectedly invalid`);
                } else {
                    expect(validationFn(valid)).to.equal(true,
                        `${valid} was unexpectedly invalid`);
                }
            }
        });
        it('should reject invalid input', function() {
            for (const invalid of invalidInput) {
                if (strict) {
                    expect(validationFn(invalid)).to.equal(false,
                        `${invalid} was unexpectedly valid`);
                } else {
                    expect(validationFn(invalid)).to.equal(false,
                        `${invalid} was unexpectedly valid`);
                }
            }
        });
    });
};

describe('input validation', function() {
    setUpSuite('sessionId', true,
        /*valid = */['BMWR34:20160106:1:1:some name here', 'BMWR30:20151123:2:1:my_1_cool_2_name'],
        /*invalid = */['SOMETHING:DATE:FOV', 'invalid', '12345:20160601:1:1', 'ABCDEF:20160106:1:1']
    );

    setUpSuite('partialName', true,
        /*valid = */['something', 'something-else0'],
        /*invalid = */['invalid!character', '__file__']
    );

    setUpSuite(function integer(input) { return validation.integer(input, 0, 10); }, true,
        /*valid = */['4', '8', '9', 3],
        /*invalid = */['bla', 'foo', 'bar', '11', '15', 54, '5.5']
    );

    setUpSuite('alphabeticWords', true,
        /*valid = */['hello there', 'something nice'],
        /*invalid = */['numb3r', 4, false]
    );

    setUpSuite(function enumerated(input) { return validation.enumerated(['a', 'b', 'c', '1'], input); }, true,
        /*valid = */['a', 'b', 'c', '1'],
        /*invalid = */['d', 'e', 1]
    );
});
