"use strict";
const THREE = require("three");
const Stats = require("stats.js");
const three_text2d_1 = require("three-text2d");
const TWEEN = require("tween.js");
var OrbitControls = require('three-orbit-controls')(THREE);
var stops = require('../res/stops.json');
var centers = require('../res/centers.json');
var nodes = require('../res/nodes.json');
var matrix = require('../res/matrix.json');
var spark1 = require("url?mimetype=image/png!../res/spark1.png");
var diameter = 3.2;
var height_fly = 30;
var height_base = 5.0;
var height_factor = 4.0;
var dotSize = 6.0;
var stats;
var camera;
var controls;
var scene;
var raycaster = new THREE.Raycaster();
var id_to_tile = new Map();
var tiles = [];
var colors = [];
var min;
var dots;
var renderer;
var container;
init();
animate();
function init() {
    container = document.createElement('div');
    document.body.appendChild(container);
    var h1 = document.getElementById("loading");
    h1.parentNode.removeChild(h1);
    scene = new THREE.Scene();
    setListeners();
    setCamera();
    setControls();
    setLights();
    setRenderer();
    setStats();
    setFloor();
    setTiles();
    addTexts();
}
function addTexts() {
    var sprite = new three_text2d_1.SpriteText2D("Merry Christmas les enfants", { align: three_text2d_1.textAlign.center, font: '50px Arial', fillStyle: '#FFFFFF', antialias: true });
    sprite.material.depthTest = false;
    sprite.position.set(48, 54, 40);
    sprite.scale.set(0.2, 0.2, 0.2);
    scene.add(sprite);
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
    generateColorPalette();
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
        var tile = new THREE.Mesh(geometry, material.clone());
        tile.position.set(t.x, t.y, height / 2 + height_fly);
        tile.rotation.x = Math.PI / 2;
        tile.rotation.y = Math.PI / 2;
        tile.updateMatrix();
        tile.matrixAutoUpdate = false;
        tile.name = "t" + t.ID;
        tile.callback = function () {
            updateMap(t.ID);
        };
        tile.castShadow = true;
        tile.receiveShadow = true;
        tiles.push(tile);
        id_to_tile.set(t.ID, tile);
        scene.add(tile);
    }
    function updateMap(id) {
        console.log("update: " + id);
        for (var t_index in tiles) {
            var tile = tiles[t_index];
            var distance = tile.position.distanceTo(id_to_tile.get(id).position);
            var timeout = distance;
            console.log(timeout);
            var color = new THREE.Color("hsl(" + distance * 2 + ", 80%, 70%)");
            var material = tile.material;
            material.color.set(color);
        }
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
            texture: { value: new THREE.TextureLoader().load(spark1) }
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true
    });
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
    var i = 360 / (total - 1);
    for (var x = 0; x < total; x++) {
        var value = +((i * x) / 360);
        colors.push(new THREE.Color("hsl(" + 0 + ", 80%, 80%)"));
    }
}
var hasMoved = false;
var mouseDown = false;
function onDocumentMove(event) {
    if (!hasMoved && mouseDown) {
        hasMoved = true;
        dots.visible = true;
        for (var t in tiles) {
            tiles[t].material.visible = false;
        }
    }
}
function onDocumentDown(event) {
    mouseDown = true;
    console.log(camera.zoom, camera.position.z);
}
function onDocumentUp(event) {
    mouseDown = false;
    for (var t in tiles) {
        tiles[t].material.visible = true;
    }
    dots.visible = false;
    hasMoved = false;
    if (!hasMoved) {
        click(event);
    }
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
    controls = new OrbitControls(camera);
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