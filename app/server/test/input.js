let chai = require('chai');
let expect = chai.expect;
let Parameter = require('../src/routes/input/parameter.js');
let Contract = require('../src/routes/input/contract.js');

/**
 * Creates a function that creates a new Parameter with the given configuration.
 * Used in conjunction with expect(constructParameter(config)).to.throw(y) to
 * make tests more readable.
 */
let constructParameter = function(config) {
    return function GeneratedParameterConstructor() {
        new Parameter(config);
    };
};

let forceValid = () => true;
let forceInvalid = () => false;

// Use these two so that there is no chance that when testing,
// conf.defaultValue == rawInput and thus mess up tests
const DEFAULT_VALUE = 'default value';
const RAW_INPUT = 'some input';

/** Creates a minimal Parameter configuration */
let makeConfig = () => ({
    name: 'parameter name',
    rawInput: RAW_INPUT,
    validate: forceValid,
    errorMessage: 'error message',
    errorStatus: 400
});

let expectInvalid = function(p) {
    expect(p.error).to.exist;
    expect(p.value).to.be.null;
    expect(p.valid).to.be.false;
};

let expectValid = function(p) {
    expect(p.error).to.be.null;
    expect(p.valid).to.be.true;

    if (!p.optional) {
        expect(p.value).to.exist;
    }

};

describe('parameter validation', function() {
    describe('Parameter()', function() {
        it('should throw an error when passed no configuration', function() {
            expect(constructParameter()).to.throw(Error);
            expect(constructParameter(null)).to.throw(Error);
        });

        it('should ensure required properties exist', function() {
            let requiredProps = ['name', 'errorMessage', 'validate'];
            // Exclude only one property from the required config to ensure
            // that the exlusion of that property specifically results in an
            // error
            for (let requiredProp of requiredProps) {
                let conf = makeConfig();
                delete conf[requiredProp];
                expect(constructParameter(conf)).to.throw(Error);
            }
        });

        it('should validate config.name', function() {
            // config.name must be a defined, non-null, non-empty string
            let invalidNames = [undefined, null, '', 42];
            for (let invalidName of invalidNames) {
                let conf = makeConfig();
                conf.name = invalidName;
                expect(constructParameter(conf)).to.throw(Error);
            }
        });

        it('should have a null error when valid', function() {
            let conf = makeConfig();
            let p = new Parameter(conf);
            expect(p.name).to.equal(conf.name);
            expect(p.error).to.be.null;
            expect(p.valid).to.be.true;
            expect(p.value).to.equal(conf.rawInput);
        });

        it('should copy error* properties when invalid', function() {
            let conf = makeConfig();
            conf.validate = forceInvalid;
            let p = new Parameter(conf);
            expectInvalid(p);
            expect(p.error.message).to.equal(conf.errorMessage);
            expect(p.error.status).to.equal(conf.errorStatus);
            expect(p.error.data).to.deep.equal({[conf.name]: conf.rawInput});
            expect(p.name).to.equal(conf.name);
        });

        it('should allow for dynamic error messages', function() {
            let conf = makeConfig();
            let generateErrorMessage = function(config) {
                return `'${config.name}' was invalid ('${config.rawInput}')`;
            };
            conf.validate = forceInvalid;
            conf.errorMessage = generateErrorMessage;
            let p = new Parameter(conf);
            expectInvalid(p);
            expect(p.error.message).to.equal(generateErrorMessage(conf));
        });

        it('should use a default value when invalid and default values are allowed', function() {
            let conf = makeConfig();
            conf.defaultAllowed = true;
            conf.defaultValue = DEFAULT_VALUE;
            conf.validate = forceInvalid;
            let p = new Parameter(conf);
            expectValid(p);
            expect(p.value).to.equal(conf.defaultValue);
        });

        it('should allow for optional parameters', function() {
            let conf = makeConfig();
            conf.defaultAllowed = false;
            conf.rawInput = undefined;
            conf.optional = true;

            let p = new Parameter(conf);
            expectValid(p);
        });

        it('should be invalid when rawInput is undefined and the paramter is not optional', function() {
            let conf = makeConfig();
            conf.defaultAllowed = false;
            conf.rawInput = undefined;
            conf.optional = false;

            let p = new Parameter(conf);
            expectInvalid(p);
        });

        it('should ignore defaultValue when defaultAllowed is false', function() {
            let conf = makeConfig();
            // conf.defaultAllowed is false by default
            conf.defaultValue = DEFAULT_VALUE;
            conf.validate = forceInvalid;
            let p = new Parameter(conf);
            expectInvalid(p);
        });

        it('should result in a valid Parameter when validate() returns true', function() {
            let p = new Parameter(makeConfig());
            // makeConfig().validate defaults to forceValid
            expectValid(p);
        });

        it('should allow validate to sanitize raw input', function() {
            let conf = makeConfig();
            let initialValue = 'initial value';
            let finalValue = 'final value';
            conf.rawInput = initialValue;

            conf.validate = function(input) {
                // this function should run twice, the first with input equaling
                // initialInput, then a second time equaling finalValue.
                if (input === initialValue) return finalValue;
                if (input === finalValue) return true;
            }

            let p = new Parameter(conf);
            expectValid(p);
            expect(p.value).to.equal(finalValue);
        });

        it('should throw an error when validate() is run more than allowed', function() {
            let conf = makeConfig();
            let counter = 0;
            conf.validateCycleLimit = 5;
            conf.validate = function(input) {
                // Could return any non-boolean value. Since this function will
                // never return a boolean value, Parameter() will call it
                // a predefined amount of times and then give up
                counter++;
                return 42;
            };

            expect(constructParameter(conf)).to.throw(Error);
            expect(counter).to.equal(conf.validateCycleLimit);
        });

        it('should trim only when requested', function() {
            let conf = makeConfig();
            conf.array = true;
            conf.rawInput = '1, 2, 3, 4';
            conf.arrayTrim = false;

            let p = new Parameter(conf);
            expectValid(p);
            expect(p.value).to.deep.equal(['1', ' 2', ' 3', ' 4']);


            let conf2 = makeConfig();
            conf2.array = true;
            conf2.rawInput = '1, 2, 3, 4';
            conf2.arrayTrim = true;

            let p2 = new Parameter(conf2);
            expectValid(p2);
            expect(p2.value).to.deep.equal(['1', '2', '3', '4']);
        });

        it('should not preprocess if rawInput is undefined', function() {
            let conf = makeConfig();
            conf.rawInput = undefined;
            conf.preprocess = () => {
                throw new Error('should not have been preprocess()\'d');
            };

            expect(constructParameter(conf)).to.not.throw(Error);
        });

        it('should preprocess the input value when given a preprocess function', function() {
            let conf = makeConfig();
            let overridenValue = 42;
            conf.preprocess = (input) => overridenValue;
            // makeConfig().validate defaults to forceValid

            let p = new Parameter(conf);
            expectValid(p);
            expect(p.value).to.equal(overridenValue);
        });

        it('should preprocess every value in the array when rawInput is an array', function() {
            let conf = makeConfig();
            let overridenValue = 42;
            conf.array = true;
            conf.rawInput = '1,2,3,4';
            conf.preprocess = (input) => overridenValue;

            let p = new Parameter(conf);
            expect(p.value).to.deep.equal([42, 42, 42, 42]);
        });

        it('should postprocess when the parameter is valid', function() {
            let conf = makeConfig();
            let overridenValue = 42;
            conf.postprocess = (input) => overridenValue;

            let p = new Parameter(conf);
            expect(p.value).to.equal(overridenValue);
        });

        it('should not postprocess when parameter is invalid', function() {
            let conf = makeConfig();
            let overridenValue = 42;
            conf.postprocess = (input) => { throw Error(input); };
            conf.validate = forceInvalid;

            // If postprocess is called, then it will throw an error
            expect(constructParameter(conf)).to.not.throw(Error);
            let p = new Parameter(conf);
            expectInvalid(p);
        });
    });

    describe('Contract()', function() {
        let makeValidParameter = function(name) {
            let conf = makeConfig();
            conf.name = name;
            return new Parameter(conf);
        };

        it('should not produce an error when not broken', function() {
            let p1 = makeValidParameter('a');
            let p2 = makeValidParameter('b');
            let contract = new Contract({
                p1Name: p1.name,
                p2Name: p2.name,
                verify: forceValid,
                messageOnBroken: 'broken'
            });
            contract.apply([p1, p2]);

            expect(contract.error).to.be.undefined;
            expect(contract.valid).to.be.true;
        });

        it('should produce an error when broken', function() {
            let p1 = makeValidParameter('a');
            let p2 = makeValidParameter('b');
            let errMsg = 'test';
            let errStatus = 404;
            let contract = new Contract({
                p1Name: p1.name,
                p2Name: p2.name,
                verify: forceInvalid,
                messageOnBroken: errMsg,
                statusOnBroken: errStatus
            });

            contract.apply([p1, p2]);

            expect(contract.error).to.deep.equal({
                msg: errMsg,
                status: errStatus,
                data: {
                    [p1.name]: p1.value,
                    [p2.name]: p2.value
                }
            });
            expect(contract.valid).to.be.false;
        });
    });
});
