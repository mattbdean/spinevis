function validateRegex(input, reg) {
    return input !== undefined &&
        input !== null &&
        typeof input === 'string' &&
        reg.test(input);
}

// http://regexr.com/3fb18
let sessionIdRegex = /^[A-Z]{4}\d{2}:\d{8}:\d:\d$/;
let partialNameRegex = /^[a-z0-9-]+$/;

module.exports = {
    sessionId: function(id) {
        return validateRegex(id, sessionIdRegex);
    },
    partialName: function(name) {
        return validateRegex(name, partialNameRegex);
    },
    // One might assume that we could do something like this:
    //
    //     let whatever = parseInt(req.query.whatever) || defaultValue;
    //
    // but this does not account for the fact that if the user input is '0',
    // JavaScript sees this as a "falsey" value and will use the default value
    // instead.
    integer: function(input, defaultValue, maxValue = Infinity) {
        // Assume that defaultValue is a positive integer
        let result = defaultValue;

        if (input !== undefined && !isNaN(input)) {
            // Round down to remove decimals
            result = Math.floor(parseInt(input));
        }

        if (result > maxValue)
            result = maxValue;

        return result;
    }
};
