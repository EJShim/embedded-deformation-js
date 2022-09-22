<script>
import { onMount } from "svelte";
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
// import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
// import vtkMouseCameraTrackballRotateManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballRotateManipulator';
import vtkPointPicker from '@kitware/vtk.js/Rendering/Core/PointPicker';
import { readOBJ, makeActor, displayToView } from './utils';
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkSphereMapper from '@kitware/vtk.js/Rendering/Core/SphereMapper';
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import {utils} from './cpp';
let m_rendererContainer;
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
let m_wasmModule;
let m_simulator;

onMount(async ()=>{	

	m_background1 = [100, 100, 100];
	m_iren.setContainer(m_rendererContainer);
	m_iren.getRenderWindow().render();
	m_iren.resize();

	const renderer = m_iren.getRenderer();
	const renWin = m_iren.getRenderWindow();

	// Add Rendering Object
	m_polydata = await readOBJ('resources/decimated-knight.obj');
	m_actor = makeActor(m_polydata);
	m_actor.getProperty().setColor(1, 1, 0);	
	renderer.addActor(m_actor);

	// Add Contorl Points rendering objetc	
	m_controlPointPolyData = vtkPolyData.newInstance();
	m_controlPointPolyData.getPointData().addArray( vtkDataArray.newInstance({values:new Int32Array(), name:"Reference"}) );
	

	const mapper = vtkSphereMapper.newInstance();
	mapper.setInputData(m_controlPointPolyData);	
	mapper.setRadius(0.01);
	m_controlPointActor = vtkActor.newInstance();
	m_controlPointActor.setMapper(mapper);
	m_controlPointActor.getProperty().setColor(1, 0, 0);	
	renderer.addActor(m_controlPointActor);			
	
	// const interactorStyle  = vtkInteractorStyleManipulator.newInstance();
	const interactorStyle = m_iren.getInteractor().getInteractorStyle();	

	
	renderer.resetCamera();		
	renWin.render();		
	update();
	
	// TODO :  resassign interaction?
	m_iren.getInteractor().onLeftButtonPress((e)=>{				
		
		m_picker.pick([e.position.x, e.position.y, e.position.z], renderer);	
		const pointId = m_picker.getPointId();
		if(m_picker.getActors().length === 0) return;			

		// disable rotation		
		interactorStyle.endRotate();
		interactorStyle.endPan();

		if(m_bSimulation){
			

		}else{ // Add New Control Points				

			
			const pickedPoint = m_polydata.getPoints().getPoint(pointId);

			// Save pick distance
			const normDisp = renderer.worldToNormalizedDisplay(...pickedPoint);
			m_pickDistance = normDisp[2];
			
			// this way.. makes picker work
			let points_buffer = m_controlPointPolyData.getPoints().getData();
			points_buffer = new Float32Array([...points_buffer, ...pickedPoint]);
			
			// Add Point Id of the target mesh
			m_controlPointPolyData.getPoints().setData(points_buffer, 3);
			m_controlPointPolyData.getPointData().getArray("Reference").insertNextTuple([pointId]);
			// m_controlPointPolyData.getPoints().modified();
			m_controlPointPolyData.modified();
		}
		renWin.render();
	
	});

	m_iren.getInteractor().onMouseMove(e=>{
		if(!m_bSimulation) return;
		if(m_picker.getActors().length === 0) return;

		const renderer = m_iren.getRenderer();
		const pointId = m_picker.getPointId();
		
		// calculate control point position
		const display = [e.position.x, e.position.y, e.position.z];
		const viewCalc = m_iren.getInteractor().getView(); 
		const normDisp = viewCalc.displayToNormalizedDisplay(...display);
		const dims = viewCalc.getViewportSize(renderer);
		const world = renderer.normalizedDisplayToWorld(normDisp[0], normDisp[1], m_pickDistance, dims[0] / dims[1]); // 0.5 should be saved position

		// Update position
		m_controlPointPolyData.getPoints().setTuple(pointId, world);
		m_controlPointPolyData.getPoints().setData( m_controlPointPolyData.getPoints().getData(), 3 );
		m_controlPointPolyData.modified();

		renderer.resetCameraClippingRange();		
	});

	m_iren.getInteractor().onLeftButtonRelease(e=>{	
		if(!m_bSimulation) return;
		if(m_picker.getActors().length === 0) return;

		m_picker = vtkPointPicker.newInstance();	
		m_picker.setPickFromList(true);
		m_picker.initializePickList();
		m_picker.addPickList(m_controlPointActor);

	})

	m_iren.getInteractor().onKeyDown(e=>{

		if(e.key === " "){
			 m_bSimulation = !m_bSimulation;
		}
		update();
	});	

	
	m_wasmModule = await utils();
	m_simulator = new m_wasmModule.Simulator();
	
});


const update = () => {
	
	m_picker = vtkPointPicker.newInstance();	
	m_picker.setPickFromList(true);
	m_picker.initializePickList();	
	
	if(m_bSimulation){			
		startSimulation();
		//TODO : Initialize Calculation
		console.log("Initialize Simulator here");
		const V = m_polydata.getPoints().getData();
		const F = m_polydata.getPolys().getData();
		const b = m_controlPointPolyData.getPointData().getArray("Reference").getData();

		//Intiialize Module
		m_simulator.Initialize(V, F, b);
		
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

const startSimulation = () =>  {
	m_then = Date.now();
	m_animationId = requestAnimationFrame(animate);
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

		// Put your drawing code here

		solve();
		m_iren.getRenderWindow().render();

	}
}


</script>

<main bind:this={m_rendererContainer}
	style="--theme-background1: rgb({m_background1[0]}, {m_background1[1]}, {m_background1[2]} );
			--theme-background2 : rgb({m_background2[0]}, {m_background2[1]}, {m_background2[2]});">	
		
	<div class="message"> 
		<div>Press 'space' to change mode</div>	
		<div>{m_bSimulation ? 
			"drag control point ":
			"add control point"}</div>	
	</div>
	
</main>

<style>

main{
	background: linear-gradient(var(--theme-background1), var(--theme-background2));
	position : absolute;
	top : 0;
	left : 0;

	width : 100%;
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

</style>
