import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import { OrbitControls } from 'OrbitControls';
import Stats from 'Stats'

class Camera {
    constructor() {
        this.pivot = new THREE.Object3D();
        
        this.mainCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
        this.mainCamera.position.y = 6;
        
        this.mainCamera.lookAt(this.pivot.position);
    }
}

const root = 'models/';
const names = ['Bankura', 'Barddhaman', 'Birbhum', 'Coochbihar', 'Dakshin Dinajpur', 'Darjeeling', 'Howrah', 'Hugli', 'Jalpaiguri', 'Kolkata', 'Maldah', 'Murshidabad', 'Nadia', 'North24Pgs', 'Paschim Medinipur', 'Purba Medinipur', 'Purulia', 'South24Pgs', 'Uttar Dinajpur'];

let modelPtr = [];
let isRunning = true;
let index = -1;

const lists = document.querySelectorAll('li');
for(var i = 0; i < lists.length; i++)
{
    lists[i].addEventListener('mouseover', function (e) {
        for(var j = 0; j < lists.length; j++)
        {
            if(e.target.textContent === names[j]){
                index = j;
                break;
            }
        }
    });
}
const ul = document.querySelector('ul');
ul.addEventListener('mouseleave', function() {
    index = -1;
});

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf8f8f8, 0.1, 1000);

const camera = new Camera();
console.log(camera.mainCamera.position);

const renderer = new THREE.WebGLRenderer( {antialias: true} );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor(0xFFFAF2, 0.8);
renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );

createLights();

var defaultMaterial;
var defaultColor = new THREE.Color(0xf0f0f0);
var hoverColor = new THREE.Color(0xF56E67);
setupMaterials();

const loader = new GLTFLoader();
for(var i = 0; i < names.length; i++) {
    loadFile(i);
}

const stats = Stats();
document.body.appendChild(stats.dom);

window.addEventListener('focus', function () { isRunning = true; });
window.addEventListener('focusout', function () { isRunning = false; });

window.addEventListener('resize', (e) => {
    renderer.setSize( window.innerWidth, window.innerHeight );
    camera.mainCamera.aspect = window.innerWidth / window.innerHeight;
    camera.mainCamera.updateProjectionMatrix();
});

function loop(){
    update();
    requestAnimationFrame( loop );
    renderer.render( scene, camera.mainCamera );
}
loop();

function update()
{
    if(!isRunning) return;

    modelAnimationHandler();
    updateCamera();

    stats.update();
}

function updateCamera() {
    if(index === -1){
        for(var i = 0; i < modelPtr.length; i++) {
            modelPtr[i].remove(camera.pivot);
        }
        camera.pivot.remove(camera.mainCamera);
        camera.mainCamera.position.lerp(new THREE.Vector3(0, 6, 0), 0.5);
        camera.mainCamera.lookAt(0, 0, 0);
    } else {
        modelPtr[index].add(camera.pivot);
        camera.pivot.add(camera.mainCamera);
        camera.pivot.rotation.y += 0.001;

        var cameraY = getFinalHeight(modelPtr[index]);
        var cameraZ = 0.45;

        var cameraPivotFinalLocation = getCenter(modelPtr[index].geometry.boundingBox);
        var cameraLocationPosition = new THREE.Vector3(0, cameraY, cameraZ);
        // var cameraLookAtQuaternion = getLookAtQuaternion(cameraLocationPosition, cameraPivotFinalLocation); //quaternion.y only

        camera.pivot.position.lerp(cameraPivotFinalLocation, 0.1);
        camera.mainCamera.position.lerp(cameraLocationPosition, 0.1);
        camera.mainCamera.lookAt(cameraPivotFinalLocation);
        // camera.mainCamera.quaternion.slerp(cameraLookAtQuaternion, 0.1);

    }

}

function modelAnimationHandler() {
    if(index != -1)
    {
        if(modelPtr[index].position.y < 0.25) modelPtr[index].position.y += 0.01;
        if(modelPtr[index].position.y > 0.25) modelPtr[index].position.y = 0.25;
        
        modelPtr[index].material.color.lerp(hoverColor, 0.1);
    }

    for(var i = 0; i < modelPtr.length; i++)
    {
        if(index === i) continue;

        if(modelPtr[i].position.y > 0) modelPtr[i].position.y -= 0.03;
        if(modelPtr[i].position.y < 0) modelPtr[i].position.y = 0;
        modelPtr[i].material.color.lerp(defaultColor, 0.2);
    }
}

function loadFile(i)
{
    loader.load( root + names[i] + '.gltf', function ( gltf ) {

        gltf.scene.traverse(function (child) {
            if(child.isMesh)
            {
                child.material = defaultMaterial.clone();
                child.receiveShadow = true;
                child.castShadow = true;

                child.geometry.computeBoundingBox();
                child.geometry.boundingBox.translate(new THREE.Vector3(0, 0.25, 0));

                modelPtr.push(child);
                scene.add(child);
            }
        });
    }, 
    ( xhr ) => {
        console.log(names[i] + ' ' + (xhr.loaded / xhr.total) * 100 + '% loaded');
    }, 
    ( error ) => {
        console.error( error );
    } );
}

function getFinalHeight(object) {
    var boundingBox = object.geometry.boundingBox;

    const size = getSize(boundingBox);

    const maxDim = Math.max( size.x, size.z );
    let fov = camera.mainCamera.fov * ( Math.PI / 180 );
    let cameraY = Math.abs( maxDim * Math.tan( fov / 2 ) );

    return cameraY;
}

function getCenter(boundingBox) {
    const center = new THREE.Vector3();
    center.x = (boundingBox.max.x  + boundingBox.min.x) * 0.5;
    center.y = (boundingBox.max.y  + boundingBox.min.y) * 0.5;
    center.z = (boundingBox.max.z  + boundingBox.min.z) * 0.5;
    return center;
}

function getSize(boundingBox) {
    const size = new THREE.Vector3();
    size.x = boundingBox.max.x - boundingBox.min.x;
    size.y = boundingBox.max.y - boundingBox.min.y;
    size.z = boundingBox.max.z - boundingBox.min.z;
    return size;
}

function createLights() {
    const directionalLightTarget = new THREE.Object3D();
    directionalLightTarget.translateX(0.002);
    directionalLightTarget.translateZ(0.01);
    scene.add(directionalLightTarget);

    const directionalLight = new THREE.DirectionalLight( 0xf1f1f1, 0.8 );
    directionalLight.target = directionalLightTarget;
    directionalLight.position.set(10, 6, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.radius = 2;
    directionalLight.shadow.mapSize.width = directionalLight.shadow.mapSize.height = 2048 * 4;
    scene.add( directionalLight );

    // scene.add(new THREE.DirectionalLightHelper(directionalLight, 15));

    const ambientLight = new THREE.AmbientLight( 0xEBF2F2, 0.6);
    scene.add( ambientLight );
}

function setupMaterials()
{
    defaultMaterial = new THREE.MeshLambertMaterial( {color: 0xf0f0f0} );
    defaultMaterial.castShadow = true;
    defaultMaterial.receiveShadow = true;
}