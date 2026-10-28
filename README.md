Vulkan Grass Rendering
==================================

**University of Pennsylvania, CIS 565: GPU Programming and Architecture, Project 4**

* Christopher Yuen
  * [LinkedIn](https://www.linkedin.com/in/christopher-yuen-16b5a8221/)
* Tested on: Windows 11, 14th Gen Intel(R) Core(TM) i9-14900HX @ 2.22GHz 32GB, RTX 4090 Laptop GPU 16GB (Personal Laptop)

## Final Render
[Demo GIF](/img/demo.gif)


## Overview
This project implements a real-time, physically-based grass simulator and renderer using Vulkan and Compute Shaders. Following the paper [Responsive Real-Time Grass Rendering for General 3D Scenes](https://www.cg.tuwien.ac.at/research/publications/2017/JAHRMANN-2017-RRTG/JAHRMANN-2017-RRTG-draft.pdf), grass blades are represented as Bezier curves. The GPU handles force simulations (gravity, recovery, wind), parallel culling (orientation, frustum, distance), and dynamic tessellation to generate high-density fields of grass. To push the visual quality further, I implemented a procedural skybox and advanced shading techniques inspired by *Ghost of Tsushima*, including root-to-tip color gradients, ambient occlusion, and fake subsurface scattering.

## Features Implemented

### 1. Physics Simulation (Compute Shader)
The compute shader runs a full physics pass on every blade before any rendering occurs. The forces applied are:
*   **Gravity:** Both environmental gravity and a "front gravity" term to ensure blades bend naturally based on their facing direction.
*   **Recovery:** Hooke's Law is used to bring blades back to their original `iv2` position based on their stiffness coefficient.
*   **Wind:** A custom sinusoidal wind function that varies based on time and world position. A "wind alignment" term ensures blades facing the wind are pushed harder.
*   **Length Correction:** After forces are applied, the vertices are corrected so the blade maintains its original length and doesn't stretch.

| Baseline (No Force) | Gravity Only |
| :---: | :---: |
| <img alt="no force image" src="https://github.com/user-attachments/assets/6bbf52ba-c6b5-4421-88f8-7063691b9d14" /> | <img alt="gravity only" src="https://github.com/user-attachments/assets/657e2bc7-5510-4863-9216-cce05ebd41fa" /> |

| Gravity + Recovery | All Forces (Wind Active) |
| :---: | :---: |
| <img alt="grav + recovery image" src="https://github.com/user-attachments/assets/6ffea061-c59b-479b-902b-2c9799cb2aa6" /> | <img alt="all forces image" src="https://github.com/user-attachments/assets/6b770a79-1764-4675-9504-6c30ccc57c72" /> |

### 2. Culling Tests
To maintain high performance, the compute shader culls blades that won't contribute to the final frame. I implemented all three culling heuristics from the paper:
*   **Orientation Culling:** Culls blades whose front face is nearly perpendicular to the view vector.
*   **View-Frustum Culling:** Checks the visibility of `v0`, `v2`, and the curve midpoint `m` against the camera frustum with a tolerance buffer.
*   **Distance Culling:** Divides the view distance into buckets and probabilistically culls blades in farther buckets.

| No Culling | Orientation Culling |
| :---: | :---: |
| <img alt="no culling image" src="https://github.com/user-attachments/assets/fe50142d-21fa-4635-be0e-8c10473145be" /> | [Orientation Culling GIF](/img/orientation_cull_demo.gif) |

| View-Frustum Culling | Distance Culling |
| :---: | :---: |
| [Frustum Culling GIF](/img/frustum_cull_demo.gif) | [Distance Culling GIF](/img/dist_cull_demo.gif) |

### 3. Tessellation Pipeline
Instead of passing thousands of vertices from the CPU, the graphics pipeline uses **Tessellation Control (TESC)** and **Tessellation Evaluation (TESE)** shaders. 
*   The TESC shader sets dynamic tessellation levels.
*   The TESE shader evaluates the Bezier curve using De Casteljau's algorithm and extrudes the width along the face direction.
*   **Blade Shape:** I tapered the width using `pow(1.0 - v, 1.5)` so the grass forms a sharp, organic triangle tip rather than a rectangle.

### 4. Better Rendering 
To go beyond the base requirements, I enhanced the visuals to make the scene more immersive:
*   **Procedural Skybox:** A full-screen triangle rendered behind the scene with a mathematical gradient (zenith to horizon), avoiding the need for expensive cubemap textures.
*   **Subsurface Scattering:** Added a fake translucency term in the fragment shader so grass tips glow when light shines from behind.
*   **Ambient Occlusion:** Blades are naturally darker at the roots and brighter at the tips, simulating self-shadowing.

## Performance Analysis

