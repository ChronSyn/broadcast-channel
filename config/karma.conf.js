const testRoot = '../tmp/test/index.test.js';
module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: [
            'mocha',
            'browserify',
            'detectBrowsers'
        ],
        files: [testRoot],
        port: 9876,
        colors: true,
        autoWatch: false,

        /**
         * see
         * @link https://github.com/litixsoft/karma-detect-browsers
         */
        detectBrowsers: {
            enabled: true,
            usePhantomJS: false,
            postDetection: function (availableBrowser) {

                // return ['Firefox']; // comment in to test specific browser

                return availableBrowser
                    .filter(b => !['PhantomJS', 'FirefoxAurora', 'FirefoxNightly'].includes(b));
            }
        },

        // Karma plugins loaded
        plugins: [
            'karma-mocha',
            'karma-browserify',
            'karma-chrome-launcher',
            'karma-edge-launcher',
            'karma-firefox-launcher',
            'karma-ie-launcher',
            'karma-opera-launcher',
            'karma-detect-browsers'
        ],

        // Source files that you wanna generate coverage for.
        // Do not include tests or libraries (these files will be instrumented by Istanbul)
        preprocessors: {
            testRoot: ['browserify']
        },

        client: {
            mocha: {
                bail: true
            }
        },
        singleRun: true
    });
};
