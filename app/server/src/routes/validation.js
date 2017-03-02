function validateRegex(input, reg) {
    return input !== undefined &&
        input !== null &&
        typeof input === 'string' &&
        reg.test(input);
}

// http://regexr.com/3fb18
let sessionIdRegex = /^[A-Z]{4}\d{2}:\d{8}:\d:\d$/;
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
     * Verifies that the given input can be parsed as an integer. One might
     * assume that we could do something like this:
     *
     *     let whatever = parseInt(req.query.whatever) || defaultValue;
     *
     * but this does not account for the fact that if the user input is '0',
     * JavaScript sees this as a "falsey" value and will use the default value
     * instead.
     *
     * @param  {string} input               Raw string input value
     * @param  {Number} defaultValue        Default value for this integer
     * @param  {Number} [maxValue=Infinity] Maximum value for this integer
     *
     * @return {Number} If the input is not defined or can't be parsed, returns
     *                  the default value. If the input can be parsed and is
     *                  within the given bounds, returns that value. If the
     *                  input is out of the given bounds, returns the value of
     *                  the bound closest to the input.
     */
    integer: function(input, defaultValue, minValue = -Infinity, maxValue = Infinity) {
        // Assume that defaultValue is a positive integer
        let result = defaultValue;

        if (input !== undefined && !isNaN(input)) {
            // Round down to remove decimals
            result = Math.floor(parseInt(input));
        }

        // Bounds checks
        if (result > maxValue)
            result = maxValue;
        if (result < minValue)
            result = minValue;

        return result;
    },
    alphabeticWords: function(input) {
        if (typeof input === 'string') {
            return validateRegex(input, alphabeticWordsRegex)
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
    }
};
