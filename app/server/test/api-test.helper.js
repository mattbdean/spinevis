const expect = require('chai').expect;
const request = require('supertest');

module.exports = function RequestContext(app) {
    this.app = app;

    /**
     * Uses supertest to executes a request against the server based on the
     * given spec
     * @param conf.method HTTP request method ('GET', 'POST', etc.)
     * @param conf.relPath Path relative to '/api/v1'
     * @param conf.expectedStatus Expected HTTP status code (200, 404, etc.)
     * @param conf.validate [optional] Validate the content of the API response.
     *          Passes the `error` property if expectedStatus isn't 2XX,
     *          otherwise passes the `data` property.
     * @param conf.query [optional] An object mapping query parameter names to values
     * @param conf.data [optional] Data to send in the request body
     */
    this.spec = (conf) => {
        return request(this.app)
            // get(path), post(path), put(path), etc.
            /* eslint-disable no-unexpected-multiline */
            [(conf.method || 'GET').toLowerCase()]('/api/v1' + conf.relPath)
            /* eslint-enable no-unexpected-multiline */
            // Add a query string if applicable
            .query(conf.query)
            // Let the server know we want JSON
            .set('Accept', /application\/json/)
            // Send our data, if applicable
            .send(conf.data)
            // Expect a JSON response
            .expect('Content-Type', /application\/json/)
            // Make sure the server returned the expected status
            .expect(conf.expectedStatus)
            .then((res) => {
                // Verify the shape of the response as well as its
                this.verifyResponse(res.body, conf.expectedStatus);
                if (conf.validate)
                    // Validate data if expected status is 2XX, otherwise
                    // validate the error
                    conf.validate(conf.expectedStatus >= 200 && conf.expectedStatus < 300 ?
                        res.body.data : res.body.error);

                // Return the response object so that it can be chained for
                // further testing if needed
                return res;
            });
    };

    /** Sends a basic API request  */
    this.basic = (relPath, expectedStatus, validate) => this.spec({
        method: 'GET',
        relPath,
        expectedStatus,
        validate
    });

    this.verifyResponse = (response, expectedStatus) => {
        expect(response, 'response was null or undefined').to.exist;
        expect(response.status).to.equal(expectedStatus, 'unexpected status property value');

        if (expectedStatus >= 200 && expectedStatus < 300) {
            // Success
            expect(response.data, 'data did not exist on successful response').to.exist;
            expect(response.error, 'error existed on successful response').to.not.exist;
        } else {
            // Fail
            expect(response.data, 'data existed on unsuccessful response').to.not.exist;
            expect(response.error, 'error did not exist on unsuccessful response').to.exist;
        }
    };
};
