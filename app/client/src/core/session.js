let _ = require('lodash');

module.exports = function($http) {
    return new SessionApiImpl($http);
};

class SessionApiImpl {
    constructor($http) {
        this.$http = $http;
        this.baseUrl = '/api/v1/session';
    }

    list(start = 0, limit = 20) {
        return this.$http.get(`${this.baseUrl}?start=${start}&limit=${limit}`);
    }

    get(id) {
        if (id === undefined) return Promise.reject('id must be defined');
        return this.$http.get(`${this.baseUrl}/${id}`);
    }

    behavior(id, types) {
        let query = types === undefined ? '' : '?' + _.join(types, ',');
        return this.$http.get(`${this.baseUrl}/${id}/behavior${query}`);
    }

    timeline(id, name) {
        // If `names` is not present in the query
        let query = name !== undefined ? '?name=' + name : '';
        return this.$http.get(`${this.baseUrl}/${id}/timeline${query}`);
    }

    volume(id, start, end) {
        let query = '?start=' + start;
        if (end !== undefined) query += '&end=' + end;
        return this.$http.get(`${this.baseUrl}/${id}/volume${query}`);
    }
}
