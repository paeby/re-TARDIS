"use strict";
var THREE = require("three");
var loader = new THREE.FileLoader();
loader.load('stops.json', function (json) {
    stops = JSON.parse(json);
    start();
});
loader.load('centers.json', function (json) {
    centers = JSON.parse(json);
    start();
});
loader.load('nodes.json', function (json) {
    nodes = JSON.parse(json);
    start();
});
loader.load('matrix.json', function (json) {
    matrix = JSON.parse(json);
    start();
});
var to_load = 4;
function start() {
    to_load -= 1;
    if (to_load == 0) {
        init();
        animate();
    }
}
var stops, centers, nodes, matrix;
//----------------------------
var diameter = 3.2;
var height_fly = 30;
var height_base = 5.0;
var height_factor = 4.0;
var dotSize = 6.0;
// ----- THREE VARIABLES -----
var stats;
var camera, controls, scene, renderer;
var raycaster = new THREE.Raycaster();
var tiles = [];
var colors = []; // hold the generated colors
var min;
var light;
var lastDown = 0;
var dots;
function init() {
    var container = document.createElement('div');
    document.body.appendChild(container);
    scene = new THREE.Scene();
    setListeners();
    setCamera();
    setControls();
    setLights();
    setRenderer(container);
    setStats(container);
    setFloor();
    setTiles();
    addTexts();
}
function addTexts() {
    /*   var sprite = new Text2D.SpriteText2D("SPRITE", { align: Text2D.textAlign.center,  font: '40px Arial', fillStyle: '#000000' , antialias: false })
       
       sprite.position.set(48, 54, 40);
       scene.add(sprite);
       */
}
function setListeners() {
    document.addEventListener('mousedown', onDocumentDown, false);
    document.addEventListener('mouseup', onDocumentUp, false);
    window.addEventListener('resize', onWindowResize, false);
}
function setFloor() {
    var geoFloor = new THREE.BoxGeometry(4000, 4000, 1);
    var matFloor = new THREE.MeshPhongMaterial({ color: 0x323232 });
    var mshFloor = new THREE.Mesh(geoFloor, matFloor);
    mshFloor.receiveShadow = true;
    scene.add(mshFloor);
}
function setRenderer(container) {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x323232);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
}
function setStats(container) {
    stats = new Stats();
    container.appendChild(stats.dom);
}
function setTiles() {
    // Color palette for different distances
    generateColorPalette();
    // Create points from stops
    genPoints();
    genTiles();
}
function genTiles() {
    var material = new THREE.MeshPhongMaterial({ color: 0x5e7eff, overdraw: 0.5, shading: THREE.FlatShading, shininess: 0, specular: 0 });
    for (var c in centers) {
        createTile(centers[c]);
    }
    function createTile(t) {
        var height = t.h * height_factor + height_base;
        var geometry = new THREE.CylinderGeometry(diameter, diameter, height, 6);
        var tile = new THREE.Mesh(geometry, material);
        tile.position.set(t.x, t.y, height / 2 + height_fly);
        tile.rotation.x = Math.PI / 2;
        tile.rotation.y = Math.PI / 2;
        tile.updateMatrix();
        tile.matrixAutoUpdate = false;
        tile.name = "t" + t.ID;
        tile.castShadow = true;
        tile.receiveShadow = true;
        tiles.push(tile);
        scene.add(tile);
    }
    function updateMap(id) {
        console.log("update: " + id);
        /*	var index = nodes.indexOf(id);
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
        */
    }
    function updateColor(id, color) {
        scene.traverse(function (object) {
            if (object.name === id) {
            }
        });
    }
}
function genPoints() {
    var amount = stops.length;
    var positions = new Float32Array(amount * 3);
    var sizes = new Float32Array(amount);
    var colors = new Float32Array(amount * 3);
    var vertex = new THREE.Vector3();
    for (var stop in stops) {
        var s = stops[stop];
        var height = s.h * height_factor + height_base + 0.2 + height_fly;
        vertex.x = s.x;
        vertex.y = s.y;
        vertex.z = height;
        vertex.toArray(positions, stop * 3);
        sizes[stop] = dotSize;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
    var material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x664200) },
            texture: { value: new THREE.TextureLoader().load("spark1.png") }
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true
    });
    //    var material = new THREE.PointsMaterial( { size: 2, sizeAttenuation: false, color: 0x664200 } );
    dots = new THREE.Points(geometry, material);
    scene.add(dots);
    dots.visible = false;
}
function generateColorPalette() {
    var arr = matrix.reduce(function (p, c) {
        return p.concat(c);
    });
    var max = Math.max.apply(null, arr);
    min = Math.min.apply(null, arr);
    var total = max - min;
    var i = 360 / (total - 1); // distribute the colors evenly on the hue range
    for (var x = 0; x < total; x++) {
        colors.push(HSVtoRGB((i * x) / 360, 0.8, 0.8)); // you can also alternate the saturation and value for even more contrast between the colors
    }
    function HSVtoRGB(h, s, v) {
        var r, g, b;
        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0:
                r = v, g = t, b = p;
                break;
            case 1:
                r = q, g = v, b = p;
                break;
            case 2:
                r = p, g = v, b = t;
                break;
            case 3:
                r = p, g = q, b = v;
                break;
            case 4:
                r = t, g = p, b = v;
                break;
            case 5:
                r = v, g = p, b = q;
                break;
        }
        return { r: r, g: g, b: b };
    }
}
//to implement click timeout
function onDocumentDown(event) {
    lastDown = event.timeStamp;
    console.log(camera.zoom, camera.position.z);
    dots.visible = true;
    for (var t in tiles) {
        tiles[t].material.visible = false;
    }
}
function onDocumentUp(event) {
    if (event.timeStamp - lastDown <= 200) {
        click(event);
    }
    for (var t in tiles) {
        tiles[t].material.visible = true;
    }
    dots.visible = false;
}
function click(event) {
    event.preventDefault();
    var mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(tiles);
    if (intersects.length > 0) {
        var tile = intersects[0].object;
        console.log(tile);
        tile.callback();
    }
}
function setCamera() {
    var factor = 2;
    var width = window.innerWidth;
    var height = window.innerHeight;
    camera = new THREE.OrthographicCamera(-width / factor, width / factor, height / factor, -height / factor, -1000, 2000);
    camera.position.z = 300;
    camera.zoom = width / 900 * 2;
    camera.updateProjectionMatrix();
}
function setLights() {
    var ambient = new THREE.AmbientLight(0xffffff, 0.15);
    var spotLight = new THREE.SpotLight(0xffffff, 0.5);
    spotLight.position.set(70, 0, 250);
    spotLight.target.position.set(30, 0, 0);
    spotLight.castShadow = true;
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.decay = 1;
    spotLight.distance = 500;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);
    scene.add(spotLight.target);
    scene.add(ambient);
}
function setControls() {
    // Controls (when moving mouse)
    controls = new THREE.OrbitControls(camera);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.minZoom = 2;
    controls.maxZoom = 15;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = 5 * Math.PI / 6;
    controls.minAzimuthAngle = -Math.PI / 3;
    ;
    controls.maxAzimuthAngle = Math.PI / 3;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.2;
}
function makeTextSprite(message, parameters) {
    if (parameters === undefined)
        parameters = {};
    var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
    var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 80;
    var textColor = parameters.hasOwnProperty("textColor") ? parameters["textColor"] : { r: 255, g: 255, b: 255, a: 1.0 };
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = "Bold " + fontsize + "px " + fontface;
    var metrics = context.measureText(message);
    var textWidth = metrics.width;
    console.log(canvas.width);
    context.fillStyle = "rgba(" + textColor.r + ", " + textColor.g + ", " + textColor.b + ", 1.0)";
    context.fillText(message, 10, fontsize + 10);
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    var spriteMaterial = new THREE.SpriteMaterial({ map: texture,
        fog: true,
        depthWrite: true,
        depthTest: false });
    var sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
    return sprite;
}
function onWindowResize() {
    var factor = 2;
    var width = window.innerWidth;
    var height = window.innerHeight;
    console.log(factor);
    camera.left = -width / factor;
    camera.right = width / factor;
    camera.top = height / factor;
    camera.bottom = -height / factor;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function animate() {
    requestAnimationFrame(animate);
    //    controls.update();
    stats.update();
    render();
}
function animateDots() {
    if (dots.visible) {
        var time = Date.now() * 0.005;
        var geometry = dots.geometry;
        var attributes = geometry.attributes;
        for (var i = 0; i < attributes.size.array.length; i++) {
            attributes.size.array[i] = dotSize + dotSize / 2 * Math.sin(0.1 * i + time);
        }
        attributes.size.needsUpdate = true;
    }
}
function render() {
    animateDots();
    renderer.render(scene, camera);
}
//# sourceMappingURL=map.js.map