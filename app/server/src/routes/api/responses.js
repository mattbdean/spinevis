exports.ApiSuccess = function(data, httpCode = 200) {
    return {
        status: httpCode,
        data: data
    };
};

exports.ApiError = function(errMsg = 'Unable to execute request', errData = {}, httpCode = 500) {
    return {
        status: httpCode,
        error: {
            msg: errMsg,
            data: errData
        }
    }
}
