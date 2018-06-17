/**
 * returns true if the given object is a promise
 */
export function isPromise(obj) {
    if (obj &&
        typeof obj.then === 'function') {
        return true;
    } else {
        return false;
    }
}

/**
 * windows sucks
 * @link https://gist.github.com/domenic/2790533#gistcomment-331356
 */
export function cleanPipeName(str) {
    if (
        process.platform === 'win32' &&
        !str.startsWith('\\\\.\\pipe\\')
    ) {
        str = str.replace(/^\//, '');
        str = str.replace(/\//g, '-');
        return '\\\\.\\pipe\\' + str;
    } else {
        return str;
    }
};
