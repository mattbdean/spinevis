const BASE = 'spinevis';

let factoryDef = ['$window', function($window) {
    /**
     * Sets the document's title (using $window.document.title). For example:
     * `Title.set('hello')` will change the title of the tab to
     * "spinevis | hello". If `where` is undefined, only the app name will be
     * shown: `Title.set()` results in a title of "spinevis".
     *
     * @param {*} where
     */
    let set = (where) => {
        let title = BASE;

        if (where !== undefined) {
            title += ' | ' + where;
        }

        $window.document.title = title;
    };

    /**
     * Sets the title to the base. Equivalent to calling `Title.set()`.
     */
    let useBase = () => { set(); };

    return {
        useBase: useBase,
        set: set
    };
}];

module.exports = {
    name: 'Title',
    def: factoryDef
};
