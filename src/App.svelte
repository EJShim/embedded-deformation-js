<script>
import { onMount } from "svelte";
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
// import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
// import vtkMouseCameraTrackballRotateManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballRotateManipulator';
import vtkPointPicker from '@kitware/vtk.js/Rendering/Core/PointPicker';
import { readOBJ, makeActor } from './utils';
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkSphereMapper from '@kitware/vtk.js/Rendering/Core/SphereMapper';
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";


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

let m_bSimulation = false;

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

	console.log(m_polydata.getVerts().getNumberOfTuples());
	// Add Contorl Points rendering objetc	
	m_controlPointPolyData = vtkPolyData.newInstance();		
	

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
		
		//disable interaction
		interactorStyle.endPan();
		interactorStyle.endRotate();

		

		if(m_bSimulation){
			// Move Control Points			
			console.log(pointId, m_picker.getActors());


		}else{ // Add New Control Points				
			
			const pickedPoint = m_polydata.getPoints().getPoint(pointId);
			console.log(pointId, pickedPoint);
			
			// this way.. makes picker work
			let points_buffer = m_controlPointPolyData.getPoints().getData();
			points_buffer = new Float32Array([...points_buffer, ...pickedPoint]);
			
			m_controlPointPolyData.getPoints().setData(points_buffer, 3);			
			// m_controlPointPolyData.getPoints().modified();
			m_controlPointPolyData.modified();
		}
		renWin.render();
	});

	m_iren.getInteractor().onMouseMove(e=>{
		if(m_picker.getActors().length === 0) return;				
		// interactorStyle.removeMouseManipulator(interactorStyleManipulator);		
		
	});

	m_iren.getInteractor().onLeftButtonRelease(e=>{		
		// interactorStyle.addMouseManipulator(interactorStyleManipulator);	
		
	})

	m_iren.getInteractor().onKeyDown(e=>{

		if(e.key === " "){
			 m_bSimulation = !m_bSimulation;
		}
		update();
	});	

	
});

const update = () =>{
	
	m_picker = vtkPointPicker.newInstance();	
	m_picker.setPickFromList(true);
	m_picker.initializePickList();	
	
	if(m_bSimulation){			
		m_picker.addPickList(m_controlPointActor);
		m_background1 = [100, 100, 255];
	}else{
		m_picker.addPickList(m_actor);
		m_background1 = [100, 100, 100];
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
