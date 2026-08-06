# BlueMap WebApp runtime v5.3

This directory contains the JavaScript rendering core from BlueMap v5.3,
vendored for the Portal map adapter. The upstream source is licensed under the
MIT License; the original license header is retained in each source file.

The Portal intentionally does not embed BlueMap's standalone Vue application or
its menus. `MapViewer`, `Map`, and the related Three.js controls are mounted by
`utils/map/bluemap/controller.ts` and exposed through the Portal's own events
and controls. HydCraft-specific patches stay outside this directory in
`utils/map/bluemap/blue-map-bridge.js`.
