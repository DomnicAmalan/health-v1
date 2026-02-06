# 3D Anatomy Model Creation with BodyParts3D

Complete guide to creating medical-grade 3D anatomy models using BodyParts3D database and Blender.

## Prerequisites

- **Blender 3.0+** - Download from https://www.blender.org/download/
- **Python 3.10+** (usually comes with Blender)
- Internet connection to download models

## Step 1: Download BodyParts3D Models

### Option A: Manual Download (Recommended for Selection)

1. Visit **BodyParts3D Database**: http://lifesciencedb.jp/bp3d/

2. Search for anatomical structures:
   - Use the search box or browse by system
   - Download OBJ format files

3. Download these key structures (FMA codes):

**NERVOUS SYSTEM:**
- FMA50801 - Brain
- FMA7647 - Spinal Cord

**CARDIOVASCULAR:**
- FMA7088 - Heart
- FMA3986 - Aorta
- FMA4720 - Superior Vena Cava

**RESPIRATORY:**
- FMA7195 - Right Lung
- FMA7196 - Left Lung
- FMA7394 - Trachea
- FMA13322 - Diaphragm

**DIGESTIVE:**
- FMA7197 - Liver
- FMA7148 - Stomach
- FMA7199 - Gallbladder
- FMA7203 - Pancreas
- FMA7201 - Spleen
- FMA7200 - Small Intestine
- FMA14543 - Large Intestine

**URINARY:**
- FMA7203 - Right Kidney
- FMA7204 - Left Kidney
- FMA15900 - Bladder

**SKELETAL:**
- FMA46565 - Skull
- FMA7647 - Spine
- FMA9468 - Ribs
- FMA16585 - Pelvis

4. Save all OBJ files to: `scripts/blender/bodyparts3d_models/`

### Option B: Bulk Download (Advanced)

```bash
# Create download directory
mkdir -p scripts/blender/bodyparts3d_models

# Use wget or curl to download (example)
cd scripts/blender/bodyparts3d_models

# Download heart (FMA7088)
wget "http://lifesciencedb.jp/bp3d/OBJ/FMA7088.obj"

# Repeat for other structures...
```

## Step 2: Organize Downloaded Files

```bash
# Your directory should look like:
scripts/blender/
├── bodyparts3d_models/
│   ├── FMA7088.obj       # Heart
│   ├── FMA7195.obj       # Right Lung
│   ├── FMA7196.obj       # Left Lung
│   ├── FMA7197.obj       # Liver
│   └── ... (other organs)
├── import_bodyparts3d.py
└── README.md
```

## Step 3: Run Blender Import Script

### Method A: Command Line (Headless)

```bash
# Navigate to project root
cd /Users/apple/Projects/health-v1

# Run Blender script in background
blender --background --python scripts/blender/import_bodyparts3d.py

# This will:
# - Import all OBJ files
# - Clean and optimize meshes
# - Apply materials/colors
# - Export as human_anatomy_high.glb and human_anatomy_low.glb
```

### Method B: Blender GUI (For Visual Inspection)

1. Open Blender
2. Go to: Scripting workspace
3. Open script: `scripts/blender/import_bodyparts3d.py`
4. Click "Run Script" (▶ button)
5. Check Console for output

## Step 4: Verify Output Files

After running the script, check:

```bash
cli/packages/apps/client-app/public/models/
├── human_anatomy_high.glb   # ~30-50 MB (detailed, 500k polygons)
└── human_anatomy_low.glb    # ~5-10 MB (optimized, 50k polygons)
```

## Step 5: Update React Component

The script will output the GLB files. Now update the PhysicsAnatomyModel to load them:

```typescript
// In PhysicsAnatomyModel.tsx
import { useGLTF } from '@react-three/drei';

function AnatomyMeshes() {
  const { scene } = useGLTF('/models/human_anatomy_low.glb');

  return <primitive object={scene.clone()} />;
}
```

## Customization

### Adding More Organs

Edit `import_bodyparts3d.py` and add to `ANATOMY_MODELS` list:

```python
ANATOMY_MODELS = [
    # ... existing models ...

    # Add new organ:
    ("FMA12345", "organ_name", "SYSTEM", "#HEX_COLOR", (x, y, z)),
]
```

### Adjusting Polygon Count

Edit target polygon counts in `import_bodyparts3d.py`:

```python
TARGET_POLYGON_COUNT = {
    "high_detail": 500000,  # Increase for more detail
    "low_detail": 50000,    # Decrease for better performance
}
```

### Changing Colors

Colors are defined per organ in `ANATOMY_MODELS`:

```python
# Format: (fma_code, name, system, COLOR_HEX, position)
("FMA7088", "heart", "CARDIOVASCULAR", "#E74C3C", (0, 1.0, 0)),
#                                       ^^^^^^^^
#                                       Change this hex color
```

## Troubleshooting

### "Model not found" Warnings

```
⚠️  WARNING: Model not found: scripts/blender/bodyparts3d_models/FMA7088.obj
```

**Solution:** Download the missing OBJ file from BodyParts3D.

### Blender Command Not Found

```bash
# macOS
export PATH="/Applications/Blender.app/Contents/MacOS:$PATH"

# Linux
sudo apt install blender

# Windows
# Add Blender installation folder to PATH
```

### Import Errors in Blender

If you get Python errors:
1. Make sure you're using Blender 3.0+
2. Check Python version: Blender → Scripting → Python Console → `import sys; sys.version`

### File Too Large

If GLB file is too big (>50MB):
1. Reduce `TARGET_POLYGON_COUNT` in the script
2. Run script again
3. Or use only the low-poly version

## License & Attribution

**IMPORTANT:** BodyParts3D models require attribution:

```
Anatomical models from BodyParts3D Database (CC BY-SA 2.1 JP)
Database Center for Life Science, Japan
http://lifesciencedb.jp/bp3d/
```

Add this attribution in your app footer or about page.

## Next Steps

1. Test the model: `npm run dev` and visit `/physics-demo`
2. Add click handlers for individual organs
3. Customize colors and materials
4. Add animations (heartbeat, breathing)
5. Integrate with physics engine

## Resources

- **BodyParts3D**: http://lifesciencedb.jp/bp3d/
- **FMA Ontology**: https://bioportal.bioontology.org/ontologies/FMA
- **Blender Python API**: https://docs.blender.org/api/current/
- **Three.js GLTF**: https://threejs.org/docs/#examples/en/loaders/GLTFLoader
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber/

## Support

Issues or questions:
- BodyParts3D: https://dbcls.rois.ac.jp/en/
- Blender: https://blender.stackexchange.com/
- Three.js: https://discourse.threejs.org/
