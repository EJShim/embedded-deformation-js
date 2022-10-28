
<svelte:head>
	<script src="lib/ort.min.js" on:load={e=>{InitializeAI()}}></script>
</svelte:head>

<script>
import { onMount } from "svelte";
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
// import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
// import vtkMouseCameraTrackballRotateManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballRotateManipulator';
import vtkPointPicker from '@kitware/vtk.js/Rendering/Core/PointPicker';
import { readOBJ, makeActor, readPLY } from './utils';
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkSphereMapper from '@kitware/vtk.js/Rendering/Core/SphereMapper';
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import {arapSimulator} from './cpp';
    import { aw } from "@kitware/vtk.js/Common/Core/Math/index";
    
let m_rendererContainer;
let m_videoContainer;
let m_canvas = document.createElement("canvas");

/// AI Session
let m_session;
let m_calculation = false;


let m_iren = vtkGenericRenderWindow.newInstance({background:[1,0,0,0]});

let m_background1 = [100, 100, 100];
let m_background2 = [200, 200, 200];

// rendering polydata and actor
let m_polydata;
let m_actor;

// control point polydata and actor
let m_controlPointPolyData;
let m_controlPointActor;

let m_picker;

// animation
let m_fpsInterval = 1000 / 60;
let m_then;
let m_animationId;

let m_bSimulation = false;
let m_pickDistance = 0.5;

// cpp module
let m_simulator;

// file drop
let m_bFileDrop = false;


onMount(async ()=>{
	m_iren.setContainer(m_rendererContainer);
	m_iren.getRenderWindow().render();
	m_iren.resize();

	// Add Initial Rendering Object
	await addData('resources/decimated-knight.obj');		
	
	//Initialize WASM arap module
	let module = await arapSimulator();
	m_simulator = new module.Simulator();

	
	// // Assign Interaction
	// m_iren.getInteractor().onLeftButtonPress((e)=>{onLeftButtonPress(e);});
	// m_iren.getInteractor().onMouseMove(e=>{onMouseMove(e);});
	// m_iren.getInteractor().onLeftButtonRelease(e=>{	onLeftButtonRelease(e);});
	m_iren.getInteractor().onKeyDown(e=>{onKeyDown(e);});	

	// Set Default Canvas dat
	m_canvas.width = 256;
	m_canvas.height = 256;
});

const addData = async(path) =>{
	let renWin = m_iren.getRenderWindow();
	let renderer = m_iren.getRenderer();

	// Add Rendering Object
	m_polydata = await readOBJ(path);
	m_actor = makeActor(m_polydata);
	m_actor.getProperty().setColor(1, 1, 0);	
	renderer.addActor(m_actor);

	// Add Contorl Points rendering objetc

	let default_idx = new Int32Array([
		262,165,242,452,58,67,65,318,100,395,8,232,420,174,288,415,12,294,324,61,26
	]);

	let buffer = [];
	default_idx.forEach(idx=>{
		const point = m_polydata.getPoints().getPoint(idx);
		buffer.push(...point);
	});
	let default_points = new Float32Array(buffer);

	m_controlPointPolyData = vtkPolyData.newInstance();
	m_controlPointPolyData.getPoints().setData(default_points, 3);
	m_controlPointPolyData.getPointData().addArray( vtkDataArray.newInstance({values:default_idx, name:"Reference"}) );
	const mapper = vtkSphereMapper.newInstance();
	mapper.setInputData(m_controlPointPolyData);	
	m_controlPointActor = vtkActor.newInstance();
	m_controlPointActor.setMapper(mapper);
	m_controlPointActor.getProperty().setColor(1, 0, 0);	
	renderer.addActor(m_controlPointActor);				
	
	renderer.resetCamera();		
	renWin.render();	

	// Update pick list
	update();
	
}


const InitializeAI = async ()=>{
	const sessionOption = { 
		executionProviders: ['wasm'] ,
		graphOptimizationLevel: "disabled"        
	};

	m_session = await ort.InferenceSession.create('resources/estimator.onnx', sessionOption);

}


const onKeyDown = (e)=>{
	if(e.key === " "){
		m_bSimulation = !m_bSimulation;		
		update();
		m_iren.getRenderer().resetCamera();
	}
}

const update = () => {
	
	m_picker = vtkPointPicker.newInstance();	
	m_picker.setPickFromList(true);
	m_picker.initializePickList();

	const bounds = m_actor.getBounds();
	const xLen = bounds[1] - bounds[0];
	const yLen = bounds[2] - bounds[3];
	const zLen = bounds[4] - bounds[5];
	const length = Math.sqrt(xLen*xLen + yLen*yLen + zLen*zLen);
	m_controlPointActor.getMapper().setRadius(length / 50);

	if(m_bSimulation){			
		//Initialize Calculation
		const V = m_polydata.getPoints().getData();
		const F = m_polydata.getPolys().getData();
		const b = m_controlPointPolyData.getPointData().getArray("Reference").getData();

		//Intiialize Module
		m_simulator.Initialize(V, F, b);
		
		// Start Animation
		m_then = Date.now();
		m_animationId = requestAnimationFrame(animate);


		m_picker.addPickList(m_controlPointActor);
		m_background1 = [100, 100, 255];


	}else{
		cancelAnimationFrame(m_animationId);
		m_picker.addPickList(m_actor);
		m_background1 = [100, 100, 100];
	}

	// Redraw
	m_iren.resize();
}

const solve = () => {
	// TODO : Get Required informations in Float32Array
	const CU = m_controlPointPolyData.getPoints().getData();
	const V = m_polydata.getPoints().getData();

	// TODO : Run ARAP
	let U = m_simulator.SingleIteration(CU, V);
	m_polydata.getPoints().setData(U);
	m_polydata.modified();
}

const animate = () => {

	// request another frame
	m_animationId = requestAnimationFrame(animate);

	// calc elapsed time since last loop
	let now = Date.now();
	let elapsed = now - m_then;

	// if enough time has elapsed, draw the next frame

	if (elapsed > m_fpsInterval) {

		// Get ready for next frame by setting then=now, but also adjust for your
		// specified fpsInterval not being a multiple of RAF's interval (16.7ms)
		m_then = now - (elapsed % m_fpsInterval);

		// Run DL Model here
		inference();

		// Put your drawing code here
		solve();
		m_iren.getRenderWindow().render();

	}
}

const inference = async () =>{
	// let canvas = document.createElement("canvas");
	if(m_calculation) return;

	m_calculation = true;
	let ctx = m_canvas.getContext("2d");
	ctx.drawImage(m_videoContainer, 0, 0, m_canvas.width, m_canvas.height);        
	
	let imageData =  Float32Array.from(ctx.getImageData(0, 0, 256, 256).data);

	let inputTensor = new ort.Tensor('float32', imageData, [256, 256, 4]);
	let outputTensor = await m_session.run({"pre_processor/input" : inputTensor});
	let outputData = outputTensor["post_processor/output"].data;


	m_controlPointPolyData.getPoints().setData(outputData, 3);
	m_controlPointPolyData.modified();

	m_calculation = false;
}

const FileEnter = (e) =>{
	e.preventDefault();
	m_bFileDrop = true;
}

const FileDrop = async (e) =>{

	e.preventDefault();


	const file = e.dataTransfer.files[0] 
	if(!file) return;

	const renderer = m_iren.getRenderer();
	const renWin = m_iren.getRenderWindow();

	// Update Target Rendering Data?
	const ext = file.name.split('.').pop()
	
	if(ext === 'ply'){
		m_polydata = await readPLY(file);
	}else if(ext === 'obj'){
		m_polydata = await readOBJ(file);
	}

	m_polydata.getPointData().removeArray("Normals");
	m_actor.getMapper().setInputData(m_polydata);

	// Update Control Points - empty
	
	m_controlPointPolyData.getPoints().setData(new Float32Array(), 3);
	m_controlPointPolyData.getPointData().getArray("Reference").setData(new Int16Array());

	m_bSimulation = false;
	update();

	m_bFileDrop = false;
	renderer.resetCamera();
	renWin.render();
}

const FileLeave = (e) =>{

	e.preventDefault();

	m_bFileDrop = false;
}
</script>
<video class="video" autoplay muted loop bind:this={m_videoContainer}>
	<source src="resources/output.mp4" type="video/mp4">
	<track kind="captions">
</video>

<div class="renderer" bind:this={m_rendererContainer}
		on:dragover={e=>{FileEnter(e)}}
		on:drop={e=>{FileDrop(e)}}
		style="--theme-background1: rgb({m_background1[0]}, {m_background1[1]}, {m_background1[2]} );
			--theme-background2 : rgb({m_background2[0]}, {m_background2[1]}, {m_background2[2]});">	
		
	<div class="message"> 
		<div>Press 'space' to change mode</div>	
		<div>{m_bSimulation ? 
			"drag control point ":
			"add control point"}</div>	
	</div>

	{#if m_bFileDrop}
	<div class="drop-handler" on:dragleave={e=>{FileLeave(e)}}>
		<h1>Drop draped mesh .obj file</h1>
	</div>		
	{/if}	
</div>

<style>

.video{
	position : absolute;
	top : 0;
	left : 0;
	width : 50%;
	height : 100%;
}

.renderer{
	background: linear-gradient(var(--theme-background1), var(--theme-background2));
	position : absolute;
	top : 0;
	left : 50%;

	width : 50%;
	height : 100%;

	display: flex;
	justify-content: center;
	align-items: center;
}

.message{
	position : absolute;
	top : 10px;
	left : 40px;	
	
	display: flex;	
	flex-direction: column;	
	justify-content: center;	
}

.message > div{
	background-color: black;
	padding : 5px;
	user-select: none;
	display: flex;
	text-align: center;
}


.drop-handler {
		position : absolute;
		width : 100%;
		height : 100%;
		background : rgba(52, 12, 250, 0.5);

		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
