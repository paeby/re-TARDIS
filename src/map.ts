import THREE = require("three");
import DATA = require("dat-gui");
import Stats = require("stats.js");
import { SpriteText2D, textAlign } from 'three-text2d'
import TWEEN = require('tween.js');
var OrbitControls = require('three-orbit-controls')(THREE);
var stops = require('../res/stops.json')
var cities = require('../res/cities.json')
var centers = require('../res/centers.json')
var nodes: number[] = require('../res/nodes.json')
var matrix: number[][] = require('../res/matrix.json')

var spark1 = require("url?mimetype=image/png!../res/spark1.png");
var diameter = 3.2
var height_fly = 30;
var height_base = 5.0;
var height_factor = 4.0;
var dotSize = 6.0;

// ----- THREE VARIABLES -----
var stats: Stats;
var camera: THREE.OrthographicCamera;
var controls;
var scene: THREE.Scene;
var raycaster = new THREE.Raycaster();
var id_to_tile: Map<number, CBMesh> = new Map();
var tiles: CBMesh[] = []
var colors: THREE.Color[] = []; // hold the generated colors
var min: number;
var dots: THREE.Points;
var renderer: THREE.WebGLRenderer;
var container: HTMLElement;

// ----- CUSTOM CITY SELECTOR -----
var cityParameters = {
    cityName: 'Sion',
    tile_id: 377
}
var displayedCities = []
var gui;

init();
animate();

function init() {
    container = document.createElement('div')
    document.body.appendChild(container);
    var h1 = document.getElementById("loading")
    h1.parentNode.removeChild(h1);
    scene = new THREE.Scene();
    setListeners();
    setRenderer();
    setCamera();
    setControls();
    setLights();
    setStats();
    setFloor();
    setTiles();
    addTexts();
    customCity();
}

function customCity() {
    gui = new DATA.GUI();
    var city = gui.add(cityParameters, 'cityName').listen();
    city.onChange(function(value) {
        // if city exists AND not in displayedCities:
        // need to get the tile id from "cities"   
        addCity(value, cityParameters.tile_id);
    });
    gui.open();
}

function addCity(name, tile_id) {
    var sprite = new SpriteText2D(name, { align: textAlign.center, font: '25px Arial', fillStyle: '#FFFFFF', antialias: true })
    sprite.material.depthTest = false;
    var tile_pos = id_to_tile.get(tile_id).position
    sprite.position.set(tile_pos.x, tile_pos.y-3, 40);
    sprite.scale.set(0.2, 0.2, 0.2)
    scene.add(sprite);

    // Add dashed line
    var geometry = new THREE.CylinderGeometry(diameter, diameter, 0.01, 6);
    geometry.computeLineDistances();
    var material = new THREE.LineDashedMaterial({ color: 0xFFFFFF, dashSize: 0.5, gapSize: 0.7, linewidth: 2 });
    var line = new THREE.Line(geometry, material);
    line.position.set(tile_pos.x, tile_pos.y, 2*tile_pos.z-height_fly+0.01);

    line.rotation.x = Math.PI / 2;
    line.rotation.y = Math.PI / 2;
    scene.add(line)
}

function addTexts() {
    for (var city in cities) {
        var c = cities[city];
        if(c.population > 50000) {
            // Add sprite
            addCity(c.name, c.ID)
        }
    }
}

function setListeners() {
    document.addEventListener('mousedown', onDocumentDown, false);
    document.addEventListener('mouseup', onDocumentUp, false);
    document.addEventListener('mousemove', onDocumentMove, false);
    window.addEventListener('resize', onWindowResize, false);
}

function setFloor() {
    var geoFloor = new THREE.BoxGeometry(4000, 4000, 1);
    var matFloor = new THREE.MeshPhongMaterial({ color: 0x323232 });
    var mshFloor = new THREE.Mesh(geoFloor, matFloor);
    mshFloor.receiveShadow = true;
    scene.add(mshFloor);

}
function setRenderer() {
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



function setStats() {
    stats = new Stats();
    document.body.appendChild(stats.dom);
}

function setTiles() {
    // Color palette for different distances
    generateColorPalette();

    // Create points from stops
    genPoints();

    genTiles();

}

interface CBMesh extends THREE.Mesh {
    callback: () => any
}
function genTiles() {
    var material = new THREE.MeshPhongMaterial({ color: 0x5e7eff, overdraw: 0.5, shading: THREE.FlatShading, shininess: 0, specular: 0 });


    for (var c in centers) {
        createTile(centers[c])
    }


    function createTile(t) {
        var height = t.h * height_factor + height_base;
        var geometry = new THREE.CylinderGeometry(diameter, diameter, height, 6);
        var tile: CBMesh = <CBMesh>new THREE.Mesh(geometry, material.clone())

        tile.position.set(t.x, t.y, height / 2 + height_fly)
        tile.rotation.x = Math.PI / 2;
        tile.rotation.y = Math.PI / 2;
        tile.updateMatrix();
        tile.matrixAutoUpdate = false;


        tile.name = "t" + t.ID;
        tile.callback = function () {
            updateMap(t.ID)
        }

        tile.castShadow = true;
        tile.receiveShadow = true;

        tiles.push(tile);
        id_to_tile.set(t.ID, tile);
        scene.add(tile);
    }


    function updateMap(id: number) {
        //console.log("update: " + id)
        for (var t_index in tiles) {
            var tile = tiles[t_index];
            var distance = tile.position.distanceTo(id_to_tile.get(id).position)
            var timeout = distance*5 //the more distance there is, the more timeout (for a wave effect)
            //console.log(timeout)
            var color = new THREE.Color("hsl("+distance*2+", 80%, 70%)")
            var material = <THREE.MeshPhongMaterial>tile.material;
            function changeColor(material, color, id):() => any {
                return () => {
                //Shoud launch another tween to fade the color. But im lazy
                material.color.set(color);
                }
            }
            new TWEEN.Tween(0).to(100, timeout).onComplete(changeColor(material, color, tile.id)).start()
        }
    }

}


function genPoints() {

    var amount = stops.length
    var positions = new Float32Array(amount * 3);
    var sizes = new Float32Array(amount);
    var colors = new Float32Array(amount * 3);
    var vertex: any = new THREE.Vector3();
    for (var stop in stops) {
        var s = stops[stop];
        var height = s.h * height_factor + height_base + 0.2 + height_fly;
        vertex.x = s.x
        vertex.y = s.y
        vertex.z = height
        vertex.toArray(positions, <any>stop * 3);
        sizes[stop] = dotSize;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));

    var material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x664200) },
            texture: { value: new THREE.TextureLoader().load(spark1) }
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
        var value = + ((i * x) / 360) 
        colors.push(new THREE.Color("hsl("+ value + ", 80%, 80%)")); // you can also alternate the saturation and value for even more contrast between the colors
    }
}

var hasMoved = false;
var mouseDown = false;
function onDocumentMove(event) {
    if (!hasMoved && mouseDown) {
        hasMoved = true
        dots.visible = true;
        for (var t in tiles) {
            tiles[t].material.visible = false;
        }
    }

}
//to implement click timeout
function onDocumentDown(event) {
    mouseDown = true
    console.log(camera.zoom, camera.position.z);
}

function onDocumentUp(event) {
    mouseDown = false
    if (!hasMoved) {
        click(event)
    }
    for (var t in tiles) {
        tiles[t].material.visible = true;
    }
    dots.visible = false;
    hasMoved = false
}

function click(event) {
    //event.preventDefault();
    var mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = - (event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(tiles);
    if (intersects.length > 0) {
        var tile = <CBMesh>intersects[0].object;
        console.log(tile);
        tile.callback();
    }
}

function setCamera() {
    var factor = 2;
    var width = window.innerWidth;
    var height = window.innerHeight;
    camera = new THREE.OrthographicCamera(
        -width / factor, width / factor, height / factor, -height / factor, -1000, 2000);
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
    controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.minZoom = 2;
    controls.maxZoom = 15;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = 5 * Math.PI / 6;
    controls.minAzimuthAngle = -Math.PI / 3;;
    controls.maxAzimuthAngle = Math.PI / 3;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.2;
}

function makeTextSprite(message, parameters) {
    if (parameters === undefined) parameters = {};
    var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
    var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 80;
    var textColor = parameters.hasOwnProperty("textColor") ? parameters["textColor"] : { r: 255, g: 255, b: 255, a: 1.0 };

    var canvas = document.createElement('canvas');

    var context = canvas.getContext('2d');
    context.font = "Bold " + fontsize + "px " + fontface;
    var metrics = context.measureText(message);
    var textWidth = metrics.width;
    console.log(canvas.width)
    context.fillStyle = "rgba(" + textColor.r + ", " + textColor.g + ", " + textColor.b + ", 1.0)";
    context.fillText(message, 10, fontsize + 10);

    var texture = new THREE.Texture(canvas)
    texture.needsUpdate = true;

    var spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        fog: true,
        depthWrite: true,
        depthTest: false
    });
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
    TWEEN.update();
    stats.update();
    render();

}

function animateDots() {
    if (dots.visible) {
        var time = Date.now() * 0.005;
        var geometry: any = dots.geometry;
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
