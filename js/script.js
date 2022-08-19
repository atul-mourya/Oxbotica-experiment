import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'https://unpkg.com/three@0.143.0/examples/jsm/renderers/CSS3DRenderer.js';
import { MapControls } from 'https://unpkg.com/three@0.143.0/examples/jsm/controls/OrbitControls.js';
import InfiniteGridHelper from './InifiniteGrid.js';
import { getVehicles, getVehicle, getVehicleTelemetry } from './apis.js';

const vehiclesList = [];
let targetVehicle = null;

const canvas = document.querySelector('#canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcceeff);
scene.fog = new THREE.Fog( 0, 0.1, 0 );

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.z = 10;

var renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.pixelRatio = window.devicePixelRatio;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

var scene2 = new THREE.Scene();
const renderer2 = new CSS3DRenderer();
renderer2.setSize(window.innerWidth, window.innerHeight);
renderer2.domElement.style.position = 'absolute';
renderer2.domElement.style.top = 0;
container.appendChild(renderer2.domElement);

const controls = new MapControls(camera, container);
controls.screenSpacePanning = true;
controls.minDistance = 1;
controls.maxDistance = 500;
controls.panSpeed = 1;
controls.enableRotate = false;
controls.update();

const grid = new InfiniteGridHelper(1, 10);
grid.rotateX(Math.PI / 2);
scene.add(grid);

let defaultVehicleFocused = false;

const createHotspotElement = (vehicle) => {

    const hue = "HSL(" + Math.random() * 360 + ", 100%, 50%)";

    const wrapper = document.createElement('div');
    wrapper.className = 'hotspot-wrapper';
    container.appendChild(wrapper);
    
    const emitter = document.createElement('div');
    emitter.className = 'hotspot-emitter';
    emitter.style.backgroundColor = hue;
    emitter.id = vehicle.id;
    emitter.addEventListener('click', async (e) => {

        const info = document.querySelector('#info');
        info.style.display = 'block';
        info.querySelector('#header').innerText = vehicle.name;
        const telemetry = await getVehicleTelemetry(vehicle.id);
        targetVehicle = vehicle;
        displayVehicleInfo(telemetry);

    }, false );

    wrapper.appendChild(emitter);


    const wave = document.createElement('div');
    wave.className = 'hotspot-wave';
    emitter.appendChild(wave);

    const hotspot = new CSS3DObject(wrapper);
    hotspot.name = vehicle.id;
    hotspot.scale.set(0.01, 0.01, 1);
    scene2.add(hotspot);
    return hotspot;

}

async function displayVehicleInfo (details) {

    const info = document.querySelector('#info');
    if( info.style.display == 'none' ) return;

    info.querySelector('#speed-value').innerText = details.speed;
    info.querySelector('#battery-value').innerText = details.battery_level;
    info.querySelector('#cpu-value').innerText = details.cpu_usage;
    info.querySelector('#coords-value').innerText = `${details.lat}, ${details.lng}`;
    // battery_level: 52.9
    // cpu_usage: 49.9
    // lat: 51.73375958280051
    // lng: -1.2047088146209715
    // speed: 27.9
    // timestamp: 1660848897000
    // vehicle_id: "a8b0
};

const populateVehicles = async () => {
    const vehicles = await getVehicles();
    vehicles.forEach( async vehicle => {

        const vehicleTelemetry = await getVehicleTelemetry(vehicle.id);

        const hotspot = createHotspotElement(vehicle);
        hotspot.position.x = vehicleTelemetry.lat * 100;
        hotspot.position.y = vehicleTelemetry.lng * 100;

        const dir = hotspot.position.clone().normalize();
        const length = 1;
        const headLength =  0.2 * length;
        const headWidth = 0.5 * headLength;
        const arrowHelper = new THREE.ArrowHelper( dir, hotspot.position, length, 0x474747, headLength, headWidth );
        hotspot.direction = arrowHelper;

        scene.add( arrowHelper );

        if( !defaultVehicleFocused ) {
            controls.target.add( hotspot.position );
            camera.position.add( hotspot.position );
            controls.update();
            defaultVehicleFocused = true;
        }

        vehiclesList.push({telemetry: vehicleTelemetry, hotspot});

        render();

    });
}

const updateVehiclesTelemetry = async () => {

    vehiclesList.forEach( async vehicle => {

        const vehicleTelemetry = await getVehicleTelemetry(vehicle.telemetry.vehicle_id);
        const hotspot = vehicle.hotspot;

        const oldPos = hotspot.position.clone();

        hotspot.position.x = vehicleTelemetry.lat * 100;
        hotspot.position.y = vehicleTelemetry.lng * 100;

        const direction = getDirections(oldPos, hotspot.position);
        hotspot.direction.position.copy(hotspot.position);
        hotspot.direction.setDirection(direction);
        hotspot.direction.setLength(vehicleTelemetry.speed * 0.05);

        if (targetVehicle && targetVehicle.id == vehicle.telemetry.vehicle_id) {
            displayVehicleInfo(vehicleTelemetry);
        }

        render();

    } );
};

const getDirections = (startVector, endVector) => {
    
    var dir = new THREE.Vector3(); 
    dir.subVectors( endVector, startVector ).normalize();
    return dir;

};

const periodicUpdateAtInterval = () => {
    updateVehiclesTelemetry();
    setTimeout(periodicUpdateAtInterval, 2000);
}

const render = () => {
    console.log('render');
    renderer.render(scene, camera);
    renderer2.render(scene2, camera);
}

const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer2.setSize(window.innerWidth, window.innerHeight);
    render();
}

const _registerEventListeners = () => {

    controls.addEventListener('change', render);
    window.addEventListener('resize', resize);
}


const gotoHotspot = (id) => {
    const hotspot = scene2.getObjectByName(id);
    controls.target.copy( hotspot.position );
    camera.position.copy( hotspot.position );
    camera.position.z = 10;
    controls.update();
};

window.searchVehicleByID = async () => {

    const id = document.querySelector('#search-bar').value;
    const vehicle = await getVehicle(id);
    const vehicleTelemetry = await getVehicleTelemetry(vehicle.id);

    const info = document.querySelector('#info');
    info.style.display = 'block';
    info.querySelector('#header').innerText = vehicle.name;
    targetVehicle = vehicle;
    displayVehicleInfo(vehicleTelemetry);

    gotoHotspot(vehicle.id);

}

window.closeInfoPanel = () => {
    const info = document.querySelector('#info');
    info.style.display = 'none';
    targetVehicle = null;
}


populateVehicles();
_registerEventListeners();

setTimeout(periodicUpdateAtInterval, 5000);
