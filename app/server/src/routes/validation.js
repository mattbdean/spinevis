function validateRegex(input, reg) {
    return input !== undefined &&
        input !== null &&
        typeof input === 'string' &&
        reg.test(input);
}

// http://regexr.com/3frsd
let sessionIdRegex = /^[A-Z]{4}\d{2}:\d{8}:\d:\d:[\w ]+$/;
let partialNameRegex = /^[a-z0-9-]+$/;
// Only letters and spaces for the entire string
let alphabeticWordsRegex = /^[a-zA-Z ]+$/;

module.exports = {
    /**
     * Validates a session ID. Verification is absolute (either it's valid or it isn't)
     */
    sessionId: function(id) {
        return validateRegex(id, sessionIdRegex);
    },
    /**
     * Validates the name of a partial template. Verification is absolute.
     */
    partialName: function(name) {
        return validateRegex(name, partialNameRegex);
    },
    /**
     * Input must be a parseable integer and within the given bounds to return
     * true. If both of these conditions are not met, false is returned
     */
    integer: function(input, minValue = -Infinity, maxValue = Infinity) {
        if (input === undefined || isNaN(input) || parseFloat(input) !== parseInt(input))
            return false;

        let result = parseInt(input, 10);

        return result >= minValue && result <= maxValue;
    },
    alphabeticWords: function(input) {
        if (typeof input === 'string') {
            return validateRegex(input, alphabeticWordsRegex);
        }

        if (Array.isArray(input)) {
            if (input.length === 0)
                return false;

            for (let i of input) {
                if (!validateRegex(i, alphabeticWordsRegex)) {
                    return false;
                }
            }

            // All elements are valid
            return true;
        }

        // Some unknown type
        return false;
    },
    enumerated: function(possibleValues, input) {
        return possibleValues.includes(input);
    },
};
