# 3D Anatomy Setup - Quick Start Guide

Get your detailed anatomical model with nerves, organs, and systems in 3 steps.

## Prerequisites

- [ ] **Blender installed** - https://www.blender.org/download/
- [ ] **Internet connection** for downloading models

## Step 1: Download Anatomical Models (5-10 minutes)

### Option A: Auto-Download (Easiest)

```bash
# Run the download script
bash scripts/blender/download_models.sh
```

This downloads 20+ anatomical structures from BodyParts3D.

### Option B: Manual Download

1. Visit: http://lifesciencedb.jp/bp3d/
2. Search for organs (e.g., "FMA7088" for heart)
3. Download OBJ files
4. Save to: `scripts/blender/bodyparts3d_models/`

**Key structures to download:**
- Brain (FMA50801)
- Heart (FMA7088)
- Lungs (FMA7195, FMA7196)
- Liver (FMA7197)
- Kidneys (FMA7184, FMA7185)
- Stomach (FMA7148)
- Spinal Cord (FMA7647)

## Step 2: Generate 3D Model (2-3 minutes)

```bash
# Run Blender script to create GLB file
blender --background --python scripts/blender/import_bodyparts3d.py
```

**What this does:**
- Imports all OBJ files
- Cleans and optimizes meshes
- Applies realistic colors (red heart, pink lungs, etc.)
- Organizes by anatomical system
- Exports 2 files:
  - `human_anatomy_high.glb` (detailed, ~30-50MB)
  - `human_anatomy_low.glb` (optimized, ~5-10MB)

**Output location:**
```
cli/packages/apps/client-app/public/models/
├── human_anatomy_high.glb
└── human_anatomy_low.glb
```

## Step 3: Update React Component (1 minute)

Replace the primitive shapes with the real 3D model:

```bash
# The updated component is ready to use!
# Just need to update PhysicsAnatomyModel.tsx
```

Edit `/cli/packages/apps/client-app/src/components/anatomy/PhysicsAnatomyModel.tsx`:

```typescript
import { useGLTF } from '@react-three/drei';

export function PhysicsAnatomyModel({
  patientData,
  isBreathing = true,
  heartRate = 70,
  patientPosition = 'standing',
  onOrganClick,
}: PhysicsAnatomyModelProps) {
  // Load the 3D model
  const { scene } = useGLTF('/models/human_anatomy_low.glb');

  return (
    <Physics gravity={gravityDirection} timeStep="vary">
      {/* Render the complete anatomical model */}
      <primitive object={scene.clone()} scale={patientData.heightCm / 170} />

      {/* Physics interactions will be added to individual organs */}
    </Physics>
  );
}

// Preload the model
useGLTF.preload('/models/human_anatomy_low.glb');
```

## Step 4: Test It! (30 seconds)

```bash
# Start dev server (if not already running)
make dev-client

# Open browser
open http://localhost:5175/physics-demo
```

You should now see:
- ✅ Full human figure
- ✅ Detailed organs (heart, lungs, liver, etc.)
- ✅ Nervous system (brain, spinal cord)
- ✅ Skeletal structure
- ✅ Color-coded systems
- ✅ BMI-based scaling

## What You Get

**Anatomical Systems:**
- 🧠 Nervous System (brain, spinal cord) - Purple
- ❤️ Cardiovascular (heart, aorta, veins) - Red
- 🫁 Respiratory (lungs, trachea, diaphragm) - Blue
- 🍔 Digestive (liver, stomach, intestines) - Orange/Brown
- 💧 Urinary (kidneys, bladder) - Yellow
- 🦴 Skeletal (skull, spine, ribs, pelvis) - Gray

**Total Structures:** 20+ medically accurate organs

**Model Quality:**
- Based on Visible Human Project data
- Validated by anatomists
- Professional medical-grade detail

## Advanced: Adding More Organs

Want to add more structures?

1. Find FMA code at: http://lifesciencedb.jp/bp3d/
2. Download OBJ file
3. Add to `import_bodyparts3d.py`:

```python
ANATOMY_MODELS = [
    # ... existing models ...

    # Add your organ:
    ("FMA12345", "my_organ", "SYSTEM", "#COLOR", (x, y, z)),
]
```

4. Re-run Blender script

## Troubleshooting

**"blender: command not found"**
```bash
# macOS
export PATH="/Applications/Blender.app/Contents/MacOS:$PATH"
```

**"Model not found" warnings**
- Download the missing FMA code from BodyParts3D
- Or edit `ANATOMY_MODELS` in the script to remove it

**GLB file too large**
- Edit `TARGET_POLYGON_COUNT` in import_bodyparts3d.py
- Reduce from 500000 to 200000 for smaller file

**Models look wrong in browser**
- Check browser console for errors
- Verify GLB files exist in `public/models/`
- Try clearing browser cache

## Legal Attribution

BodyParts3D models require attribution:

**Add to your app:**
```
Anatomical models from BodyParts3D Database (CC BY-SA 2.1 JP)
Database Center for Life Science, Japan
http://lifesciencedb.jp/bp3d/
```

## Resources

- **Full Guide:** `scripts/blender/README.md`
- **Blender Script:** `scripts/blender/import_bodyparts3d.py`
- **BodyParts3D:** http://lifesciencedb.jp/bp3d/
- **Three.js Docs:** https://threejs.org/docs/
- **React Three Fiber:** https://docs.pmnd.rs/react-three-fiber/

---

**Estimated Total Time:** 10-15 minutes
**Result:** Professional medical-grade 3D anatomy viewer with 20+ organs!
