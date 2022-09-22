import {default as utilsModule} from './wasm/utils'
import utilsWasm from './wasm/utils.wasm?url';



// utilsWasm;
let utils = async ()=>{
    const param = {
        locateFile: (path, prefix)=>{return utilsWasm;}
    }
    
    return new Promise((resolve, reject)=>{
        utilsModule( param ).then(instance =>{
            resolve(instance);
        });
    });
};


export {utils};