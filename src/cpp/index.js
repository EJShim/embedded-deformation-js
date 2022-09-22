import {default as utilsModule} from './wasm/utils'
import utilsWasm from './wasm/utils.wasm?url';

console.log(utilsWasm);
const param = {
    
}
// utilsWasm;
let utils;
utilsModule( param ).then(instance =>{
    utils = instance;
    console.log(utils.lerp(1,5, 3));
});

export {utils};