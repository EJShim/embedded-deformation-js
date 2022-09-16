<script>
import { onMount } from "svelte";


let m_rendererContainer;
let m_background1 = "#FF0000";

console.log("haha")

onMount(()=>{

	console.log(m_rendererContainer);

	m_background1 = "#00AA00";
})


</script>

<main bind:this={m_rendererContainer}
	style="--theme-background1:{m_background1}">
	Renderer
</main>

<style>

main{
	background-color: var(--theme-background1);
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
