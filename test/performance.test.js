const convertHrtime = require('convert-hrtime');
const AsyncTestUtil = require('async-test-util');

// const BroadcastChannel = require('../dist/lib/index');


const benchmark = {
    sign: {},
    recoverPublicKey: {},
    encryptWithPublicKey: {},
    decryptWithPrivateKey: {}
};

const nowTime = () => {
    try {
        return process.hrtime();
    } catch (err) {
        return performance.now();
    }
};

const elapsedTime = before => {
    try {
        return convertHrtime(process.hrtime(before)).milliseconds;
    } catch (err) {
        return performance.now() - before;
    }
};

describe('performance.test.js', () => {
});
