const _ = require('lodash');

const serviceDef = ['$http', function($http) {
    this.baseUrl = '/api/v1/session';

    // /api/v1/session
    this.list = (start = 0, limit = 20, startDate = undefined, endDate = undefined, animal = undefined) => {
        return sendRequest('', {
            start: start,
            limit: limit,
            startDate: startDate,
            endDate: endDate,
            animal: animal
        });
    };

    // /api/v1/session/dates
    this.dates = () => {
        return sendRequest('/dates');
    };

    // /api/v1/session/:id
    this.get = (id) => {
        ensureId(id);
        return sendRequest(`/${id}`);
    };

    // /api/v1/session/:id/behavior
    this.behavior = (id, types) => {
        ensureId(id);
        return sendRequest(`/${id}/behavior`, {
            types: types === undefined ? undefined : _.join(types, ',')
        });
    };

    // /api/v1/session/:id/timeline
    this.timeline = (id, traceId) => {
        ensureId(id);
        let path = `/${id}/timeline`;
        if (traceId !== undefined)
            path += '/' + traceId;

        return sendRequest(path);
    };

    // /api/v1/session/:id/volume/:index
    this.volume = (id, index) => {
        ensureId(id);
        return $http({
            url: `${this.baseUrl}/${id}/volume/${index}`,
            method: 'GET',
            responseType: 'arraybuffer'
        });
    };

    const ensureId = (id) => {
        if (id === undefined || id === null) throw new Error('id must exist');
    };

    /**
     * Uses AngularJS' $http service to send a request to the API.
     * @param  {string} relativeUrl The URL relative to the host, for example,
     *                              '/api/v1/foo/bar'
     * @param  {object} queryParams An object to be concatenated together to
     *                              form a query string. May be null or undefined
     * @return {Promise}            A Promise that resolves with the response
     *                              data
     */
    const sendRequest = (relativeUrl, queryParams) => {
        let relUrl = relativeUrl.trim();
        if (relUrl[0] !== '/') relUrl = '/' + relUrl;
        return $http.get(`${this.baseUrl}${relUrl}${createQuery(queryParams)}`);
    };

    /**
     * Creates a query string based on the given object
     * @param  {object} paramObj An object detailing all parameters to send as a
     *                           query string. May be null or undefined.
     * @return {string}            A query string that can be plopped at the end
     *                             of a relative URL. Will start with '?' if
     *                             applicable
     */
    const createQuery = (paramObj) => {
        if (paramObj === undefined || paramObj === null) return '';
        if (typeof paramObj !== 'object')
            throw new Error('expecting paramObj to be an object');

        // Filter out all properties whose value is undefined
        const usableProps = _.filter(Object.keys(paramObj), (key) => paramObj[key] !== undefined);
        if (usableProps.length === 0) return '';

        let query = '?';
        for (let i = 0; i < usableProps.length; i++) {
            if (i !== 0) query += '&';
            query += usableProps[i] + '=' + paramObj[usableProps[i]];
        }

        return query;
    };
}];

module.exports = {
    name: 'session',
    def: serviceDef
};
