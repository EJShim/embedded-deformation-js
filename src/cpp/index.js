import {default as simulatorModule} from './wasm/simulator'

// utilsWasm;
let arapSimulator = async ()=>{
    return new Promise((resolve, reject)=>{
        simulatorModule().then(instance =>{
            resolve(instance);
        });
    });
};

export {arapSimulator};