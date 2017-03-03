let assert = require('assert');
let param = require('../src/routes/api/parameter.js');
let Parameter = param.Parameter;
let Contract = param.Contract;

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

let makeValidParameter = function(name, value = 0) {
    return new Parameter(name, value, forceValid, blankErrorObj());
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
            assert.strictEqual(p.error, undefined);
        });

        it('should allow final modification to a validated input', function() {
            let p = new Parameter('p', '42', forceValid, blankErrorObj(), (value) => parseInt(value, 10));
            assert.strictEqual(p.name, 'p');
            assert.strictEqual(p.value, 42);
            assert.strictEqual(p.valid, true);
            assert.strictEqual(p.error, undefined);
        });
    });

    describe('Contract()', function() {
        it('should not produce an error when not broken', function() {
            let p1 = makeValidParameter('a');
            let p2 = makeValidParameter('b');
            let contract = new Contract(p1.name, p2.name, forceValid);
            contract.apply([p1, p2]);

            assert.strictEqual(contract.error, undefined);
            assert.strictEqual(contract.valid, true);
        });

        it('should produce an error when broken', function() {
            let p1 = makeValidParameter('a');
            let p2 = makeValidParameter('b');
            let errMsg = 'test';
            let contract = new Contract(p1.name, p2.name, forceInvalid, errMsg);
            contract.apply([p1, p2]);

            assert.deepStrictEqual(contract.error, {
                msg: errMsg,
                status: 400,
                data: {
                    [p1.name]: p1.value,
                    [p2.name]: p2.value
                }
            });
            assert.strictEqual(contract.valid, false);
        });
    });
});
