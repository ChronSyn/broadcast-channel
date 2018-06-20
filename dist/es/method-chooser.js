import _JSON$stringify from 'babel-runtime/core-js/json/stringify';
import isNode from 'detect-node';

import * as NativeMethod from './methods/native.js';
import * as IndexeDbMethod from './methods/indexed-db.js';
import * as LocalstorageMethod from './methods/localstorage.js';

// order is important
var METHODS = [NativeMethod, // fastest
IndexeDbMethod, LocalstorageMethod];

/**
 * The NodeMethod is loaded lazy
 * so it will not get bundled in browser-builds
 */
if (isNode) {
    var NodeMethod = require('./methods/node.js');
    METHODS.push(NodeMethod);
}

export function chooseMethod(options) {
    // directly chosen
    if (options.type) {
        var ret = METHODS.find(function (m) {
            return m.type === options.type;
        });
        if (!ret) throw new Error('method-type ' + options.type + ' not found');else return ret;
    }

    var chooseMethods = METHODS;
    if (!options.webWorkerSupport && !isNode) {
        // prefer localstorage over idb when no webworker-support needed
        chooseMethods = METHODS.filter(function (m) {
            return m.type !== 'idb';
        });
    }

    var useMethod = chooseMethods.find(function (method) {
        return method.canBeUsed();
    });
    if (!useMethod) throw new Error('No useable methode found:' + _JSON$stringify(METHODS.map(function (m) {
        return m.type;
    })));else return useMethod;
}