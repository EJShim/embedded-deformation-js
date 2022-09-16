<script>
import { onMount } from "svelte";


let m_rendererContainer;

console.log("haha")

onMount(()=>{

	console.log(m_rendererContainer);
})


</script>

<main bind:this={m_rendererContainer}>
	Renderer
</main>

<style>

main{    
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
