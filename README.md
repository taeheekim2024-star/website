# Engineering Nanoporous Interfaces

A full-screen research world with centered typography, a perspective floor grid, and six distinct subjects: AI material design, controlled synthesis, nanoporous architecture, selective adsorption, molecular catalysis, and electrochemical energy. A research section below connects design, synthesis, applications and AI-guided redesign.

The branching particle arrangement is an artistic three-dimensional reconstruction of the supplied image. A thickened gyroid cube adds a distinct continuous porous architecture. The smooth surfaces, molecular routes, reaction color changes, and design candidates are conceptual illustrations, not measured geometry, experimental results, kinetics or an active AI calculation.

## Interaction

- Move the mouse to orbit the camera gently. The fixed floor grid and objects share the same perspective, so their depth changes together.
- Grab an individual object to move it. It grows subtly while held and settles back with a damped spring when released. Drag empty space to orbit within limits.
- Select an object's label or click the object for its research/application description. Only that object becomes selected; related copy updates below without triggering an animation on another specimen. AI design uses the chip's candidate grid.
- The AI chip evaluates small candidate structures, the synthesis vessel stirs and releases bubbles, the catalyst surface receives and releases molecules, and the electrode cell animates ions between plates.
- Select Design, Synthesis, Applications or AI discovery below. Applications includes adsorption, catalysis and ion transport.
- Enter the material world hides the headline. The wheel zooms in this view. On touch devices this view enables one-finger dragging; outside it, normal page scrolling is preserved.
- Keyboard: arrows orbit; plus/minus zoom; Space pauses; Home resets; Escape leaves the expanded view. Object labels are focusable buttons.
- Automatic animation respects the operating system's reduced-motion preference. The play button explicitly resumes it.

## Reference and validation

Spline's public homepage and its hero scene informed the camera, fixed floor grid, cursor-facing objects and drag enlargement. See https://spline.design/ and https://docs.spline.design/exporting-your-scene/play-settings. This site uses original procedural Three.js assets and its own interaction code; it does not embed the Spline scene.

Static entrypoints, relative imports and JavaScript syntax were checked. Non-browser interaction checks verify object dragging, spring settling across different frame rates, camera response, selection, pointer cancellation and touch scroll behavior. Procedural geometry and moving parts were checked for finite coordinates. Browser visual/interaction QA was not performed.

## Source

Static entry point: `dist/index.html`. Serve `dist/` with a local HTTP server. All Three.js runtime dependencies are included; the typeface uses Google Fonts with a system fallback. No build step or account credentials are needed to run the page.

Three.js 0.180.0, MIT license: `dist/vendor/THREE-LICENSE.txt`. The relative import in the vendored MarchingCubes addon is adjusted for browser and Node geometry validation.
