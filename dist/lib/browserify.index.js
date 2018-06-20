'use strict';

require('babel-polyfill');
var BroadcastChannel = require('./index.js');

window['BroadcastChannel2'] = BroadcastChannel;