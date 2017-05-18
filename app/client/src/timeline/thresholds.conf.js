// This file defines thresholds for the timline component
module.exports = Object.freeze([
    {
        visibleDomain: Infinity, // whole session is visible
        resolution: 3, // 3% resolution
        nick: 'all'
    },
    {
        visibleDomain: 5 * 60 * 1000, // 5 minutes
        resolution: 100, // 100% resolution
        nick: '5min'
    }
]);
