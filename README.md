# Engineering Nanoporous Interfaces

A single-page, interactive research hero exploring design, synthesis, performance and AI-guided redesign of nanoporous materials.

The branching particle arrangement is an artistic three-dimensional reconstruction of the supplied image. The smooth porous surface, molecular routes, reaction color changes, and design candidates are conceptual illustrations, not measured geometry, experimental results, kinetics or an active AI calculation.

## Interaction

- Select Design, Synthesis, Performance or AI discovery at the bottom.
- Under Performance, choose adsorption, catalysis or ion transport.
- Move the mouse for subtle tilt; drag for rotation.
- Explore in 3D expands the material. In this view, use the wheel to zoom.
- Keyboard: arrows rotate; plus/minus zoom; Space pauses; Home resets; Escape leaves the expanded view.
- Automatic animation respects the operating system's reduced-motion preference. The play button explicitly resumes it.

## Source

Static entry point: `dist/index.html`. Serve `dist/` with a local HTTP server. All Three.js runtime dependencies are included; the typeface uses Google Fonts with a system fallback. No build step or account credentials are needed to run the page.

Three.js 0.180.0, MIT license: `dist/vendor/THREE-LICENSE.txt`. The relative import in the vendored MarchingCubes addon is adjusted for browser and Node geometry validation.
