"""
BodyParts3D Import Script for Blender
Imports anatomical models from BodyParts3D database and exports as GLTF

Usage:
1. Download OBJ files from http://lifesciencedb.jp/bp3d/
2. Place OBJ files in: scripts/blender/bodyparts3d_models/
3. Run this script in Blender: blender --background --python import_bodyparts3d.py
4. Output: cli/packages/apps/client-app/public/models/human_anatomy.glb

License: BodyParts3D models are CC BY-SA 2.1 JP
"""

import bpy
import os
import sys
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent
MODELS_INPUT_DIR = PROJECT_ROOT / "scripts/blender/bodyparts3d_models"
MODELS_OUTPUT_DIR = PROJECT_ROOT / "cli/packages/apps/client-app/public/models"

# Anatomical models to import (FMA codes from BodyParts3D)
# Format: (fma_code, organ_name, system, color_hex, position_xyz)
ANATOMY_MODELS = [
    # NERVOUS SYSTEM (Purple)
    ("FMA50801", "brain", "NERVOUS", "#9B59B6", (0, 1.5, 0)),
    ("FMA7647", "spinal_cord", "NERVOUS", "#8E44AD", (0, 0.8, -0.05)),

    # CARDIOVASCULAR SYSTEM (Red)
    ("FMA7088", "heart", "CARDIOVASCULAR", "#E74C3C", (0.02, 1.0, 0.05)),
    ("FMA3986", "aorta", "CARDIOVASCULAR", "#C0392B", (0, 1.0, 0)),
    ("FMA4720", "superior_vena_cava", "CARDIOVASCULAR", "#8B0000", (0.05, 1.1, 0.05)),

    # RESPIRATORY SYSTEM (Light Blue)
    ("FMA7195", "lung_right", "RESPIRATORY", "#5DADE2", (0.08, 1.0, 0)),
    ("FMA7196", "lung_left", "RESPIRATORY", "#5DADE2", (-0.08, 1.0, 0)),
    ("FMA7394", "trachea", "RESPIRATORY", "#3498DB", (0, 1.2, 0.05)),
    ("FMA13322", "diaphragm", "RESPIRATORY", "#2E86C1", (0, 0.7, 0)),

    # DIGESTIVE SYSTEM (Orange/Brown)
    ("FMA7197", "liver", "DIGESTIVE", "#D68910", (0.1, 0.85, 0.05)),
    ("FMA7148", "stomach", "DIGESTIVE", "#E67E22", (-0.05, 0.8, 0.08)),
    ("FMA7199", "gallbladder", "DIGESTIVE", "#F39C12", (0.12, 0.82, 0.08)),
    ("FMA7203", "pancreas", "DIGESTIVE", "#CA6F1E", (0, 0.75, 0.05)),
    ("FMA7201", "spleen", "DIGESTIVE", "#7D3C98", (-0.12, 0.85, 0.05)),
    ("FMA7200", "small_intestine", "DIGESTIVE", "#F5B041", (0, 0.6, 0.08)),
    ("FMA14543", "large_intestine", "DIGESTIVE", "#DC7633", (0, 0.55, 0.1)),

    # URINARY SYSTEM (Yellow)
    ("FMA7203", "kidney_right", "URINARY", "#F4D03F", (0.08, 0.7, -0.05)),
    ("FMA7204", "kidney_left", "URINARY", "#F4D03F", (-0.08, 0.7, -0.05)),
    ("FMA15900", "bladder", "URINARY", "#F7DC6F", (0, 0.45, 0.08)),

    # SKELETAL SYSTEM (Light Gray)
    ("FMA46565", "skull", "SKELETAL", "#E8E8E8", (0, 1.5, 0)),
    ("FMA7647", "spine", "SKELETAL", "#D5D8DC", (0, 0.8, -0.05)),
    ("FMA9468", "ribs", "SKELETAL", "#BDC3C7", (0, 1.0, 0)),
    ("FMA16585", "pelvis", "SKELETAL", "#AAB7B8", (0, 0.5, 0)),
]

# Scale factor (BodyParts3D models are in mm, we want meters)
GLOBAL_SCALE = 0.001

# Target polygon count for optimization
TARGET_POLYGON_COUNT = {
    "high_detail": 500000,  # Total for all organs
    "low_detail": 50000,    # For web performance
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def clear_scene():
    """Remove all objects, meshes, materials from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.textures:
        if block.users == 0:
            bpy.data.textures.remove(block)
    for block in bpy.data.images:
        if block.users == 0:
            bpy.data.images.remove(block)

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple (0-1 range)"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def create_material(name, color_hex, roughness=0.4):
    """Create PBR material for organ"""
    mat = bpy.data.materials.new(name=f"Mat_{name}")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()

    # Principled BSDF
    node_bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    rgb = hex_to_rgb(color_hex)
    node_bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    node_bsdf.inputs['Roughness'].default_value = roughness
    node_bsdf.inputs['Subsurface'].default_value = 0.05  # Slight subsurface for realism
    node_bsdf.inputs['Subsurface Color'].default_value = (*rgb, 1.0)

    # Output
    node_output = nodes.new(type='ShaderNodeOutputMaterial')
    mat.node_tree.links.new(node_bsdf.outputs['BSDF'], node_output.inputs['Surface'])

    return mat

def import_obj_model(fma_code, organ_name):
    """Import OBJ file for given FMA code"""
    obj_path = MODELS_INPUT_DIR / f"{fma_code}.obj"

    if not obj_path.exists():
        print(f"⚠️  WARNING: Model not found: {obj_path}")
        return None

    # Import OBJ
    bpy.ops.import_scene.obj(filepath=str(obj_path))

    # Get imported object (last selected)
    imported_obj = bpy.context.selected_objects[0] if bpy.context.selected_objects else None

    if imported_obj:
        imported_obj.name = organ_name
        print(f"✓ Imported: {organ_name} ({fma_code})")

    return imported_obj

def clean_mesh(obj):
    """Clean and optimize mesh"""
    if not obj or obj.type != 'MESH':
        return

    # Select only this object
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    # Enter edit mode
    bpy.ops.object.mode_set(mode='EDIT')

    # Clean mesh
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.0001)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.delete_loose()

    # Back to object mode
    bpy.ops.object.mode_set(mode='OBJECT')

def decimate_mesh(obj, ratio=0.1):
    """Reduce polygon count using decimate modifier"""
    if not obj or obj.type != 'MESH':
        return

    # Add decimate modifier
    mod = obj.modifiers.new(name='Decimate', type='DECIMATE')
    mod.ratio = ratio
    mod.use_collapse_triangulate = True

    # Apply modifier
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier='Decimate')

# ============================================================================
# MAIN IMPORT FUNCTION
# ============================================================================

def import_anatomy_models():
    """Import all anatomical models from BodyParts3D"""
    print("\n" + "="*70)
    print("IMPORTING BODYPARTS3D ANATOMICAL MODELS")
    print("="*70 + "\n")

    # Clear existing scene
    print("Clearing scene...")
    clear_scene()

    # Create collections for each system
    collections = {}
    for system in ["NERVOUS", "CARDIOVASCULAR", "RESPIRATORY", "DIGESTIVE", "URINARY", "SKELETAL"]:
        collection = bpy.data.collections.new(name=f"{system}_System")
        bpy.context.scene.collection.children.link(collection)
        collections[system] = collection

    imported_count = 0
    skipped_count = 0

    # Import each model
    for fma_code, organ_name, system, color_hex, position in ANATOMY_MODELS:
        obj = import_obj_model(fma_code, organ_name)

        if obj:
            # Scale to meters
            obj.scale = (GLOBAL_SCALE, GLOBAL_SCALE, GLOBAL_SCALE)
            bpy.ops.object.transform_apply(scale=True)

            # Position in body
            obj.location = position

            # Clean mesh
            clean_mesh(obj)

            # Create and apply material
            mat = create_material(organ_name, color_hex)
            if obj.data.materials:
                obj.data.materials[0] = mat
            else:
                obj.data.materials.append(mat)

            # Move to appropriate collection
            if system in collections:
                collections[system].objects.link(obj)
                # Remove from scene collection
                if obj.name in bpy.context.scene.collection.objects:
                    bpy.context.scene.collection.objects.unlink(obj)

            # Add custom properties for interaction
            obj['system_code'] = system
            obj['fma_code'] = fma_code
            obj['clickable'] = True

            imported_count += 1
        else:
            skipped_count += 1

    print(f"\n✓ Import complete: {imported_count} models imported, {skipped_count} skipped")
    return imported_count

# ============================================================================
# OPTIMIZATION FUNCTION
# ============================================================================

def optimize_models(target_detail='high_detail'):
    """Optimize polygon count for web performance"""
    print("\n" + "="*70)
    print(f"OPTIMIZING MODELS (Target: {target_detail})")
    print("="*70 + "\n")

    target_total = TARGET_POLYGON_COUNT[target_detail]

    # Count current polygons
    total_polygons = sum(len(obj.data.polygons) for obj in bpy.data.objects if obj.type == 'MESH')
    print(f"Current polygon count: {total_polygons:,}")
    print(f"Target polygon count: {target_total:,}")

    if total_polygons <= target_total:
        print("✓ Already optimized!")
        return

    # Calculate decimation ratio
    decimate_ratio = target_total / total_polygons
    print(f"Decimation ratio: {decimate_ratio:.2%}")

    # Apply decimation to all meshes
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            print(f"  Decimating {obj.name}...")
            decimate_mesh(obj, ratio=decimate_ratio)

    # Count final polygons
    final_polygons = sum(len(obj.data.polygons) for obj in bpy.data.objects if obj.type == 'MESH')
    print(f"\n✓ Optimization complete: {final_polygons:,} polygons")

# ============================================================================
# EXPORT FUNCTION
# ============================================================================

def export_gltf(output_filename='human_anatomy.glb'):
    """Export scene as GLTF/GLB with Draco compression"""
    print("\n" + "="*70)
    print("EXPORTING TO GLTF")
    print("="*70 + "\n")

    # Ensure output directory exists
    MODELS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output_path = MODELS_OUTPUT_DIR / output_filename

    # Export settings
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format='GLB',  # Binary GLTF
        export_textures=True,
        export_normals=True,
        export_materials='EXPORT',
        export_colors=True,
        export_cameras=False,
        export_lights=False,
        export_apply=True,
        export_yup=True,  # Y-up coordinate system for Three.js
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
    )

    # Get file size
    file_size_mb = output_path.stat().st_size / (1024 * 1024)

    print(f"✓ Export complete: {output_path}")
    print(f"  File size: {file_size_mb:.2f} MB")

    return output_path

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*70)
    print("BODYPARTS3D TO GLTF CONVERTER")
    print("="*70)

    # Check input directory
    if not MODELS_INPUT_DIR.exists():
        print(f"\n❌ ERROR: Input directory not found: {MODELS_INPUT_DIR}")
        print(f"\nPlease create the directory and place BodyParts3D OBJ files there.")
        print(f"\nDownload from: http://lifesciencedb.jp/bp3d/")
        sys.exit(1)

    # Count available models
    obj_files = list(MODELS_INPUT_DIR.glob("*.obj"))
    print(f"\nFound {len(obj_files)} OBJ files in input directory")

    # Import models
    imported_count = import_anatomy_models()

    if imported_count == 0:
        print("\n❌ ERROR: No models were imported!")
        print("Please download OBJ files from BodyParts3D and place them in:")
        print(f"  {MODELS_INPUT_DIR}")
        sys.exit(1)

    # Optimize for web (high detail version)
    optimize_models(target_detail='high_detail')
    export_gltf('human_anatomy_high.glb')

    # Optimize for web (low detail version for initial load)
    optimize_models(target_detail='low_detail')
    export_gltf('human_anatomy_low.glb')

    print("\n" + "="*70)
    print("✓ CONVERSION COMPLETE!")
    print("="*70)
    print("\nOutput files:")
    print(f"  - {MODELS_OUTPUT_DIR / 'human_anatomy_high.glb'} (detailed)")
    print(f"  - {MODELS_OUTPUT_DIR / 'human_anatomy_low.glb'} (optimized)")
    print("\nNext steps:")
    print("  1. Copy GLB files to client-app/public/models/")
    print("  2. Update PhysicsAnatomyModel.tsx to load the GLB")
    print("  3. Test in browser at http://localhost:5175/physics-demo")
    print("\nAttribution required:")
    print("  'Anatomical models from BodyParts3D Database (CC BY-SA 2.1 JP)'")
    print("  'Database Center for Life Science, Japan'")
    print()

if __name__ == "__main__":
    main()
