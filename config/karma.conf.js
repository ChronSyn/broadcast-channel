const configuration = {
    basePath: '',
    frameworks: [
        'mocha',
        'browserify',
        'detectBrowsers'
    ],
    files: [
        '../test/index.test.js'
    ],
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
        postDetection: function(availableBrowser) {
            return ['Chrome']; // comment in to test specific browser
            // return ['Firefox']; // comment in to test specific browser
            const browsers = availableBrowser
                .filter(b => !['PhantomJS', 'FirefoxAurora', 'FirefoxNightly'].includes(b))
                .map(b => {
                    if (b === 'Chrome') return 'ChromeNoSandbox';
                    else return b;
                });
            return browsers;
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
        '../test/*.test.js': ['browserify']
    },

    client: {
        mocha: {
            bail: true,
            timeout: 6000
        }
    },
    browsers: ['ChromeNoSandbox'],
    browserDisconnectTimeout: 8000,
    processKillTimeout: 8000,
    customLaunchers: {
        ChromeNoSandbox: {
            base: 'Chrome',
            flags: ['--no-sandbox']
        }
    },
    singleRun: true
};

if (process.env.TRAVIS) {

    /**
     * overwrite reporters-default
     * So no big list will be shown at log
     */
    // configuration.reporters = [];
}

module.exports = function(config) {
    config.set(configuration);
};
