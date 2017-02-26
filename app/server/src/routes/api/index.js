/**
 * api module -- lets the user communicate with the server using a JSON API.
 */

let express = require('express');
let router = express.Router();

/**
 * Instantiates an Express Router that handles API endpoints.
 *
 * @param errorLogger Optional logging function that is called when an API error
 *                    is received.
 */
module.exports = function(errorLogger = () => {}) {
    // Define a list of API modules to load into the router. All modules will be
    // mounted at the API root and will be require'd from this directory.
    let apiModules = ['session'];
    for (let mod of apiModules) {
        router.use(`/${mod}`, require(`./${mod}.js`));
    }

    // Error handling
    router.use('/', function(err, req, res, next) {
        let status = err.status || 500;
        res.status(status);
        res.send(err);

        // 4XX errors are to be expected, 5XX we need to see
        if (status === 500)
            errorLogger(err);
    });

    return router;
};
