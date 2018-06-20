'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

exports.chooseMethod = chooseMethod;

var _detectNode = require('detect-node');

var _detectNode2 = _interopRequireDefault(_detectNode);

var _native = require('./methods/native.js');

var NativeMethod = _interopRequireWildcard(_native);

var _indexedDb = require('./methods/indexed-db.js');

var IndexeDbMethod = _interopRequireWildcard(_indexedDb);

var _localstorage = require('./methods/localstorage.js');

var LocalstorageMethod = _interopRequireWildcard(_localstorage);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// order is important
var METHODS = [NativeMethod, // fastest
IndexeDbMethod, LocalstorageMethod];

/**
 * The NodeMethod is loaded lazy
 * so it will not get bundled in browser-builds
 */
if (_detectNode2['default']) {
    var NodeMethod = require('./methods/node.js');
    METHODS.push(NodeMethod);
}

function chooseMethod(options) {
    // directly chosen
    if (options.type) {
        var ret = METHODS.find(function (m) {
            return m.type === options.type;
        });
        if (!ret) throw new Error('method-type ' + options.type + ' not found');else return ret;
    }

    var chooseMethods = METHODS;
    if (!options.webWorkerSupport && !_detectNode2['default']) {
        // prefer localstorage over idb when no webworker-support needed
        chooseMethods = METHODS.filter(function (m) {
            return m.type !== 'idb';
        });
    }

    var useMethod = chooseMethods.find(function (method) {
        return method.canBeUsed();
    });
    if (!useMethod) throw new Error('No useable methode found:' + (0, _stringify2['default'])(METHODS.map(function (m) {
        return m.type;
    })));else return useMethod;
}