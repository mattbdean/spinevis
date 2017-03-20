let validation = require('./validation.js');
let Parameter = require('./parameter.js');
let Contract = require('./contract.js');

module.exports.Parameter = Parameter;
module.exports.Contract = Contract;
module.exports.validation = validation;

module.exports.integer = function(name, input, defaultValue, min, max) {
    return new Parameter({
        name: name,
        rawInput: input,
        validate: (input) => validation.integer(input, min, max),
        defaultAllowed: true,
        defaultValue: defaultValue,
        errorMessage: function(config) {
            return `${config.name} must be an integer in the range [${min}, ${max}]`;
        }
    });
};

module.exports.sessionId = function(input) {
    return new Parameter({
        name: 'id',
        rawInput: input,
        validate: validation.sessionId,
        errorMessage: 'Session not found',
        errorStatus: 404
    });
};
