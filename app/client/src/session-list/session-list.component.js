let util = require('../core/util.js');
let sessionApi = require('../core/session.js');
let moment = require('moment');
let numeral = require('numeral');
let _ = require('lodash');

let ctrlDef = ['$http', 'Title', function($http, Title) {
    // Use base title
    Title.useBase();

    let session = sessionApi($http);
    let $ctrl = this;

    session.list().then(function(response) {
        let sessions = response.data.data;

        // Mutate data from server so we can plop these data pretty much right
        // into the view
        for (let i = 0; i < sessions.length; i++) {
            let s = sessions[i];

            // Add new property 'duration', difference between start and end
            // time formatted in the format 'h:mm'
            sessions[i].duration = util.format.duration(s.start_time, s.end_time);
            // Format start time as a date, eg. 6 January 2016
            sessions[i].start_time = util.format.date(s.start_time);
            // Reduce the amount of significant figures in nSamples, format with
            // 'k' at end. "54645" => "55k"
            sessions[i].nSamples = numeral(s.nSamples).format('0a');
            // Reduce to one decimal place and add units
            sessions[i].volRate = numeral(s.volRate).format('0.0') + ' Hz';
        }

        $ctrl.sessions = sessions;
    });
}];

module.exports = {
    templateUrl: '/partial/session-list',
    controller: ctrlDef
};
