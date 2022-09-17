<script>
import { onMount } from "svelte";
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import { readOBJ, makeActor } from './utils';

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


onMount(async ()=>{	
	m_background1 = [100, 100, 100];
	m_iren.setContainer(m_rendererContainer);
	m_iren.getRenderWindow().render();
	m_iren.resize();


	const renderer = m_iren.getRenderer();
	const renWin = m_iren.getRenderWindow();

	const polydata = await readOBJ('resources/decimated-knight.obj');
	const actor = makeActor(polydata);

	renderer.addActor(actor);


	// Add Contorl Points
	const random_points = Float32Array.from({length: 100}, () => Math.random());
	console.log(random_points);


	renderer.resetCamera();
	renWin.render();

	// TODO :  resassign interaction?
	m_iren.getInteractor().onLeftButtonPress((e)=>{
		// console.log(e.position);
		m_iren.getInteractor().disable();
		m_iren.getInteractor().enable();
	})
})


</script>

<main bind:this={m_rendererContainer}
	style="--theme-background1: rgb({m_background1[0]}, {m_background1[1]}, {m_background1[2]} );
			--theme-background2 : rgb({m_background2[0]}, {m_background2[1]}, {m_background2[2]});">	
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

</style>
