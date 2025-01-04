
# BoxingVR

Welcome to **BoxingVR**, an assignment for the subject **IG (Graphical Informatics)**. Although the subject is in Spanish, I have written this README in English as it is more beneficial for my CV.

**BoxingVR** is a virtual reality game where you can box a punching bag. As simple as that.

This project involves:
1. Rotational dynamics and kinematics.
2. Pendulums and damped oscillations.

![Screenshot](https://github.com/user-attachments/assets/ba487035-a7bd-4b93-913a-da4094dcc3a1)

---

# How It Works

## Angular Motion: Dynamics and Kinematics

The core of this project revolves around angular motion, so we must understand the relevant kinematics and dynamics equations.

The foundational equations of angular kinematics are:

$$
d\theta = \omega \cdot dt
$$

$$
d\omega = \alpha \cdot dt
$$

From these, we can derive specific cases. For instance, in constant angular motion:

If:

$$
\alpha = 0
$$

Then:

$$
d\omega = 0 \cdot dt
$$

And:

$$
\omega = \int 0 \cdot dt = \text{constant}
$$

This means the body moves at a constant angular velocity.

In the simulation, we implement these calculations in a `Rigidbody` class, responsible for storing the current angular velocity of the punching bag and applying the torques and impulses.

### `Rigidbody` Class Implementation

```typescript
class Rigidbody {  
    public w = [0, 0];  
    public mesh: THREE.Mesh;  
    public torque: ((mesh: Rigidbody) => number[])[];  
    public mass: number = 1;  
  
    constructor(mesh: THREE.Mesh) {  
        this.mesh = mesh;  
        this.torque = [];  
    }  
  
    public addTorque(t: (mesh: Rigidbody) => number[]) {  
        this.torque.push(t);  
    }  
  
    public addImpulse(t: (mesh: Rigidbody) => number[], time: number) {  
        const index = this.torque.length;  
        this.torque.push(t);  
  
        setTimeout(() => {  
            this.torque.splice(index, 1);  
        }, time);  
    }  
  
    public updatePhysics(dt: number) {  
        const totalTorque = this.torque.reduce((x, y) => {  
            const torque = y(this);  
            return [x[0] + torque[0], x[1] + torque[1]];  
        }, [0, 0]);  
  
        this.w = [this.w[0] + totalTorque[0] * dt / this.mass, this.w[1] + totalTorque[1] * dt / this.mass];  
        this.mesh.rotation.set(this.mesh.rotation.x + this.w[0], 0, this.mesh.rotation.z + this.w[1]);  
    }  
}
```

### Explanation

1. The field `w` represents the angular velocity vector. It's a 2D vector because the bag behaves like a mathematical pendulum, which has constraints (constant length) and only two degrees of freedom (x- and z-axes).
2. The angular kinematics equations used in the `updatePhysics` method are:

$$
\omega(t + dt) = \omega(t) + \alpha(t) \cdot dt
$$

$$
\theta(t + dt) = \theta(t) + \omega(t + dt) \cdot dt
$$

3. Angular acceleration is calculated using torque and dynamics. The torque equation is:

$$
\tau = \mathbf{F} \times \mathbf{r}
$$

And angular acceleration:

$$
\alpha = \frac{\tau}{I}
$$

For simplification:
- \( I = m \): We treat the bag as a point mass to avoid complex moment of inertia calculations.
- \( r = 1 \): The distance vector is constant.

So:

$$
\alpha_x = \frac{F_x}{m}
$$

$$
\alpha_y = \frac{F_y}{m}
$$

These calculations are implemented in:

```typescript
const totalTorque = this.torque.reduce((x, y) => {  
    const torque = y(this);  
    return [x[0] + torque[0], x[1] + torque[1]];  
}, [0, 0]);  

this.w = [this.w[0] + totalTorque[0] * dt / this.mass, this.w[1] + totalTorque[1] * dt / this.mass];
```

---

## Pendulum Motion

The punching bag follows the motion of a mathematical pendulum. Its equation of motion is:

$$
\ddot \theta + \left(\frac{g}{l}\right) \cdot \theta = 0
$$

From this, the angular acceleration is:

$$
\alpha(\theta) = -\left(\frac{g}{l}\right) \cdot \theta
$$

In the code, we simulate this using:

```typescript
rb.addTorque((rb) => [-rb.mesh.rotation.x * 5 / 9.8, -rb.mesh.rotation.z * 9.8 / 5]);
```

### Damping

To simulate the bag's oscillations gradually stopping, we add a damping torque:

$$
\tau = \gamma \cdot \omega
$$

This is implemented as:

```typescript
rb.addTorque((rb) => [-Math.pow(rb.w[0], 1) * gamma, -Math.pow(rb.w[1], 1) * gamma]);
```

---

## Punching Dynamics

Punching involves detecting collisions between the gloves and the bag. We define bounding boxes for collision detection:

```typescript
const bagBoundingBox = new THREE.Box3();  
const gloveLeftBoundingBox = new THREE.Box3();  
const gloveRightBoundingBox = new THREE.Box3();
```

When a collision occurs, we calculate the displacement vector, normalize it, and apply the punching force:

```typescript
function checkCollisions() {  
    if (bagBoundingBox.intersectsBox(gloveLeftBoundingBox)) {  
        const dv = controllerL.position.clone().sub(rb.mesh.position);  
        const normal = dv.clone().normalize();  
        rb.w = [normal.z * punchForce * lVelocity, -normal.x * punchForce * lVelocity];  
    }  
    if (bagBoundingBox.intersectsBox(gloveRightBoundingBox)) {  
        const dv = controllerR.position.clone().sub(rb.mesh.position);  
        const normal = dv.clone().normalize();  
        rb.w = [normal.z * punchForce * rVelocity, -normal.x * punchForce * rVelocity];  
    }  
}
```

---

## Models

The models used in this project are credited to:

### Boxing Ring:
- **Source**: [Boxing Ring](https://sketchfab.com/3d-models/boxing-ring-861f09ce71014e4baebeb79b2f99b1d2)
- **Author**: [Bornx](https://sketchfab.com/bornx)

### Boxing Glove:
- **Source**: [Boxing Glove](https://sketchfab.com/3d-models/boxing-glove-5b464201104949e09f77f2d1cf8b60c3)
- **Author**: [Incg5764](https://sketchfab.com/incg5764)

### Punching Bag:
- **Source**: [Punching Bag](https://sketchfab.com/3d-models/punching-bagboxing-bag-6b195883ada144d0a5d92f7ddcdfaf05)
- **Author**: [CAL21](https://sketchfab.com/CAL21)

