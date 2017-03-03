let _ = require('lodash');
let validation = require('../validation.js');

function Parameter(name, value, validate, invalidError, alterValidResult = (value) => value) {
    this.name = name;
    this.value = value;

    let validationResult = validate(value);
    // We know it's invalid
    if (validationResult === false) {
        this.valid = false;
    } else if (validationResult === true) {
        this.valid = true;
        this.value = alterValidResult(this.value);
    } else {
        // validationResult is a non-boolean value, meaning that the validation
        // function has salvaged the input
        this.valid = true;
        this.value = alterValidResult(validationResult);
    }

    if (!this.valid) {
        this.error = invalidError;
        // Add a data key so that this can easily be passed to responses.errorObj()
        this.error.data = {[name]: value};
    }
}

module.exports.sessionId = function(value) {
    // If the ID isn't valid there the DB is guaranteed to find 0 sessions
    // unless our DB IDs don't adhere to the same validation
    let invalidError = {msg: 'Session not found', status: 404};
    return new Parameter('id', value, validation.sessionId, invalidError);
};

module.exports.integerStrict = function(name, value, minValue = -Infinity, maxValue = Infinity) {
    let invalidError = {
        msg: `${name} must be an integer between [${minValue} and ${maxValue}]`,
        status: 400
    };
    return new Parameter(name, value,
        // Validate using integerStrict
        (paramVal) => validation.integerStrict(value, minValue, maxValue),
        invalidError,
        // Parse as base 10 integer after validating
        (validatedVal) => parseInt(value, 10)
    )
}

module.exports.defaultValue = function(name, value) {
    return new Parameter(name, value,
        // Default value parameters are assumed to be valid
        () => true,
        {msg: 'you shouldn\'t ever see this', status: 418}
    );
}

/**
 * Defines a contract between two parameters.
 *
 * @param {string} p1Name               First parameter name
 * @param {string} p2Name               Second parameter name
 * @param {function} verify             Checks if the contract between the two
 *                                      parameters have been broken
 * @param {string} messageOnBroken      Error message the API will send if the
 *                                      contract is broken
 * @param {Number} [statusOnBroken=400] HTTP status the API will send if the
 *                                      contract is broken
 */
function Contract(p1Name, p2Name, verify, messageOnBroken, statusOnBroken = 400) {
    this.p1Name = p1Name;
    this.p2Name = p2Name;
    this.valid = undefined; // don't know if it's valid or not yet

    this.apply = function(params) {
        let p1 = _.find(params, p => p.name === this.p1Name);
        if (p1 === null)
            throw new Error(`could not find parameter '${this.p1Name}'`)

        let p2 = _.find(params, p => p.name === this.p2Name);
        if (p2 === null)
            throw new Error(`could not find parameter '${this.p2Name}'`)

        this.valid = verify(p1.value, p2.value);
        if (!this.valid) {
            this.error = {
                msg: messageOnBroken,
                status: statusOnBroken,
                data: {
                    [p1Name]: p1.value,
                    [p2Name]: p2.value
                }
            }
        }
    };
}

module.exports.Parameter = Parameter;
module.exports.Contract = Contract;
