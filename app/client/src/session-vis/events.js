let events = [
    // Metadata has beeen loaded
    'META_LOADED',
    // A component has been initialized
    'INITIALIZED',
    // Sent to notify sibling scopes. Data must be an object with a 'type'
    // property (one of the values in this array) and a 'data' property of
    // any type
    'SIBLING_NOTIF',
    // Sent when the the user has settled on a point in the timeline
    'DATA_FOCUS_CHANGE',
    // The user has enabled or disabled a trace from the mask-toggles component
    'MASK_TOGGLED',

    ////////////////////////////////////////////////////////////////////////////
    // Settings
    ////////////////////////////////////////////////////////////////////////////
    'SET_THRESHOLD',
    'SET_OPACITY'
];

let eventMap = {};

for (let e of events) {
    eventMap[e] = e;
}

module.exports = eventMap;
