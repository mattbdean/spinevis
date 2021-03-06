module.exports = {
    parserOptions: {
        ecmaVersion: "2017"
    },
    env: {
        browser: true,
        commonjs: true,
        es6: true,
        node: true
    },
    extends: "eslint:recommended",
    rules: {
        indent: ["error", 4],
        "linebreak-style": ["error", "unix"],
        quotes: ["error", "single"],
        semi: ["error", "always"],
        "prefer-const": ["error"],
        "arrow-parens": ["error", "always"]
    }
};
