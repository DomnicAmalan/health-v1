# Blender Anatomy Modeling Tutorial
**Learn Blender by Building Medical-Grade 3D Anatomy Models**

Complete hands-on guide from beginner to building a full human anatomy system.

---

## 📋 Prerequisites

- ✅ Blender 5.0+ installed (you already have it!)
- ✅ Mouse (3-button recommended)
- ✅ 1-2 hours per organ
- ✅ Reference images (we'll provide)

---

## 🎯 Tutorial Structure

We'll build organs in order of difficulty:

1. **Heart** (Simple) - 30 minutes
2. **Liver** (Medium) - 45 minutes
3. **Lungs** (Medium) - 1 hour
4. **Brain** (Complex) - 1.5 hours
5. **Digestive System** (Complex) - 2 hours

---

## 🚀 Part 1: Your First Organ - The Heart (30 min)

### Step 1: Setup Blender (5 min)

1. **Open Blender**
   ```bash
   blender
   ```

2. **Delete the default cube**
   - Click the cube
   - Press `X` → Delete

3. **Set up your workspace**
   - Top menu: Click "Modeling" workspace
   - This gives you better layout for modeling

### Step 2: Create Basic Heart Shape (10 min)

1. **Add a UV Sphere**
   - Press `Shift + A` (Add menu)
   - Mesh → UV Sphere
   - This is your base shape

2. **Enter Edit Mode**
   - Press `Tab` (switches between Object/Edit mode)
   - You should see vertices (dots) on the sphere

3. **Shape the heart**
   - Press `S` (Scale) → `Z` (Z-axis only) → `0.8` → `Enter`
     - This makes it slightly flattened
   - Press `G` (Move) → `Z` → `-0.1` → `Enter`
     - Moves it down slightly

4. **Create the heart point**
   - Press `Alt + A` (Deselect all)
   - Press `B` (Box select)
   - Draw box around bottom vertices
   - Press `S` (Scale) → `0.2` → `Enter`
     - This creates the pointed bottom

5. **Create the top dip**
   - Press `Alt + A` (Deselect all)
   - Press `C` (Circle select)
   - Select top center vertices
   - Press `G` → `Z` → `-0.15` → `Enter`
     - Creates the characteristic heart dip

### Step 3: Make it Smooth & Organic (5 min)

1. **Add Subdivision Surface**
   - Press `Tab` (back to Object mode)
   - Right panel → Modifiers (wrench icon)
   - Add Modifier → Subdivision Surface
   - Set "Viewport" levels to 2
   - Set "Render" levels to 3

2. **Smooth Shading**
   - Right-click the object
   - Select "Shade Smooth"

Now you have a basic heart shape! 🫀

### Step 4: Add Details (5 min)

1. **Scale to realistic size**
   - Press `S` → `0.09` → `Enter`
   - Press `G` → `Z` → `1.0` → `Enter` (move to chest height)

2. **Add aorta (top vessel)**
   - Press `Shift + A` → Mesh → Cylinder
   - Press `S` → `0.02` → `Enter` (make thin)
   - Press `S` → `Z` → `3` → `Enter` (make tall)
   - Press `G` → `Z` → `1.15` → `Enter` (move to top of heart)

### Step 5: Add Material/Color (5 min)

1. **Select the heart**
   - Click on the heart sphere

2. **Add Material**
   - Right panel → Material Properties (sphere icon)
   - Click "New" (if no material exists)

3. **Set color to red**
   - Find "Base Color"
   - Click the color box
   - Set to red: R=0.906, G=0.298, B=0.235
   - (This is hex #E74C3C)

4. **Adjust roughness**
   - Set "Roughness" to 0.4
   - This makes it look more organic (slightly glossy)

5. **Preview in Viewport**
   - Top right: Change viewport shading to "Material Preview" (3rd sphere icon)
   - You should now see a red heart!

### Step 6: Export as GLB (2 min)

1. **Select all your heart objects**
   - Click heart → Shift+Click aorta

2. **Export**
   - File → Export → glTF 2.0 (.glb/.gltf)
   - Navigate to: `/Users/apple/Projects/health-v1/cli/packages/apps/client-app/public/models/`
   - Filename: `heart_custom.glb`
   - Format: glTF Binary (.glb)
   - Click "Export glTF 2.0"

3. **Test in your app**
   - Update PhysicsAnatomyModel.tsx:
   ```typescript
   const { scene } = useGLTF('/models/heart_custom.glb');
   ```
   - Refresh browser!

**🎉 Congratulations! You just built your first organ in Blender!**

---

## 🫁 Part 2: Lungs (1 hour)

### Lung Anatomy Overview
- Right lung: 3 lobes (upper, middle, lower)
- Left lung: 2 lobes (upper, lower) - smaller due to heart
- Pink/light red color
- Spongy texture

### Step 1: Right Lung (30 min)

1. **Add base shape**
   - `Shift + A` → Mesh → UV Sphere
   - `S` → `0.11` → `Enter` (scale to size)

2. **Make it lung-shaped**
   - `Tab` (Edit mode)
   - `S` → `X` → `0.8` → `Enter` (narrower)
   - `S` → `Z` → `1.5` → `Enter` (taller)

3. **Create lobes using Loop Cuts**
   - `Ctrl + R` (Loop Cut tool)
   - Hover over mesh, scroll mouse to add 2 cuts
   - Click to confirm
   - These will be your lobe divisions

4. **Separate into lobes**
   - Select vertices between loop cuts
   - `P` → Selection (Separate)
   - Repeat for each lobe

5. **Add texture**
   - Material → Base Color: `#FFB6C1` (pink)
   - Roughness: 0.7 (matte, spongy look)

### Step 2: Left Lung (15 min)

- Repeat above but:
  - Only 2 lobes (one loop cut)
  - Scale smaller: `S` → `0.9` → `Enter`
  - Position: `G` → `X` → `-0.11` → `Enter`

### Step 3: Add Bronchi (Airways) (15 min)

1. **Main bronchus**
   - `Shift + A` → Mesh → Cylinder
   - Scale: `S` → `0.015` → `Enter`
   - Rotate: `R` → `Y` → `45` → `Enter`

2. **Branch bronchi**
   - Duplicate: `Shift + D` → `X` → `0.05` → `Enter`
   - Rotate: `R` → `Z` → `30` → `Enter`

3. **Export**
   - Select all lung parts
   - Export as `lungs_custom.glb`

---

## 🧠 Part 3: Brain (1.5 hours)

### Brain Anatomy
- Cerebrum (large, wrinkled)
- Cerebellum (smaller, at back)
- Brainstem (connects to spinal cord)

### Step 1: Cerebrum (Main Brain) (45 min)

1. **Base shape**
   - `Shift + A` → Mesh → UV Sphere
   - `S` → `0.12` → `Enter`

2. **Make it brain-shaped**
   - `Tab` (Edit mode)
   - `S` → `Y` → `1.2` → `Enter` (elongate front-to-back)
   - `S` → `Z` → `0.9` → `Enter` (slightly flatten top)

3. **Add wrinkles (sulci) - ADVANCED**
   - Add Modifier → Subdivision Surface (level 3)
   - Add Modifier → Displace
   - Create new texture → Clouds
   - Strength: 0.05
   - This creates organic wrinkles!

4. **Split into hemispheres**
   - `Tab` (Edit mode)
   - `Alt + A` (Deselect all)
   - `Shift + Alt + Click` center edge loop
   - `V` (Rip) → Move apart slightly
   - This creates the left/right brain split

### Step 2: Cerebellum (20 min)

1. **Add sphere**
   - `Shift + A` → Mesh → UV Sphere
   - `S` → `0.04` → `Enter` (smaller)

2. **Position at back-bottom**
   - `G` → `Y` → `-0.1` → `Enter`
   - `G` → `Z` → `-0.06` → `Enter`

3. **Add fine wrinkles**
   - Subdivision Surface (level 4)
   - Displace (strength: 0.02)

### Step 3: Brainstem (15 min)

1. **Cylinder shape**
   - `Shift + A` → Mesh → Cylinder
   - `S` → `0.02` → `Enter`
   - `S` → `Z` → `0.04` → `Enter`

2. **Position below cerebrum**
   - `G` → `Z` → `-0.12` → `Enter`

### Step 4: Material (10 min)

- Color: `#E8B4D9` (light purple/pink)
- Roughness: 0.5
- Subsurface: 0.1 (if available)

---

## 🍔 Part 4: Liver (45 min)

### Liver Anatomy
- Largest solid organ
- Right lobe (larger) + Left lobe
- Dark reddish-brown
- Smooth surface

### Step 1: Right Lobe (25 min)

1. **Base shape**
   - `Shift + A` → Mesh → Cube (yes, cube!)
   - `Tab` (Edit mode)
   - `A` (Select all)
   - `Alt + E` → Extrude Along Normals → `0.05`
   - This inflates the cube into organic shape

2. **Make it liver-shaped**
   - `S` → `X` → `1.4` → `Enter` (wider)
   - `S` → `Z` → `0.6` → `Enter` (flatter)

3. **Smooth corners**
   - Add Modifier → Bevel
   - Amount: 0.02
   - Segments: 3

4. **Subdivision for organic look**
   - Add Modifier → Subdivision Surface (level 2)

### Step 2: Left Lobe (15 min)

1. **Duplicate and modify**
   - Select right lobe
   - `Shift + D` → `X` → `-0.15` → `Enter`
   - `S` → `0.7` → `Enter` (smaller)

### Step 3: Material (5 min)

- Color: `#8B4513` (saddle brown)
- Roughness: 0.3 (slightly glossy - it's a wet organ)

---

## 🎨 Blender Shortcuts Cheat Sheet

### Essential Navigation
```
Mouse Wheel = Zoom
Middle Mouse + Drag = Rotate View
Shift + Middle Mouse = Pan View
Numpad 1/3/7 = Front/Side/Top View
```

### Selection
```
Left Click = Select
Shift + Click = Add to Selection
Alt + A = Deselect All
A = Select All
B = Box Select
C = Circle Select
```

### Transformation
```
G = Move (Grab)
S = Scale
R = Rotate
X/Y/Z = Constrain to axis
Shift + X/Y/Z = Constrain to plane
```

### Editing
```
Tab = Object/Edit Mode Toggle
E = Extrude
I = Inset Faces
Ctrl + R = Loop Cut
P = Separate
Ctrl + J = Join
```

### Modeling
```
Shift + A = Add Object
X = Delete
Shift + D = Duplicate
Alt + D = Linked Duplicate
Ctrl + A = Apply Transforms
```

### View
```
Z = Shading Menu
  - Wireframe
  - Solid
  - Material Preview
  - Rendered
```

---

## 📊 Organ Modeling Checklist

### For Each Organ:

- [ ] **Research anatomy**
  - Find reference images
  - Understand structure
  - Note size relative to body

- [ ] **Model base shape**
  - Choose primitive (sphere/cube/cylinder)
  - Scale to approximate size
  - Position correctly

- [ ] **Add details**
  - Subdivide for smoothness
  - Add characteristic features
  - Create sub-structures if needed

- [ ] **Apply modifiers**
  - Subdivision Surface (smoothness)
  - Bevel (rounded edges)
  - Displace (texture)

- [ ] **Material/Color**
  - Research realistic color
  - Set appropriate roughness
  - Add subsurface if organic

- [ ] **Optimize**
  - Check polygon count
  - Apply modifiers if too heavy
  - Decimate if needed

- [ ] **Export**
  - Select object(s)
  - Export as GLB
  - Test in app

---

## 🎓 Learning Resources

### YouTube Channels
1. **Blender Guru** - "Donut Tutorial" (fundamentals)
2. **Grant Abbitt** - Beginner modeling
3. **CG Cookie** - Anatomy modeling
4. **Imphenzia** - Low poly techniques

### Websites
1. **blender.org/docs** - Official documentation
2. **BlenderArtists.org** - Community forum
3. **Sketchfab.com** - 3D model reference
4. **z-anatomy.com** - Anatomical reference

### Books
1. "Blender 3D: Noob to Pro"
2. "The Art of Effective Rigging in Blender"

---

## 🗓️ 4-Week Learning Plan

### Week 1: Basics + Simple Organs
- **Day 1-2:** Blender interface, navigation, basic shapes
- **Day 3-4:** Heart modeling (follow tutorial above)
- **Day 5-6:** Liver modeling
- **Day 7:** Export and test in your app

**Goal:** 2 organs completed, understand basics

### Week 2: Organic Modeling
- **Day 1-2:** Learn subdivision, sculpting basics
- **Day 3-5:** Lungs modeling (complex shape)
- **Day 6-7:** Stomach, intestines

**Goal:** 4 more organs, master organic shapes

### Week 3: Complex Anatomy
- **Day 1-3:** Brain modeling (most complex)
- **Day 4-5:** Kidneys, bladder
- **Day 6-7:** Blood vessels, nerves

**Goal:** Complete nervous and urinary systems

### Week 4: Polish & Systems
- **Day 1-2:** Refine all models
- **Day 3-4:** Create skeletal system
- **Day 5-6:** Optimize all for web
- **Day 7:** Final export, full body assembly

**Goal:** Complete anatomy system, 20+ organs

---

## 💡 Pro Tips

### 1. Use Reference Images
- Import images as background: `Shift + A` → Image → Background
- Position in Front/Side views
- Model over the reference

### 2. Work Non-Destructively
- Don't apply modifiers immediately
- Keep backups
- Use layers/collections

### 3. Name Everything
- Rename objects immediately
- Use collections: Cardiovascular, Respiratory, etc.
- Makes exporting easier

### 4. Test Early, Test Often
- Export after each organ
- Load in your app
- See it in context
- Adjust size if needed

### 5. Learn Shortcuts
- Forces you to be faster
- More enjoyable workflow
- Reference: `Help → Blender Manual → Interface → Keymap`

---

## 🚨 Common Mistakes & Fixes

### Problem: "My model looks blocky"
**Fix:** Add Subdivision Surface modifier, increase levels

### Problem: "Export file too large"
**Fix:** Apply modifiers, then add Decimate modifier, reduce ratio

### Problem: "Model disappears in app"
**Fix:** Check scale - press `N` in Blender, check Dimensions

### Problem: "Wrong position in app"
**Fix:** In Blender, apply transforms: `Ctrl + A` → All Transforms

### Problem: "Colors don't show"
**Fix:** Make sure material has Base Color set, not just Viewport Color

---

## 📝 Next Steps

1. **Start with the heart** (30 min tutorial above)
2. **Export and test** in your app
3. **Post screenshot** to show progress
4. **Continue to lungs** when comfortable
5. **Build one organ per day**

In 1 month you'll have:
- ✅ Complete anatomy system
- ✅ Professional Blender skills
- ✅ Custom optimized models
- ✅ Portfolio project

---

## 🎯 Quick Start Command

```bash
# 1. Open Blender
blender

# 2. Follow "Part 1: Heart" tutorial above
# 3. Export to your project
# 4. Update component to use your model
# 5. See it live in your app!
```

**Ready to start? Open Blender and begin with the heart!** 🫀

---

*Created for health-v1 project - Learn Blender by building medical anatomy*
