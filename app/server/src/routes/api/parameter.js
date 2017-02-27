let validation = require('../validation.js');

function Parameter(name, value, validate, invalidError) {
    this.name = name;
    this.value = value;

    let validationResult = validate(value);
    // We know it's invalid
    if (validationResult === false) {
        this.valid = false;
    } else if (validationResult === true) {
        this.valid = true;
    } else {
        // validationResult is a non-boolean value, meaning that the validation
        // function has salvaged the input
        this.valid = true;
        this.value = validationResult;
    }
    
    if (!this.valid) {
        this.error = invalidError;
        // Add a data key so that this can easily be passed to responses.errorObj()
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
