Vulkan Grass Rendering
==================================

**University of Pennsylvania, CIS 565: GPU Programming and Architecture, Project 5**

* Christopher Yuen
  * [LinkedIn](https://www.linkedin.com/in/christopher-yuen-16b5a8221/)
* Tested on: Windows 11, 14th Gen Intel(R) Core(TM) i9-14900HX @ 2.22GHz 32GB, RTX 4090 Laptop GPU 16GB (Personal Laptop)

## Final Render
![Demo GIF](/img/demo.gif)


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
| <img alt="no force image" src="https://github.com/user-attachments/assets/6bbf52ba-c6b5-4421-88f8-7063691b9d14" /> ![baseline GIF](/img/baseline.gif) | <img alt="gravity only" src="https://github.com/user-attachments/assets/657e2bc7-5510-4863-9216-cce05ebd41fa" /> ![gravity GIF](/img/gravity.gif) |

| Gravity + Recovery | All Forces (Wind Active) |
| :---: | :---: |
| <img alt="grav + recovery image" src="https://github.com/user-attachments/assets/6ffea061-c59b-479b-902b-2c9799cb2aa6" /> ![recovery GIF](/img/recovery.gif) | <img alt="all forces image" src="https://github.com/user-attachments/assets/6b770a79-1764-4675-9504-6c30ccc57c72" /> ![forces GIF](/img/forces.gif) |

### 2. Culling Tests
To maintain high performance, the compute shader culls blades that won't contribute to the final frame. I implemented all three culling heuristics from the paper:
*   **Orientation Culling:** Culls blades whose front face is nearly perpendicular to the view vector.
*   **View-Frustum Culling:** Checks the visibility of `v0`, `v2`, and the curve midpoint `m` against the camera frustum with a tolerance buffer.
*   **Distance Culling:** Divides the view distance into buckets and probabilistically culls blades in farther buckets.

| No Culling | Orientation Culling |
| :---: | :---: |
| <img alt="no culling image" src="https://github.com/user-attachments/assets/fe50142d-21fa-4635-be0e-8c10473145be" /> | ![Orientation Culling GIF](/img/orientation_cull_cut.gif) |

| View-Frustum Culling | Distance Culling |
| :---: | :---: |
| ![Frustum Culling GIF](/img/frustum_cull_cut.gif) | ![Distance Culling GIF](/img/dist_cull_cut.gif) |

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
All tests were run on the RTX 4090 Laptop GPU at a resolution of 1280x720. 

### Impact of Blade Count
As the number of blades increases, the compute shader has to do more physics calculations and the graphics pipeline has to tessellate more geometry. However, because the culling tests are highly effective, the rendering pipeline scales incredibly well.

| Number of Blades | FPS (All Culling) | FPS (No Culling) |
| :--- | :--- | :--- |
| 8,192 (`1 << 13`) | 606 | 532 |
| 32,768 (`1 << 15`) | 583 | 452 |
| 262,144 (`1 << 18`)| 169 | 63 |

<ins>Analysis:</ins> With all culling enabled, the performance drop from 8k to 262k blades is relatively minor (606 to 169 FPS) because the vast majority of blades are culled before rasterization. Without culling, the GPU is forced to tessellate and rasterize hundreds of thousands of blades, causing a massive frame rate drop (a 63% drop at max density). This proves that while modern GPUs like the RTX 4090 have immense compute power, tessellating 262k blades is still a heavy bottleneck without spatial heuristics.

### Impact of Culling
Culling is essential for maintaining a playable frame rate at high blade densities. The tests below were run with 262,144 blades.

| Configuration | FPS |
| :--- | :--- |
| No Culling (Forced Render) | 64 |
| All Culling Enabled | 178 |
| Looking at Sky (Full Frustum Cull) | 1148 |

<img width="720"  alt="impact of culling graph" src="https://github.com/user-attachments/assets/317f9d5c-1cb9-4490-92c2-f45600845eba" />


<ins>Analysis:</ins> 
*   **All Culling Enabled** provides a 2.8x performance boost over forcing all blades to render, bumping the frame rate from 64 to 178 FPS.
*   **Orientation Culling** provides the largest baseline boost, as it removes up to 50% of the blades immediately (those facing away from the camera). 
*   **View-Frustum Culling** provides dynamic savings based on camera angle. When looking at the sky, the FPS spikes to **1148** because the graphics pipeline has absolutely nothing to draw. This massive spike reveals that the compute shader physics and culling passes are incredibly cheap (taking only a fraction of a millisecond), and the true bottleneck in this application is rasterization and geometry processing.
*   **Distance Culling** helps maintain performance when zooming out, ensuring the GPU doesn't waste time rendering sub-pixel geometry in the far distance.

## Build 

### Prerequisites
* **Vulkan SDK:** Tested with version 1.4.363.0. Ensure the `VK_SDK_PATH` environment variable is set.
* **CMake:** Version 3.5 or higher (Note: CMake 4.x will require the workarounds mentioned in the CMake modifications section below).
* **Visual Studio 2022:** With the "Desktop development with C++" workload installed.
* **A Vulkan-capable GPU** with up-to-date drivers.

### Steps
1. **Clone the repository recursively.** This is crucial, as the project relies on git submodules (like GLFW) for external dependencies:
   ```bash
   git clone --recursive <your-repo-url>
   cd Project5-Vulkan-Grass-Rendering
   ```

2. **Configure and Generate with CMake:**
   * Open the CMake GUI.
   * Set the "Source code" directory to the root of the cloned repository.
   * Set the "Build the binaries" directory to a new folder named `build` (e.g., `.../Project5-Vulkan-Grass-Rendering/build`).
   * Click **Configure** (select Visual Studio 17 2022 as the generator) and then **Generate**.

3. **Compile in Visual Studio:**
   * Click **Open Project** in CMake (or double-click `vulkan_grass_rendering.sln` in the `build` folder).
   * Set the build configuration to **Release** (or Debug, though Release will give you the best frame rates for the performance analysis).
   * Build the solution (`Ctrl + Shift + B`). This will compile the C++ code and automatically run `glslangValidator` to compile the `.vert`, `.frag`, `.comp`, `.tesc`, and `.tese` shaders into `.spv` binaries in the `build/shaders` folder.

4. **Run:**
   * Ensure the working directory is set correctly (Visual Studio usually handles this if you run directly from the IDE). 
   * Run `vulkan_grass_rendering.exe` from the `build` directory.
