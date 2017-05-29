const _ = require('lodash');

const queries = require('../../queries');
const responses = require('./responses');

/**
 * Runs a query and sends the result as JSON to the response. Takes input
 * Parameters and if all are valid, passes values to queryFn
 *
 * @param  {[]}        parameters An array of Parameters
 * @param  {function}  queryFn    Query function to execute
 * @param  {object}    res        Express Response object
 * @param  {function}  next       Express 'next' function
 */
module.exports.runQuery = function(parameters, queryFn, res, next, paginated = false, contracts = []) {
    // If any parameter is invalid, reject
    for (const p of parameters) {
        if (p.valid === false) {
            const error = responses.errorObj(p.error);
            return res.status(error.status).json(error);
        }
    }

    for (const contract of contracts) {
        contract.check(parameters);
        if (contract.valid === false) {
            const error = responses.errorObj(contract.error);
            return res.status(error.status).json(error);
        }
    }

    // Call queryFn with the parameter values
    queryFn.apply(null, _.map(parameters, (i) => i.value))
        .then(function(result) {
            // Choose the correct type of response, whether that be a standard
            // success or a paginated success object
            let response;
            if (paginated) {
                // Identify values of start and limit
                const start = _.find(parameters, (p) => p.name === 'start').value;
                const limit = _.find(parameters, (p) => p.name === 'limit').value;
                response = responses.paginatedSuccess(result, limit, start);
            } else {
                response = responses.success(result);
            }
            res.json(response);
        }).catch(function(err) {
            // Handle errors. If the error has a type property, we know it was
            // from a function in the queries module.
            if (err.type) {
                let status;
                if (err.type === queries.ERROR_MISSING)
                    status = 404;
                else if (err.type === queries.ERROR_PAGINATION)
                    // Send 400 Bad Request because the client sent bad data
                    status = 400;

                // Make sure the type was one of the errors already checked for
                if (status !== undefined) {
                    return next(responses.error(err.message, err.data, status));
                }
            }

            // We don't know how to handle this kind of error, send a 500 Internal
            // Server Error.
            return res.status(500).render('error', { error: err });
        });
};

