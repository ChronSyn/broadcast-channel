const isNode = require('detect-node');

if(!isNode){
    // if browsers
    console.dir = obj => console.log(JSON.stringify(obj));
}

require('./unit.test');
require('./integration.test');
require('./issues.test');

require('./performance.test');
