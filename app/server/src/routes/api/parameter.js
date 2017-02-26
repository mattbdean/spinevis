let validation = require('../validation.js');

function Parameter(name, value, validate, invalidError) {
    this.name = name;
    this.value = value;

    let validationResult = validate(value);
    if (validationResult !== false && validationResult !== true) {
        // Validation function was able to salvage the input into something valid
        this.value = validationResult;
        this.valid = true;
    } else if (validationResult === false) {
        this.valid = false;
    }

    this.error = this.valid ? null : invalidError;
    if (!this.valid) {
        // Add a data key so that this can easily be passed to responses.error()
        this.error.data = {[name]: value};
    }
}

module.exports.Parameter = Parameter;

module.exports.sessionId = function(value) {
    // If the ID isn't valid there the DB is guaranteed to find 0 sessions
    // unless our DB IDs don't adhere to the same validation
    let invalidError = {msg: 'Session not found', status: 404};
    return new Parameter('id', value, validation.sessionId, invalidError);
}
