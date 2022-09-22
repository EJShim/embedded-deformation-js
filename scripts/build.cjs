#!/usr/bin/env node
const spawnSync = require('child_process').spawnSync
const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');

//Get Env Paths
const packagePath = path.dirname( path.resolve(__dirname));

const dockerBuild = (tag, dockerPath) => {

    //check if docker image with tag name exists
    const checker = spawnSync('docker', ['images', '-q', tag ], {
        env : process.env,
        stdio : 'pipe',
        encoding : 'utf-8',
        shell : true
    });

    if(checker.stdout == ''){ //build if it does not exists
        console.log("Build new docker image : ", tag)
        const dockerImageBuild = spawnSync('docker', ['build', dockerPath, '--tag', tag],{
            env : process.env,
            cwd : dockerPath,
            stdio : 'inherit',
            shell : true
        })

        // console.log("Pull Docker Image : ", tag);
        // const dockerImageBuild = spawnSync('docker', ['pull', tag],{
        //     env : process.env,
        //     cwd : dockerPath,
        //     stdio : 'inherit',
        //     shell : true
        // })
        
        return;
    }
}

const resourceCopy = () =>{

    const resourcePath = path.join(packagePath, 'src', 'resources')
    // //copy onnxruntime-related wasm file
    const ortWasmFiles = glob.sync(path.join(packagePath, 'node_modules', 'onnxruntime-web', 'dist', "*.wasm"));
    console.log(ortWasmFiles)
    ortWasmFiles.forEach(file=>{
        console.log(file, resourcePath);
        fs.copySync(file, path.join(resourcePath, path.basename(file)))
    })
}

const wasmBuild = () =>{

    //check docker image, if it does not exists, build new one.
    const dockerTag = 'clo/elmo'

    // build using docker
    const dockerPath = path.join(packagePath, "src", "cpp", "docker");

    dockerBuild(dockerTag, dockerPath)
    
    //cmake
    spawnSync('docker-compose', ['up', 'cmake'], {
        cwd : dockerPath,
        env : process.env,
        stdio : 'inherit',
        shell : true
    });

    //make
    spawnSync('docker-compose', ['up', 'make'], {
        cwd : dockerPath,
        env : process.env,
        stdio : 'inherit',
        shell : true
    });

}

if(!process.argv[2]){
    // resourceCopy();
    console.log("do nothing")
}else if(process.argv[2] === "wasm"){
    wasmBuild();
}