let events = [
    // Metadata has beeen loaded
    'META_LOADED',
    // A component has been initialized
    'INITIALIZED',
    // Emitted up from timeline when the user selects a new timepoint
    'DATA_FOCUS_CHANGE_NOTIF',
    // Broadcasted back down from session-vis in response to DATA_FOCUS_CHANGE_NOTIF
    'DATA_FOCUS_CHANGE'
];

let eventMap = {};

for (let e of events) {
    eventMap[e] = e.toLowerCase();
}

module.exports = eventMap;
