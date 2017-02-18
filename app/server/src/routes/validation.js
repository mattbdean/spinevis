function validateRegex(input, reg) {
    return input !== undefined &&
        input !== null &&
        typeof input === 'string' &&
        reg.test(input);
}

// http://regexr.com/3fb18
let trialIdRegex = /^[A-Z]{4}\d{2}:\d{8}:\d:\d$/;
let partialNameRegex = /^[a-z0-9-]+$/;

module.exports = {
    trialId: function(id) {
        return validateRegex(id, trialIdRegex);
    },
    partialName: function(name) {
        return validateRegex(name, partialNameRegex);
    }
};
