# Engineering Nanoporous Interfaces

A full-screen, immersive research hero with centered typography and multiple porous specimens floating at different depths. The composition follows the supplied Spline homepage reference. A research section below connects design, synthesis, performance and AI-guided redesign of nanoporous materials.

The branching particle arrangement is an artistic three-dimensional reconstruction of the supplied image. A thickened gyroid cube adds a distinct continuous porous architecture. The smooth surfaces, molecular routes, reaction color changes, and design candidates are conceptual illustrations, not measured geometry, experimental results, kinetics or an active AI calculation.

## Interaction

- Select Design, Synthesis, Performance or AI discovery at the bottom.
- Under Performance, choose adsorption, catalysis or ion transport.
- Move the mouse for depth-dependent parallax and tilt across the entire scene; drag to rotate the specimens.
- Enter the material world fades the headline so the full scene can be explored. In this view, use the wheel to zoom.
- Keyboard: arrows rotate; plus/minus zoom; Space pauses; Home resets; Escape leaves the expanded view.
- Automatic animation respects the operating system's reduced-motion preference. The play button explicitly resumes it.

## Source

Static entry point: `dist/index.html`. Serve `dist/` with a local HTTP server. All Three.js runtime dependencies are included; the typeface uses Google Fonts with a system fallback. No build step or account credentials are needed to run the page.

Three.js 0.180.0, MIT license: `dist/vendor/THREE-LICENSE.txt`. The relative import in the vendored MarchingCubes addon is adjusted for browser and Node geometry validation.
