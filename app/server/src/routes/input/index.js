let validation = require('./validation.js');
let Parameter = require('./parameter.js');
let Contract = require('./contract.js');

module.exports.Parameter = Parameter;
module.exports.Contract = Contract;
module.exports.validation = validation;

let parseBase10Int = (input) => parseInt(input, 10);

/**
 * Returns a basic Parameter configuration for an integer input. Will be parsed
 * as a base 10 integer after validation through `postprocess`
 *
 * @param  {string} name  Set to config.name
 * @param  {string} input Set to config.rawInput
 * @param  {number} min   Minimum value, defaults to -Infinity
 * @param  {number} max   Maximum value
 * @return {object}       A basic parameter configuration suitable for integer
 *                        input.
 */
module.exports.integer = function(name, input, min, max) {
    return {
        name: name,
        rawInput: input,
        validate: (input) => validation.integer(input, min, max),
        errorMessage: function(config) {
            return `${config.name} must be an integer in the range [${min}, ${max}]`;
        },
        postprocess: parseBase10Int
    };
};

/**
 * Returns a Parameter object that will validate a session ID
 *
 * @param  {string} input Set to config.rawInput
 */
module.exports.sessionId = function(input) {
    return new Parameter({
        name: 'id',
        rawInput: input,
        validate: validation.sessionId,
        errorMessage: 'Session not found',
        errorStatus: 404
    });
};
