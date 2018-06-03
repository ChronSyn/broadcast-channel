import Core from './core';

import {
    addMethod,
    clearMethods
} from './core';
export {
    addMethod,
    clearMethods
} from './core';

import BroadcastChannel from './core';


// add default methods
import Native from './methods/native';
addMethod(Native);


export default BroadcastChannel;