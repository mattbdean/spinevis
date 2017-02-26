/**
 * responses.js -- functions to generate standard API response bodies
 */

exports.success = function(data, httpCode = 200) {
    return {
        status: httpCode,
        data: data
    };
};

exports.paginatedSuccess = function(data, limit, start, httpCode = 200) {
    let size = 1; // Assume length of 1 unless data is array
    if (Array.isArray(data)) {
        size = data.length;
    }

    return {
        status: httpCode,
        size: size,
        start: start,
        data: data
    };
};

exports.errorObj = function(err) {
    return exports.error(err.msg, err.data, err.status);
}

exports.error = function(errMsg = 'Unable to execute request', errData = {}, httpCode = 500) {
    return {
        status: httpCode,
        error: {
            msg: errMsg,
            data: errData
        }
    };
};
