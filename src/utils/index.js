import vtkOBJReader from '@kitware/vtk.js/IO/Misc/OBJReader';
import vtkPLYReader from '@kitware/vtk.js/IO/Geometry/PLYReader';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

export const readOBJ = async (input) =>{	
    const reader = vtkOBJReader.newInstance();

	const input_type = typeof(input)
	if(input_type == 'string'){
		await reader.setUrl(input);
	}else{
		const string = await parseFileString(input);
		reader.parseAsText(string);		
	}
	
    reader.update();

    return reader.getOutputData();
}

export const readPLY = async(input)=>{
	const reader = vtkPLYReader.newInstance();

	const input_type = typeof(input)
	if(input_type == 'string'){
		await reader.setUrl(input);
	}else{
		const string = await parseFileArrayBuffer(input);
		reader.parseAsArrayBuffer(string);		
	}
	
    reader.update();

    return reader.getOutputData();
}

export const parseFileString = (file) =>{
	return new Promise((resolve, reject)=>{
		const reader = new FileReader();
		
		reader.onload = e=>{
			resolve(reader.result);
		}
		reader.readAsText(file)
	});
}

export const parseFileArrayBuffer = (file) =>{
	return new Promise((resolve, reject)=>{
		const reader = new FileReader();
		
		reader.onload = e=>{
			resolve(reader.result);
		}

		reader.readAsArrayBuffer(file)
	});
}

export const makeActor = (polydata) =>{
        
	const mapper = vtkMapper.newInstance();
	mapper.setInputData(polydata);

	const actor = vtkActor.newInstance();
	actor.setMapper(mapper);	

    return actor;
}

export const displayToView = (x, y, z, renderer, viewAPI) => {
    var val = viewAPI.displayToNormalizedDisplay(x, y, z);
    var val2 = renderer.normalizedDisplayToProjection(val[0], val[1], val[2]);
    var dims = viewAPI.getViewportSize(renderer);
    return renderer.projectionToView(val2[0], val2[1], val2[2], dims[0] / dims[1])
}