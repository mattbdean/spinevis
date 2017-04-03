let _ = require('lodash');

let serviceDef = ['$http', function($http) {
    this.baseUrl = '/api/v1/session';

    this.list = function(start = 0, limit = 20) {
        return $http.get(`${this.baseUrl}?start=${start}&limit=${limit}`);
    };

    this.get = function(id) {
        if (id === undefined) return Promise.reject('id must be defined');
        return $http.get(`${this.baseUrl}/${id}`);
    };

    this.behavior = function(id, types) {
        let query = types === undefined ? '' : '?' + _.join(types, ',');
        return $http.get(`${this.baseUrl}/${id}/behavior${query}`);
    };

    this.timeline = function(id, name) {
        // If `names` is not present in the query
        let query = name !== undefined ? '?name=' + name : '';
        return $http.get(`${this.baseUrl}/${id}/timeline${query}`);
    };

    this.volume = function(id, start, end) {
        let query = '?start=' + start;
        if (end !== undefined) query += '&end=' + end;
        return $http.get(`${this.baseUrl}/${id}/volume${query}`);
    };
}];

module.exports = {
    name: 'session',
    def: serviceDef
};
