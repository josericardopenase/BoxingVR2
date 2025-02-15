import * as THREE from 'three';
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import "./style.css"



const sphere = new THREE.SphereGeometry(0);
const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff
});

const bag = new THREE.Mesh(sphere, mat)
bag.position.set(0, 3, -1.3)

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.21, 2, 2)
const listener = new THREE.AudioListener();
camera.add( listener );

const sound = new THREE.Audio( listener );
const sound2 = new THREE.Audio( listener );

// load a sound and set it as the Audio object's buffer
const audioLoader = new THREE.AudioLoader();
audioLoader.load( '/punch2.mp3', function( buffer ) {
    sound.setBuffer( buffer );
    sound.setVolume(1 );
});

audioLoader.load( '/epic.mp3', function( buffer ) {
    sound2.setBuffer( buffer );
    sound2.setVolume(0.4);
    sound2.play(5)
    // @ts-ignore
    sound2.loop(true)
});

window.onload = () => {
    const button = document.getElementById("VRButton");
    if(button){
        button.innerText = "Start playing"
    }

}


const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

var controllerModelFactory = new XRControllerModelFactory();
const controllerL = renderer.xr.getControllerGrip(0);
const controllerR = renderer.xr.getControllerGrip(1);

const model1 = controllerModelFactory.createControllerModel(controllerL);
controllerL.add(model1);
scene.add(controllerL);
const model2 = controllerModelFactory.createControllerModel(controllerR);
controllerR.add(model2);
scene.add(controllerR);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 50, 50);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

const loader = new GLTFLoader();
let bagMesh !: THREE.Mesh;

const bagBoundingBox = new THREE.Box3();
const gloveLeftBoundingBox = new THREE.Box3();
const gloveRightBoundingBox = new THREE.Box3();

loader.load("/ring/scene.gltf", (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.position.set(0, -0.8, 0);
    gltf.scene.scale.set(0.9, 0.9, 0.9);
});

loader.load("/garage/scene.gltf", (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.position.set(0, 2, 0);
    gltf.scene.scale.set(0.5, 0.5, 0.5);
});

loader.load("/glove/scene.gltf", (gltf) => {
    controllerR.add(gltf.scene);
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.scale.set(-0.025, 0.025, 0.025);
    gltf.scene.rotation.set(-2.2, 0, 0);
});

loader.load("/glove/scene.gltf", (gltf) => {
    controllerL.add(gltf.scene);
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.scale.set(0.025, 0.025, 0.025);
    gltf.scene.rotation.set(-2.2, 0, 0);
});

loader.load("bag/scene.gltf", (gltf) => {
    bag.add(gltf.scene);
    bagMesh = gltf.scene as any;
    bagMesh.position.set(0, -3.5, 0);
    bagMesh.scale.set(30, 30, 30);
});



bag.rotation.set(0.5, 0, 0.5)

function updateBoundingBoxes() {
    if (bagMesh) bagBoundingBox.setFromObject(bagMesh);
    gloveLeftBoundingBox.setFromObject(controllerL);
    gloveRightBoundingBox.setFromObject(controllerR);
}

scene.add(bag)






class Rigidbody{
    public w = [0, 0]
    public mesh : THREE.Mesh
    public torque : ((mesh: Rigidbody) => number[])[]
    public mass : number = 1;
    public momentOfInertia : (mass: number, mesh: THREE.Mesh) => number

    constructor(mesh : THREE.Mesh) {
        this.mesh = mesh;
        this.torque = []
        this.momentOfInertia = (mass) => mass
    }

    public setMomentOfInertia(eq: (mass: number, mesh: THREE.Mesh) => number) {
        this.momentOfInertia = eq;
    }

    public addTorque(t:(mesh: Rigidbody) => number[]){
        this.torque.push(t);
    }

    public addImpulse(t:(mesh: Rigidbody) => number[], time: number){
        const index = this.torque.length;  // Store the current index to remove the impulse later
        this.torque.push(t);  // Add the impulse to the torque array

        // Remove the impulse after the specified time
        setTimeout(() => {
            this.torque.splice(index, 1);  // Remove the impulse from the array
        }, time);
    }

    updatePhysics(dt: number){
        const totalTorque = this.torque.reduce((x, y) =>  {
            const torque = y(this)
            return [x[0] + torque[0], x[1] + torque[1]]
        }, [0, 0])
        this.w = [this.w[0] + totalTorque[0]*dt/this.momentOfInertia(this.mass, this.mesh), this.w[1] + totalTorque[1]*dt/this.momentOfInertia(this.mass, this.mesh)]
        this.mesh.rotation.set(this.mesh.rotation.x+this.w[0], 0, this.mesh.rotation.z+this.w[1])
    }

}

const rb = new Rigidbody(bag)
rb.setMomentOfInertia((mass, mesh) => mass*(1/2)*mesh.scale.y)
rb.mass = 20

const punchForce = 0.02;

//oscilador armonico
rb.addTorque((rb) => [-rb.mesh.rotation.x*200/9.8, -rb.mesh.rotation.z*200/9.8])
//oscilaciones atenuadas
const gamma = 60
rb.addTorque((rb) => [-Math.pow(rb.w[0], 1)*gamma, -Math.pow(rb.w[1], 1)*gamma])
bag.rotation.set(1, 0, 0)


function checkCollisions() {
    if (bagBoundingBox.intersectsBox(gloveLeftBoundingBox)) {
        const r = bag.position.y - controllerL.position.y;
        const dv = controllerL.position.clone().sub(rb.mesh.position);  // Displacement vector from the bag to the glove
        const normal = dv.clone().normalize();  // Normal vector pointing from the center of the bag to the point of collision

        // The magnitude of the force will depend on the vector distance
        const forceMagnitude = dv.length();  // The length of the displacement vector (distance)

        // Applying torque in the direction of the normal (the vector pointing to the glove)
        // This creates a rotational force based on the angle between the collision direction and the bag's position
        const torque = new THREE.Vector3().crossVectors(dv, new THREE.Vector3(1, 0, 1)).normalize();  // A perpendicular vector
        rb.w = [rb.w[0] + (normal.z * punchForce * Math.max(lVelocity, 0) * r), rb.w[1] + (-normal.x * punchForce * Math.max(lVelocity, 0) * r)];
        console.log(`Applied torque:`, torque);
        console.log(`Applied force magnitude: ${forceMagnitude}`);
        if(lVelocity > 0.5){
            sound.stop()
            sound.setVolume(Math.max(lVelocity, 1))
            sound.play()
        }
    }
    if (bagBoundingBox.intersectsBox(gloveRightBoundingBox)) {
        const r = bag.position.y - controllerR.position.y;
        const dv = controllerR.position.clone().sub(rb.mesh.position);  // Displacement vector from the bag to the glove
        const normal = dv.clone().normalize();  // Normal vector pointing from the center of the bag to the point of collision

        // The magnitude of the force will depend on the vector distance
        const forceMagnitude = dv.length();  // The length of the displacement vector (distance)

        // Applying torque in the direction of the normal (the vector pointing to the glove)
        // This creates a rotational force based on the angle between the collision direction and the bag's position
        const torque = new THREE.Vector3().crossVectors(dv, new THREE.Vector3(1, 0, 1)).normalize();  // A perpendicular vector
        rb.w = [rb.w[0] + (normal.z * punchForce * Math.max(rVelocity, 0) * r), rb.w[1] + (-normal.x * punchForce * Math.max(rVelocity, 0) * r)];
        console.log(`Applied torque:`, torque);
        console.log(`Applied force magnitude: ${forceMagnitude}`);
        if(rVelocity > 0.5){
            sound.stop()
            sound.setVolume(Math.max(rVelocity, 1))
            sound.play()
        }
    }
}
let rVelocity = 0;
let lVelocity =0;

let rLastPosition = (controllerR).position.clone()
let lLastPosition = controllerL.position.clone()



const dt = 0.01
function animate() {
    rb.updatePhysics(dt)
    rVelocity = rLastPosition.clone().sub(controllerR.position).length()/0.05
    rLastPosition = controllerR.position.clone()
    lVelocity = lLastPosition.clone().sub(controllerL.position).length()/0.02
    lLastPosition = controllerL.position.clone()
    updateBoundingBoxes();
    checkCollisions();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
