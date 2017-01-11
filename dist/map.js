"use strict";
const THREE = require("three");
require("three-lut");
const Stats = require("stats.js");
const three_text2d_1 = require("three-text2d");
const TWEEN = require("tween.js");
require('awesomplete');
var OrbitControls = require('three-orbit-controls')(THREE);
var stops = require('../res/stops.json');
var cities = require('../res/cities.json');
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
var max;
var dots;
var renderer;
var container;
var cityParameters = {
    cityName: 'Sion',
    tile_id: 377
};
var displayedCities = [];
init();
animate();
document.getElementById("opennav").style.visibility = "";
document.getElementById("opennav").onclick = function () { openNav(); };
document.getElementById("closenav").onclick = function () { closeNav(); };
function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
}
function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
}
var lcities = Object.keys(cities);
var input = document.getElementById("city");
var awesomplete = new Awesomplete(input, {
    minChars: 1,
    autoFirst: true,
    list: lcities
});
document.addEventListener("awesomplete-close", function () {
    var city = input.value;
    console.log(city);
    if (city in cities) {
        var c = cities[city];
        addCity(city, +c.ID, +c.x, +c.y);
    }
});
function init() {
    container = document.createElement('div');
    document.body.appendChild(container);
    var h1 = document.getElementById("loading");
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
    addColorPalette();
}
function addCity(name, tile_id) {
    if (name in displayedCities) {
        return;
    }
    displayedCities.push(name);
    var cityMenu = document.getElementById("cities");
    var itemMenu = document.createElement('li');
    itemMenu.classList.add('pure-menu-item');
    var linkMenu = document.createElement('a');
    linkMenu.onclick = function () {
        var tile = id_to_tile.get(tile_id);
        tile.callback();
    };
    linkMenu.classList.add('pure-menu-link');
    linkMenu.innerText = name;
    var removeButton = document.createElement('button');
    removeButton.innerHTML = '&times';
    removeButton.classList.add('closeitem');
    linkMenu.appendChild(removeButton);
    itemMenu.appendChild(linkMenu);
    cityMenu.appendChild(itemMenu);
    var sprite = new three_text2d_1.SpriteText2D(name, { align: three_text2d_1.textAlign.center, font: '35px Arial', fillStyle: '#FFFFFF', antialias: true });
    sprite.material.depthTest = false;
    var tile_pos = id_to_tile.get(tile_id).position;
    sprite.position.set(tile_pos.x - 8, tile_pos.y + 10, 100);
    sprite.scale.set(0.2, 0.2, 0.2);
    scene.add(sprite);
    var geometry = new THREE.CylinderGeometry(diameter, diameter, 0.01, 6);
    geometry.computeLineDistances();
    var material = new THREE.LineDashedMaterial({ color: 0xFFFFFF, dashSize: 1.4, gapSize: 1.7, linewidth: 2 });
    var line = new THREE.Line(geometry, material);
    var z = 2 * tile_pos.z - height_fly + 0.01;
    line.position.set(tile_pos.x, tile_pos.y, z);
    line.rotation.x = Math.PI / 2;
    line.rotation.y = Math.PI / 2;
    scene.add(line);
    var geoLine = new THREE.Geometry();
    geoLine.vertices.push(new THREE.Vector3(tile_pos.x, tile_pos.y, z));
    geoLine.vertices.push(new THREE.Vector3(tile_pos.x - 8, tile_pos.y + 5, 100));
    geoLine.computeLineDistances();
    var material = new THREE.LineDashedMaterial({ color: 0x999999, dashSize: 3, gapSize: 2, linewidth: 1 });
    var link = new THREE.Line(geoLine, material);
    scene.add(link);
    removeButton.onclick = function (e) {
        e.stopPropagation();
        displayedCities = displayedCities.filter(function (value) { value != name; });
        scene.remove(sprite);
        scene.remove(link);
        scene.remove(line);
        cityMenu.removeChild(itemMenu);
    };
}
function addTexts() {
    for (var city in cities) {
        var c = cities[city];
        if (+c.population > 70000) {
            addCity(city, +c.ID);
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
    stats.dom.style.right = '0px';
    stats.dom.style.left = '';
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
        for (var t_index in tiles) {
            var tile = tiles[t_index];
            var distance = tile.position.distanceTo(id_to_tile.get(id).position);
            var timeout = distance * 5;
            var color = new THREE.Color("hsl(" + distance * 2 + ", 80%, 70%)");
            var material = tile.material;
            function changeColor(material, color, id) {
                return () => {
                    material.color.set(color);
                };
            }
            new TWEEN.Tween(0).to(100, timeout).onComplete(changeColor(material, color, tile.id)).start();
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
    max = Math.max.apply(null, arr);
    min = Math.min.apply(null, arr);
    var total = max - min;
    var i = 360 / (total - 1);
    for (var x = 0; x < total; x++) {
        console.log((i * x) / (360 / 0.666));
        var c = HSVtoRGB((i * x) / (360 / 0.666), 0.8, 0.8);
        var color = new THREE.Color(c.r, c.g, c.b);
        colors.push(color);
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
function addColorPalette() {
    var num_colors = (max - min);
    var material = new THREE.MeshPhongMaterial({ color: 0x5e7eff, overdraw: 0.5, shading: THREE.FlatShading, shininess: 0, specular: 0 });
    var geometry = new THREE.CylinderGeometry(diameter / 1.2, diameter / 1.2, 10, 6);
    for (var i = 0; i < num_colors; i = i + 5) {
        var mat = material.clone();
        mat.color.set(colors[i]);
        var tile = new THREE.Mesh(geometry, mat);
        tile.position.set(80 + (i / 5) * diameter * 1.3, -100, 40);
        tile.rotation.x = Math.PI / 2;
        tile.rotation.y = Math.PI / 2;
        tile.updateMatrix();
        tile.matrixAutoUpdate = false;
        tile.castShadow = true;
        tile.receiveShadow = true;
        console.log(tile.material.color);
        scene.add(tile);
        if (i % 15 === 0) {
            var sprite = new three_text2d_1.SpriteText2D(i, { align: three_text2d_1.textAlign.center, font: '25px Arial', fillStyle: '#FFFFFF', antialias: true });
            sprite.material.depthTest = false;
            sprite.position.set(80 + (i / 5) * diameter * 1.3, -100, 45);
            sprite.scale.set(0.2, 0.2, 0.2);
            scene.add(sprite);
        }
        var sprite = new three_text2d_1.SpriteText2D("Travel time [minutes]", { align: three_text2d_1.textAlign.center, font: '25px Arial', fillStyle: '#FFFFFF', antialias: true });
        sprite.material.depthTest = false;
        sprite.position.set(80 + (num_colors / 10) * diameter * 1.3, -90, 45);
        sprite.scale.set(0.2, 0.2, 0.2);
        scene.add(sprite);
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
}
function onDocumentUp(event) {
    mouseDown = false;
    if (!hasMoved) {
        click(event);
    }
    for (var t in tiles) {
        tiles[t].material.visible = true;
    }
    dots.visible = false;
    hasMoved = false;
}
function click(event) {
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
    controls = new OrbitControls(camera, renderer.domElement);
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