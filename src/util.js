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
