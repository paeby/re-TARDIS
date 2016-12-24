var loader = new THREE.FileLoader();
loader.load(
    'stops.json',
    function (json) {
	stops = JSON.parse(json);
	start()
    }
);

loader.load(
    'centers.json',
    function (json) {
	centers = JSON.parse(json);
	start()
    }
);

loader.load(
    'nodes.json',
    function (json) {
	nodes = JSON.parse(json);
	start()
    }
);

loader.load(
    'matrix.json',
    function (json) {
	matrix = JSON.parse(json);
	start()
    }
);

var to_load = 4;

function start(){
    to_load -= 1;
    if (to_load == 0) {
	init();
	animate();
    }
}


var stops, centers, nodes, matrix;


// ----- THREE VARIABLES -----
var Stats;
var camera, controls, scene, renderer;
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var colors = []; // hold the generated colors
var min;
var light;

var diameter = 3.2
var height_fly = 30;
var height_base = 5.0;
var height_factor = 4.0;    


function init(){

    var container = document.createElement( 'div' );
    document.body.appendChild( container );
    scene = new THREE.Scene();
    setListeners();
    setCamera();
    setControls();    
    setLights();
    setRenderer(container)        
    setStats(container);
    setFloor()
    setTiles();

}

function setListeners(){
    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
    window.addEventListener( 'resize', onWindowResize, false );
}

function setFloor() {
    var geoFloor = new THREE.BoxGeometry( 4000, 4000, 1 );
    var matFloor = new THREE.MeshPhongMaterial({color: 0x323232 } );
    var mshFloor = new THREE.Mesh( geoFloor, matFloor );
    mshFloor.receiveShadow = true;
    scene.add(mshFloor);
    
}
function setRenderer(container){
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor( 0x323232 );    
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;    
}

function setStats(container){
    stats = new Stats();
    container.appendChild( stats.dom );    
}

function setTiles(){
    // Color palette for different distances
    generateColorPalette();

    // Create points from stops
    genPoints();

    genTiles();    

}

function genTiles() {
    var material = new THREE.MeshPhongMaterial( { color: 0x5e7eff, overdraw: 0.5, shading: THREE.FlatShading, shininess:0, specular:0} );    

    for(var c in centers){
	createTile(centers[c])
    }


    function createTile(t) {
	var height = t.h*height_factor + height_base;
	var cylinder = new THREE.CylinderGeometry( diameter, diameter, height, 6 );	
	var tile = new THREE.Mesh( cylinder, material);
	tile.position.set(t.x, t.y, height/2 + height_fly)
	tile.rotation.x = Math.PI/2;
	tile.rotation.y = Math.PI/2;
	tile.name = "t"+t.ID;
	tile.updateMatrix();
	tile.matrixAutoUpdate = false;
	tile.callback = function(){
	    updateMap(t.ID);
	};
	tile.castShadow = true;
	tile.receiveShadow = true;	
	scene.add(tile);
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

    function updateColor(id, color){
	scene.traverse (function (object) {
	    if (object.name === id){
		//	    var newMaterial = material.clone()
		//	    newMaterial.color.setRGB(color.r, color.g, color.b)
		//	    object.material = newMaterial;
	   } 
	});
    }    
    
}

function genPoints() {
    var dotGeometry = new THREE.Geometry();

    for (var stop in stops) {
	var s = stops[stop];

	var height = s.h*height_factor+height_base + 0.1 + height_fly;	
	dotGeometry.vertices.push(new THREE.Vector3(s.x, s.y, height));	
    }
    var dotMaterial = new THREE.PointsMaterial( { size: 1.3, sizeAttenuation: false, color: 0x664200 } );
    var dot = new THREE.Points( dotGeometry, dotMaterial );
    scene.add( dot );
}




function generateColorPalette() {
    var arr = matrix.reduce(function (p, c) {
	return p.concat(c);
    });
    var max = Math.max.apply(null, arr);
    min = Math.min.apply(null, arr);
    
    var total = max-min;
    var i = 360 / (total - 1); // distribute the colors evenly on the hue range
    for (var x=0; x<total; x++)
    {
	colors.push(HSVtoRGB((i * x)/360, 0.8, 0.8)); // you can also alternate the saturation and value for even more contrast between the colors
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

function setCamera(){
    var factor = 2;
    var width = window.innerWidth;
    var height = window.innerHeight;    
    camera = new THREE.OrthographicCamera(
	-width/factor , width/factor, height/factor, -height/factor, -1000, 2000 );
    camera.position.z = 100;
    camera.zoom = width/900*2;
    camera.updateProjectionMatrix();    
}

function setLights(){

    var ambient = new THREE.AmbientLight( 0xffffff, 0.15 );
    var spotLight = new THREE.SpotLight( 0xffffff, 0.5);
    spotLight.position.set( 70, 0, 250 );
    spotLight.target.position.set( 30, 0, 0 );    
    spotLight.castShadow = true;
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.decay = 1;
    spotLight.distance = 500;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add( spotLight );
    scene.add( spotLight.target );        
    scene.add( ambient );    


}

function setControls(){
    // Controls (when moving mouse)
    controls = new THREE.OrbitControls(camera);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.minZoom = 2;
    controls.maxZoom = 15;
    controls.minPolarAngle = Math.PI/6; 
    controls.maxPolarAngle = 5*Math.PI/6;
    controls.minAzimuthAngle = -Math.PI/3;;
    controls.maxAzimuthAngle = Math.PI/3;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.2;
}
function onWindowResize(){
    var factor = 2;
    var width = window.innerWidth;
    var height = window.innerHeight;
    console.log(factor);
    camera.left = -width/factor;
    camera.right = width/factor;
    camera.top = height/factor;
    camera.bottom = -height/factor;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );    

}    


function animate() {
    requestAnimationFrame( animate );
    //    controls.update();
    stats.update();
    render();

}

function render() {
    renderer.render( scene, camera );
}
