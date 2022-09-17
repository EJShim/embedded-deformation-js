import './app.css'
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import App from './App.svelte'

const app = new App({
  target: document.getElementById('app')
})

export default app
