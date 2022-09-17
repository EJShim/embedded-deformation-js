import vtkOBJReader from '@kitware/vtk.js/IO/Misc/OBJReader';
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

export const parseFileString = (file) =>{
	return new Promise((resolve, reject)=>{
		const reader = new FileReader();
		
		reader.onload = e=>{
			resolve(reader.result);
		}

		reader.readAsText(file)

	})
}

export const makeActor = (polydata) =>{
        
	const mapper = vtkMapper.newInstance();
	mapper.setInputData(polydata);

	const actor = vtkActor.newInstance();
	actor.setMapper(mapper);	

    return actor;
}