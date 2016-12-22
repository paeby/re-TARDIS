// ----- LOAD DATA -----
function load_data(url, variable, type){
	var value;
    $.ajax({
        type: "GET",
        url: url,
        dataType: type,
        async: false,
        success : function(data) {
            value = data;
        }
    });
    return value;
}

var stops = load_data("http://switzograms.ch/tardis/stops.json", stops, "json")
var centers = load_data("http://switzograms.ch/tardis/centers.json", centers,"json")
var nodes = load_data("http://switzograms.ch/tardis/nodes", nodes,"json")
var matrix = eval(load_data("http://switzograms.ch/tardis/matrix", matrix,"text"))

// ----- THREE VARIABLES -----
var Stats;
var camera, controls, scene, renderer;
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

init();
animate();

function init() {
	// ----- CREATE SCENE -----
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	scene = new THREE.Scene();
	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	var container = document.getElementById( 'container' );
	container.appendChild( renderer.domElement );
	
	// Scene lights			
	var ambientLight = new THREE.AmbientLight( 0xffffff );
	scene.add( ambientLight );
	
	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.y = -1000;
	directionalLight.position.z = -1000;
	directionalLight.position.normalize();
	scene.add( directionalLight );
	
	var directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.y = 1000;
	directionalLight.position.z = -1000;
	directionalLight.position.normalize();
	scene.add( directionalLight );

 	// Camera - orthographic
	camera = new THREE.OrthographicCamera(
	-window.innerWidth/6 , window.innerWidth/6,window.innerHeight/6, -window.innerHeight/6, -200, 1000 );
	camera.position.z = -100;
	camera.lookAt(scene.position);

	// Controls (when moving mouse)
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.enableZoom = false;
	controls.enableZoom = true;
	controls.rotateSpeed = 0.5;
	controls.zoomSpeed = 1.2;

	// Stats
	stats = new Stats();
	container.appendChild( stats.dom );

	// Color palette for different distances
		var colors = []; // hold the generated colors
	var arr = matrix.reduce(function (p, c) {
		return p.concat(c);
	});
	var max = Math.max.apply(null, arr);
	var min = Math.min.apply(null, arr);
		generateColorPalette();

	// Create points from stops
	var dotGeometry = new THREE.Geometry();
		for (var s in stops) {
       				createStop(stops[s]);
	}
	var dotMaterial = new THREE.PointCloudMaterial( { size: 1, sizeAttenuation: false } );
	var dot = new THREE.PointCloud( dotGeometry, dotMaterial );
	dot.name = 'stops';
	scene.add( dot );

	// Create tiles from centers
	// Default values when creating tile
	var x_diameter = 3333.334887501085177;
	var y_diameter = 2886.7526918968869725;
	var material = new THREE.MeshPhysicalMaterial( {
		color: new THREE.Color("#002259"),
		metalness: 0.5,
		roughness: 0.5,
		clearCoat:  1.0,
		clearCoatRoughness: 1.0,
		reflectivity: 1.0,
	} );
	
	for(var c in centers){
		createTile(centers[c])
	}


	function createTile(t) {
		cylinder = new THREE.CylinderGeometry( y_diameter/1000.0, y_diameter/1000.0, t.h, 6 );
		tile = new THREE.Mesh( cylinder, material);
		tile.position.set(-t.x,t.y,-0.5*t.h)
		tile.rotation.x = de2ra(90);
		tile.rotation.y = de2ra(90);
		tile.name = "t"+t.ID;
		tile.updateMatrix();
		tile.matrixAutoUpdate = false;
		tile.callback = function(){
			updateMap(t.ID);
		}; 
		scene.add(tile);
	}


		function createStop(s){
			dotGeometry.vertices.push(new THREE.Vector3(-s.x, s.y, -s.h-0.1));
		}

	function de2ra(degree) {
		return degree*(Math.PI/180);
	}

	function updateColor(id, color){
		scene.traverse (function (object) {
	        if (object.name === id){
	        	var newMaterial = material.clone()
	        	newMaterial.color.setRGB(color.r, color.g, color.b)
	            object.material = newMaterial;
	        }
		});
	}
	
	function updateMap(id){
		var index = nodes.indexOf(id);
		if (typeof index !== 'undefined' && index!== -1) {
			for(var station in nodes){
					// ----- THIS IS JUST BECAUSE WE HAVE A MATRIX WITH STOP ID, then it will be easy with tile ids
					var s_id = nodes[station];
					var t_id = ($.grep(stops, function(e){ return e.stop_id == s_id; }))[0].ID;
					console.log(t_id)
					var time = matrix[index][station];
					updateColor('t'+t_id, colors[time-min]);
				}
		}
	}

	function generateColorPalette() {
		var total = max-min;
	    var i = 360 / (total - 1); // distribute the colors evenly on the hue range
	    for (var x=0; x<total; x++)
	    {
	        colors.push(HSVtoRGB((i * x)/360, 0.8, 0.8)); // you can also alternate the saturation and value for even more contrast between the colors
	    }
	}

	function HSVtoRGB(h, s, v) {
	  var r, g, b;

	  var i = Math.floor(h * 6);
	  var f = h * 6 - i;
	  var p = v * (1 - s);
	  var q = v * (1 - f * s);
	  var t = v * (1 - (1 - f) * s);

	  switch (i % 6) {
	    case 0: r = v, g = t, b = p; break;
	    case 1: r = q, g = v, b = p; break;
	    case 2: r = p, g = v, b = t; break;
	    case 3: r = p, g = q, b = v; break;
	    case 4: r = t, g = p, b = v; break;
	    case 5: r = v, g = p, b = q; break;
	  }
	  return { r:r, g:g, b:b };
	}

	function onDocumentMouseDown( e ) {
	    event.preventDefault();
	    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
	    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
	    raycaster.setFromCamera( mouse, camera );
	    var intersects = raycaster.intersectObjects( scene.children ); 
	    if ( intersects.length > 0 ) {
	    	console.log(intersects[0].object);
	    	//intersects[0].object.callback();
	    	var name = intersects[0].object.name.substring(1);
	    	// When we will have the travel distance between tiles
	    	//updateMap(+name);
	    	updateMap(8508759);
	    }
	}
}

function animate() {
	requestAnimationFrame( animate );
	controls.update();
	stats.update();
	render();

}

function render() {
	renderer.render( scene, camera );
}