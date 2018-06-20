'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.fillOptionsWithDefaults = fillOptionsWithDefaults;

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function fillOptionsWithDefaults(options) {
    options = (0, _clone2['default'])(options);

    // main
    if (typeof options.webWorkerSupport === 'undefined') options.webWorkerSupport = true;

    // indexed-db
    if (!options.idb) options.idb = {};
    //  after this time the messages get deleted
    if (!options.idb.ttl) options.idb.ttl = 1000 * 45;
    if (!options.idb.fallbackInterval) options.idb.fallbackInterval = 50;

    // localstorage
    if (!options.localstorage) options.localstorage = {};
    if (!options.localstorage.removeTimeout) options.localstorage.removeTimeout = 1000 * 60;

    // node
    if (!options.node) options.node = {};
    if (!options.node.ttl) options.node.ttl = 1000 * 60 * 2; // 2 minutes;

    return options;
}