let _ = require('lodash');

/**
 * Instantiates a new Parameter. Validates input on call.
 * @param {string} config.name
 * @param {object} config.rawInput
 * @param {boolean} [config.optional=false] If truthy, marks this parameter as
 *                     not required. If rawInput is undefined, this parameter
 *                     will be valid.
 * @param {boolean} [config.array=false] If truthy, the value of this parameter
 *                     is meant to be treated as an array.
 * @param {string} [config.arraySeparator=","] If config.array, will split() the
 *                     value by this string
 * @param {string} [config.arrayTrim=true] If config.array, will trim() every
 *                     element after splitting.
 * @param {string|function} config.errorMessage A message to be shown to the
 *                     user if this parameter is invalid. May be a function that
 *                     takes the configuration as its parameter.
 * @param {number} [config.errorStatus=400] Recommend HTTP status code to send
 *                     the client if this parameter is invalid.
 * @param {boolean} [config.defaultAllowed=false] If the input could not be
 *                     validated, the value of [config.defaultValue] will be
 *                     used instead.
 * @param {*} [config.defaultValue=null] The value used if input for this
 *                     parameter is invalid or undefined.
 * @param {function} config.validate If this function returns true (such that
 *                     config.validate(value) === true) this parameter is
 *                     considered valid. Similarly, this function returning
 *                     false (such that config.validate(value) === false), this
 *                     parameter is considered invalid. If this function returns
 *                     a non-boolean value, the value of this parameter is set
 *                     to the resulting value of this function. This cycle
 *                     repeats until this function returns a boolean value with
 *                     the new value or this function is called
 *                     [config.validateCycleLimit] times, at which point the
 *                     parameter is considered invalid.
 * @param {function} config.preprocess A one-argument function that takes the
 *                     value of the parameter, or each element of the array if
 *                     config.array is truthy. (optional)
 * @param {function} config.postprocess Similar to config.preprocess, but is
 *                     called only after a successful validation. (optional)
 * @param {number} [config.validateCycleLimit=2] See [config.validate]
 *
 * @property {string} name Copied directly from config.name
 * @property {*} value If valid, the validated input. Null if the input was
 *                     invalid. Undefined if the optional and rawInput was as
 *                     well.
 * @property {boolean} valid
 * @property {boolean} optional
 * @property {object} error Null if valid
 * @property {string} error.message Copied from config.errorMessage
 * @property {number} error.code Copied from config.errorStatus
 * @property {object} error.data Object with one property whose key is the name
 *                               of the parameter and whose value is the value
 *                               of the parameter
 */
module.exports = function Parameter(config) {
    let c = sanitizeConfig(config);
    let rawInput = config.rawInput;

    let value, error, valid;

    if (rawInput === undefined) {
        if (config.defaultAllowed) {
            // Use the default value straight away
            valid = true;
            value = config.defaultValue;
            error = null;
        } else if (config.optional) {
            // Using a default value is not allowed, but this parameter is
            // optional. No error, but also no value.
            valid = true;
            value = undefined;
            error = null;
        } else {
            // Not optional and default not allowed, thus the parameter is not
            // valid
            valid = false;
            value = null;
            error = createError(config, config.name + ' is required');
        }
    } else {
        // rawInput is defined at this point

        // Make rawInput into an array
        if (c.array) {
            rawInput = rawInput.split(c.arraySeparator);
            if (c.arrayTrim) {
                rawInput = _.map(rawInput, el => el.trim());
            }
        }

        // Preprocess the input
        rawInput = applyTo(rawInput, c.preprocess);

        [value, error, valid] = validate(rawInput, c.validate, c);

        // Try to recover
        if (!valid && c.defaultAllowed) {
            valid = true;
            value = c.defaultValue;
            error = null;
        }

        if (valid) {
            // Postprocess the input only if valid
            value = applyTo(value, c.postprocess);
        }
    }

    this.name = c.name;
    this.optional = !!c.optional;
    this.valid = valid;
    this.value = value;
    this.error = error;
};

let validate = function(input, fn, config) {
    let value, error, valid;

    let result, prevInput = input, tries = 0;

    for (;;) {
        result = fn(prevInput);
        if (result === true) {
            // valid
            value = prevInput;
            valid = true;
            error = null;
            break;
        } else if (result === false) {
            // invalid
            value = null;
            valid = false;
            error = createError(config, findErrorMessage(config));
            break;
        } else {
            if (++tries >= config.validateCycleLimit) {
                throw new Error(`Could not validate ${config.name} in ` +
                    `${config.validateCycleLimit} attempts`);
            }
            prevInput = result;
        }
    }

    return [value, error, valid];
};

let applyTo = function(input, fn) {
    let out;
    if (Array.isArray(input)) {
        out = [];
        for (let i = 0; i < input.length; i++) {
            out[i] = fn(input[i]);
        }
    } else {
        out = fn(input);
    }

    return out;
};

let createError = function(config, msg) {
    return {
        message: msg,
        status: config.errorStatus,
        data: {[config.name]: config.rawInput}
    };
};

let findErrorMessage = function(config) {
    let errMsg = config.errorMessage;
    // errMsg is a function, call it with rawInput and param
    if (typeof errMsg === 'function')
        // Create a shallow copy so we don't let the user mutate the
        // configuration before Parameter() has finished
        return errMsg(shallowCopy(config, allProperties));
    // errMsg is a normal value
    return errMsg;
};

let sanitizeConfig = function(config) {
    if (config === undefined || config === null)
        throw new Error('expecting a configuration');
    let c = fillConfig(config);

    let invalidProperty = findInvalidProperty(c);
    if (invalidProperty !== undefined) {
        throw new Error(`config.${invalidProperty} was missing or invalid`);
    }

    return c;
};

let shallowCopy = function(obj, keys) {
    let copy = {};

    for (let key of keys) {
        copy[key] = obj[key];
    }

    return copy;
};

let findInvalidProperty = function(config) {
    // name must be a defined, non-null, non-empty string
    let name = config.name;
    if (name === undefined || name === null || name === '' || typeof name !== 'string') return 'name';
    // rawInput can be undefined, but it cannot be null
    let inType = typeof config.rawInput;
    if (!(inType === 'undefined' || inType === 'string')) return 'rawInput';
    // optional, array, arrayTrim, and defaultAllowed are since we only use
    // it as a falsey or truthy value
    // errorStatus must be a number
    if (config.errorStatus === undefined || typeof config.errorStatus !== 'number')
        return 'errorStatus';
    // errorMessage needs to be defined
    if (config.errorMessage === undefined) return 'errorMessage';
    // defaultValue can be anything (including undefined), so no validation
    // arraySeparator must be a defined string only if config.array is truthy
    let sep = config.arraySeparator;
    if (config.array && (sep === undefined || typeof sep !== 'string'))
        return 'arraySeparator';
    // validate must be a defined function
    let validate = config.validate;
    if (validate === undefined || typeof validate !== 'function')
        return 'validate';
    // preprocess and postprocess are optional functions
    if (config.preprocess !== undefined)
        if (typeof config.preprocess !== 'function')
            return 'preprocess';
    if (config.postprocess !== undefined)
        if (typeof config.postprocess !== 'function')
            return 'postprocess';
    // validateCycleLimit must be a positive number
    let lim = config.validateCycleLimit;
    if (typeof lim !== "number" || lim < 0)
        return 'validateCycleLimit';
};

let defaultValues = {
    array: false,
    arraySeparator: ',',
    arrayTrim: true,
    errorStatus: 400,
    defaultAllowed: false,
    defaultValue: null,
    optional: false,
    postprocess: _.identity,
    preprocess: _.identity,
    rawInput: undefined,
    validateCycleLimit: 2
};

let optionalProperties = Object.keys(defaultValues);

let allProperties = [
    'name', 'rawInput', 'optional', 'array', 'arrayTrim', 'errorMessage',
    'errorStatus', 'defaultAllowed', 'defaultValue', 'arraySeparator',
    'validate', 'preprocess', 'postprocess', 'validateCycleLimit'
];

let fillConfig = function(config) {
    let newConf = shallowCopy(config, allProperties);
    for (let propName of optionalProperties) {
        if (newConf[propName] === undefined)
            newConf[propName] = defaultValues[propName];
    }

    return newConf;
};
