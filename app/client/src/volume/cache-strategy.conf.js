module.exports = Object.freeze({
    // The ideal amount of padding on either side of the requested index. This
    // service will continue to run until this is satisified.
    idealPadding: 50,

    // How many tasks will run at a time. See
    // https://caolan.github.io/async/docs.html#queue for more
    queueConcurrency: 3,

    // The amount of milliseconds to wait after receiving the last request to
    // start buffering more data
    enqueueDelay: 1000,

    // The maximum amount of data in the cache
    maxCacheLength: 1000
});
