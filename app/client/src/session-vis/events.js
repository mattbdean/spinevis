const events = [
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
    'MASK_TOGGLED'
];

// Dynamically create events for visual settings. Each control group (tab) has
// controls that require an event when changed.
const controlGroups = ['MASKS', 'RAW_DATA'];
const controlNames = ['THRESHOLD', 'OPACITY'];

for (let controlGroup of controlGroups) {
    for (let controlName of controlNames) {
        events.push(`SET_${controlName}_${controlGroup}`);
    }
}

let eventMap = {};

for (let e of events) {
    eventMap[e] = e;
}

module.exports = eventMap;
