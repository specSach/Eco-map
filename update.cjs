const fs = require('fs');

// 1. EcoMap.tsx: Add maxBounds to MapContainer and noWrap to TileLayer
let ecomap = fs.readFileSync('/home/i11wakura/Eco-map/src/components/EcoMap.tsx', 'utf8');
ecomap = ecomap.replace(
  '<MapContainer center={center} zoom={zoom}',
  '<MapContainer maxBounds={[[-90, -180], [90, 180]]} maxBoundsViscosity={1.0} center={center} zoom={zoom}'
);
ecomap = ecomap.replace(
  '<TileLayer attribution=',
  '<TileLayer noWrap={true} attribution='
);
fs.writeFileSync('/home/i11wakura/Eco-map/src/components/EcoMap.tsx', ecomap);

// 2. styles.css: Add justify-content: center to .hero-proof in @media (max-width: 900px)
let styles = fs.readFileSync('/home/i11wakura/Eco-map/src/styles.css', 'utf8');

styles = styles.replace(
  '.pill, .hero-proof { margin-inline: auto; }',
  '.pill, .hero-proof { margin-inline: auto; justify-content: center; }'
);

// 3. styles.css: center icon in .locate-fab
styles = styles.replace(
  '.locate-fab { position: absolute; right: 15px; bottom: 25px; z-index: 500; width: 44px; height: 44px; background: var(--surface); border: 0; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,.18); cursor: pointer; }',
  '.locate-fab { position: absolute; right: 15px; bottom: 25px; z-index: 500; width: 44px; height: 44px; background: var(--surface); border: 0; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,.18); cursor: pointer; display: flex; align-items: center; justify-content: center; }'
);

fs.writeFileSync('/home/i11wakura/Eco-map/src/styles.css', styles);
