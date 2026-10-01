const fs = require('fs');

let ecomap = fs.readFileSync('/home/i11wakura/Eco-map/src/components/EcoMap.tsx', 'utf8');
ecomap = ecomap.replace(
  '<MapContainer maxBounds={[[-90, -180], [90, 180]]} maxBoundsViscosity={1.0} center={center} zoom={zoom}',
  '<MapContainer maxBounds={[[-90, -180], [90, 180]]} maxBoundsViscosity={1.0} minZoom={3} center={center} zoom={zoom}'
);
fs.writeFileSync('/home/i11wakura/Eco-map/src/components/EcoMap.tsx', ecomap);
