let assert = require('assert');
let param = require('../src/routes/api/parameter.js');
let Parameter = param.Parameter;

let forceInvalid = function() {
    return false;
};

let forceValid = function() {
    return true;
};

let simulateFixingInput = function() {
    return 'non-boolean value';
}

let blankErrorObj = function() {
    return {
        msg: null,
        status: -1,
    };
};

describe('parameter validation', function() {
    describe('Parameter()', function() {
        it('should contain a name, value, and valid properties when valid', function() {
            let p = new Parameter('p', 0, forceValid, blankErrorObj());
            assert.equal(p.name, 'p');
            assert.equal(p.value, 0);
            assert.strictEqual(p.valid, true);
            assert.strictEqual(p.error, undefined);
        });

        it('should also contain an error property when invalid', function() {
            let p = new Parameter('p', 0, forceInvalid, blankErrorObj());
            assert.equal(p.name, 'p');
            assert.equal(p.value, 0);
            assert.strictEqual(p.valid, false)
            assert.ok(p.error !== undefined);
            assert.deepStrictEqual(p.error, {msg: null, status: -1, data: {'p': 0}});
        });

        it('should allow for validation methods to "fix" input', function() {
            let p = new Parameter('p', 0, simulateFixingInput, blankErrorObj());
            assert.equal(p.name, 'p');
            assert.equal(p.value, simulateFixingInput());
            assert.strictEqual(p.valid, true);
            assert.strictEqual(p.error, undefined)
        });
    });
});
