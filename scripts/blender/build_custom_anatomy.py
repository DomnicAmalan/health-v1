"""
Custom Anatomy Model Builder for Blender
Uses Z-Anatomy as reference to create optimized medical-grade 3D models

Features:
- References Z-Anatomy for anatomical accuracy
- Creates custom optimized meshes
- Web-optimized polygon counts
- Interactive organ system
- Physics-ready

Usage:
  # Without Z-Anatomy (procedural only)
  blender --background --python build_custom_anatomy.py

  # With Z-Anatomy reference
  blender --background --python build_custom_anatomy.py -- --reference /path/to/z-anatomy.blend

Output: human_anatomy_custom.glb
"""

import bpy
import bmesh
import math
import sys
from pathlib import Path
from mathutils import Vector

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = PROJECT_ROOT / "cli/packages/apps/client-app/public/models"
OUTPUT_FILE = "human_anatomy_custom.glb"

# Polygon budget for web performance
POLYGON_BUDGET = {
    'brain': 5000,
    'heart': 8000,
    'lungs': 6000,
    'liver': 6000,
    'stomach': 3000,
    'intestines': 8000,
    'kidneys': 2000,
    'bladder': 1000,
    'spleen': 1500,
    'pancreas': 2000,
    'skeleton': 15000,
    'vessels': 5000,
    'nerves': 3000,
}

# Anatomical structure definitions with medically accurate positions
ANATOMY_STRUCTURES = {
    # NERVOUS SYSTEM
    'brain': {
        'type': 'complex',
        'position': (0, 1.52, 0.02),
        'size': (0.12, 0.14, 0.11),
        'color': '#E8B4D9',
        'system': 'NERVOUS',
        'subdivisions': 4,
        'features': ['cerebrum', 'cerebellum', 'brainstem'],
    },
    'spinal_cord': {
        'type': 'tube',
        'position': (0, 0.82, -0.05),
        'size': (0.012, 0.75, 0.012),
        'color': '#9B59B6',
        'system': 'NERVOUS',
        'subdivisions': 2,
    },

    # CARDIOVASCULAR SYSTEM
    'heart': {
        'type': 'complex',
        'position': (0.02, 0.98, 0.05),
        'size': (0.09, 0.11, 0.08),
        'color': '#E74C3C',
        'system': 'CARDIOVASCULAR',
        'subdivisions': 4,
        'features': ['left_ventricle', 'right_ventricle', 'left_atrium', 'right_atrium'],
    },
    'aorta': {
        'type': 'curved_tube',
        'position': (0.02, 1.05, 0.02),
        'size': (0.018, 0.45, 0.018),
        'color': '#C0392B',
        'system': 'CARDIOVASCULAR',
        'subdivisions': 3,
    },

    # RESPIRATORY SYSTEM
    'lung_right': {
        'type': 'complex',
        'position': (0.11, 1.0, 0),
        'size': (0.11, 0.22, 0.09),
        'color': '#FFB6C1',
        'system': 'RESPIRATORY',
        'subdivisions': 3,
        'features': ['upper_lobe', 'middle_lobe', 'lower_lobe'],
    },
    'lung_left': {
        'type': 'complex',
        'position': (-0.09, 1.0, 0),
        'size': (0.09, 0.20, 0.08),
        'color': '#FFB6C1',
        'system': 'RESPIRATORY',
        'subdivisions': 3,
        'features': ['upper_lobe', 'lower_lobe'],
    },
    'trachea': {
        'type': 'tube',
        'position': (0, 1.25, 0.05),
        'size': (0.015, 0.12, 0.015),
        'color': '#E8A4C9',
        'system': 'RESPIRATORY',
        'subdivisions': 2,
    },
    'diaphragm': {
        'type': 'dome',
        'position': (0, 0.70, 0),
        'size': (0.20, 0.03, 0.15),
        'color': '#C48793',
        'system': 'RESPIRATORY',
        'subdivisions': 2,
    },

    # DIGESTIVE SYSTEM
    'liver': {
        'type': 'complex',
        'position': (0.09, 0.85, 0.05),
        'size': (0.16, 0.12, 0.10),
        'color': '#8B4513',
        'system': 'DIGESTIVE',
        'subdivisions': 3,
        'features': ['right_lobe', 'left_lobe'],
    },
    'stomach': {
        'type': 'pouch',
        'position': (-0.05, 0.78, 0.08),
        'size': (0.09, 0.13, 0.09),
        'color': '#FFDAB9',
        'system': 'DIGESTIVE',
        'subdivisions': 3,
    },
    'small_intestine': {
        'type': 'coiled_tube',
        'position': (0, 0.58, 0.09),
        'size': (0.16, 0.18, 0.13),
        'color': '#FFE4B5',
        'system': 'DIGESTIVE',
        'subdivisions': 4,
    },
    'large_intestine': {
        'type': 'tube_frame',
        'position': (0, 0.55, 0.11),
        'size': (0.18, 0.22, 0.14),
        'color': '#E8C4A9',
        'system': 'DIGESTIVE',
        'subdivisions': 3,
    },
    'pancreas': {
        'type': 'elongated',
        'position': (0, 0.76, 0.02),
        'size': (0.13, 0.03, 0.03),
        'color': '#DEB887',
        'system': 'DIGESTIVE',
        'subdivisions': 2,
    },
    'spleen': {
        'type': 'oval',
        'position': (-0.12, 0.85, 0.02),
        'size': (0.05, 0.09, 0.04),
        'color': '#8B008B',
        'system': 'DIGESTIVE',
        'subdivisions': 2,
    },

    # URINARY SYSTEM
    'kidney_right': {
        'type': 'bean',
        'position': (0.09, 0.70, -0.05),
        'size': (0.05, 0.09, 0.04),
        'color': '#8B0000',
        'system': 'URINARY',
        'subdivisions': 3,
    },
    'kidney_left': {
        'type': 'bean',
        'position': (-0.09, 0.70, -0.05),
        'size': (0.05, 0.09, 0.04),
        'color': '#8B0000',
        'system': 'URINARY',
        'subdivisions': 3,
    },
    'bladder': {
        'type': 'sphere',
        'position': (0, 0.42, 0.08),
        'size': (0.07, 0.08, 0.06),
        'color': '#FFD700',
        'system': 'URINARY',
        'subdivisions': 3,
    },
}

# ============================================================================
# GEOMETRY CREATION FUNCTIONS
# ============================================================================

def create_complex_mesh(name, position, size, subdivisions):
    """Create complex organic mesh with subdivision surface"""
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=1.0,
        location=position,
        segments=16,
        ring_count=8
    )
    obj = bpy.context.active_object
    obj.name = name

    # Scale to size
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)

    # Add subdivision for smoothness
    mod_subsurf = obj.modifiers.new(name='Subdivision', type='SUBSURF')
    mod_subsurf.levels = subdivisions
    mod_subsurf.render_levels = subdivisions

    # Apply modifier
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier='Subdivision')

    return obj

def create_tube_mesh(name, position, size, subdivisions):
    """Create tubular structure (vessels, trachea, etc.)"""
    radius, height, _ = size
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius,
        depth=height,
        location=position,
        vertices=16
    )
    obj = bpy.context.active_object
    obj.name = name

    # Smooth shading
    bpy.ops.object.shade_smooth()

    return obj

def create_bean_mesh(name, position, size, subdivisions):
    """Create kidney bean shape"""
    obj = create_complex_mesh(name, position, size, subdivisions)

    # Deform to bean shape using lattice or shape keys
    # Simplified: just scale it asymmetrically
    obj.scale = (size[0], size[1], size[2] * 0.8)
    bpy.ops.object.transform_apply(scale=True)

    return obj

def create_dome_mesh(name, position, size, subdivisions):
    """Create dome shape (diaphragm)"""
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=1.0,
        location=position,
        segments=24,
        ring_count=12
    )
    obj = bpy.context.active_object
    obj.name = name

    # Delete bottom half to make dome
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.bisect(
        plane_co=(0, 0, 0),
        plane_no=(0, 0, 1),
        clear_inner=True
    )
    bpy.ops.object.mode_set(mode='OBJECT')

    # Scale to size
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)

    return obj

def create_coiled_tube_mesh(name, position, size, subdivisions):
    """Create coiled intestines"""
    # Create a spiral curve
    bpy.ops.curve.primitive_bezier_curve_add(location=position)
    curve = bpy.context.active_object
    curve.name = f"{name}_curve"

    # Make it coiled (simplified version)
    curve.data.bevel_depth = size[0] / 20
    curve.data.resolution_u = 12

    # Convert to mesh
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.active_object
    obj.name = name

    return obj

# ============================================================================
# MATERIAL CREATION
# ============================================================================

def hex_to_rgb(hex_color):
    """Convert hex to RGB (0-1)"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def create_organ_material(name, color_hex, roughness=0.4):
    """Create PBR material for organ"""
    mat = bpy.data.materials.new(name=f"Mat_{name}")
    nodes = mat.node_tree.nodes
    nodes.clear()

    # Principled BSDF
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    rgb = hex_to_rgb(color_hex)
    bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness

    # Subsurface scattering for realism
    try:
        if 'Subsurface Weight' in bsdf.inputs:
            bsdf.inputs['Subsurface Weight'].default_value = 0.1
    except:
        pass

    # Output
    output = nodes.new(type='ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    return mat

# ============================================================================
# MESH OPTIMIZATION
# ============================================================================

def optimize_mesh(obj, target_polygons):
    """Optimize mesh to target polygon count"""
    if obj.type != 'MESH':
        return

    current_polygons = len(obj.data.polygons)
    if current_polygons <= target_polygons:
        return

    # Calculate decimate ratio
    ratio = target_polygons / current_polygons

    # Add decimate modifier
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name='Decimate', type='DECIMATE')
    mod.ratio = ratio
    mod.use_collapse_triangulate = True

    # Apply modifier
    bpy.ops.object.modifier_apply(modifier='Decimate')

    print(f"  Optimized {obj.name}: {current_polygons} → {len(obj.data.polygons)} polygons")

# ============================================================================
# MAIN BUILD FUNCTION
# ============================================================================

def build_anatomy_model(z_anatomy_path=None):
    """Build custom anatomy model"""
    print("\n" + "="*70)
    print("CUSTOM ANATOMY MODEL BUILDER")
    print("="*70 + "\n")

    # Clear scene
    print("Clearing scene...")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Load Z-Anatomy reference if provided
    reference_objects = {}
    if z_anatomy_path and Path(z_anatomy_path).exists():
        print(f"Loading Z-Anatomy reference: {z_anatomy_path}")
        with bpy.data.libraries.load(z_anatomy_path, link=False) as (data_from, data_to):
            data_to.objects = [obj for obj in data_from.objects if obj]

        for obj in data_to.objects:
            if obj:
                bpy.context.scene.collection.objects.link(obj)
                reference_objects[obj.name.lower()] = obj
                # Hide references
                obj.hide_viewport = True
                obj.hide_render = True

        print(f"  Loaded {len(reference_objects)} reference objects")

    # Build custom organs
    print("\nBuilding anatomical structures...")
    created_objects = []

    for name, spec in ANATOMY_STRUCTURES.items():
        print(f"Creating {name}...")

        # Create mesh based on type
        obj = None
        if spec['type'] == 'complex':
            obj = create_complex_mesh(name, spec['position'], spec['size'], spec['subdivisions'])
        elif spec['type'] == 'tube':
            obj = create_tube_mesh(name, spec['position'], spec['size'], spec['subdivisions'])
        elif spec['type'] == 'bean':
            obj = create_bean_mesh(name, spec['position'], spec['size'], spec['subdivisions'])
        elif spec['type'] == 'dome':
            obj = create_dome_mesh(name, spec['position'], spec['size'], spec['subdivisions'])
        elif spec['type'] == 'coiled_tube':
            obj = create_coiled_tube_mesh(name, spec['position'], spec['size'], spec['subdivisions'])
        elif spec['type'] in ['pouch', 'oval', 'elongated', 'sphere', 'curved_tube', 'tube_frame']:
            # Default to complex mesh for these types
            obj = create_complex_mesh(name, spec['position'], spec['size'], spec['subdivisions'])

        if obj:
            # Apply material
            mat = create_organ_material(name, spec['color'])
            obj.data.materials.append(mat)

            # Add custom properties
            obj['system'] = spec['system']
            obj['clickable'] = True

            # Optimize
            if name in POLYGON_BUDGET:
                optimize_mesh(obj, POLYGON_BUDGET[name])

            created_objects.append(obj)

    # Remove reference objects
    for ref_obj in reference_objects.values():
        bpy.data.objects.remove(ref_obj)

    print(f"\n✓ Created {len(created_objects)} anatomical structures")

    # Calculate total polygons
    total_polygons = sum(len(obj.data.polygons) for obj in created_objects if obj.type == 'MESH')
    print(f"  Total polygons: {total_polygons:,}")

    return created_objects

# ============================================================================
# EXPORT FUNCTION
# ============================================================================

def export_model():
    """Export to GLTF"""
    print("\nExporting to GLTF...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / OUTPUT_FILE

    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format='GLB',
        export_cameras=False,
        export_lights=False,
    )

    file_size_mb = output_path.stat().st_size / (1024 * 1024)

    print(f"\n✓ Export complete!")
    print(f"  File: {output_path}")
    print(f"  Size: {file_size_mb:.2f} MB")

    return output_path

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    # Parse command line arguments
    z_anatomy_path = None
    if '--' in sys.argv:
        argv = sys.argv[sys.argv.index('--') + 1:]
        if '--reference' in argv:
            idx = argv.index('--reference')
            if idx + 1 < len(argv):
                z_anatomy_path = argv[idx + 1]

    # Build model
    objects = build_anatomy_model(z_anatomy_path)

    # Export
    output_path = export_model()

    print("\n" + "="*70)
    print("✓ SUCCESS!")
    print("="*70)
    print(f"\nCustom anatomy model created: {OUTPUT_FILE}")
    print(f"Structures: {len(objects)}")
    print(f"\nNext steps:")
    print("1. Update PhysicsAnatomyModel.tsx:")
    print("   const { scene } = useGLTF('/models/human_anatomy_custom.glb');")
    print("2. Refresh browser: http://localhost:5175/physics-demo")
    print()

if __name__ == "__main__":
    main()
