'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.isPromise = isPromise;
exports.cleanPipeName = cleanPipeName;
exports.sleep = sleep;
/**
 * returns true if the given object is a promise
 */
function isPromise(obj) {
    if (obj && typeof obj.then === 'function') {
        return true;
    } else {
        return false;
    }
}

/**
 * windows sucks
 * @link https://gist.github.com/domenic/2790533#gistcomment-331356
 */
function cleanPipeName(str) {
    if (process.platform === 'win32' && !str.startsWith('\\\\.\\pipe\\')) {
        str = str.replace(/^\//, '');
        str = str.replace(/\//g, '-');
        return '\\\\.\\pipe\\' + str;
    } else {
        return str;
    }
};

function sleep(time) {
    if (!time) time = 0;
    return new Promise(function (res) {
        return setTimeout(res, time);
    });
}