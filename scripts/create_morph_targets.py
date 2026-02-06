"""
Blender Script: Create Morphable 3D Anatomy Model with BMI Variants
Generates blend shapes (morph targets) for patient-specific body morphing

USAGE:
    blender --background --python create_morph_targets.py

REQUIREMENTS:
    - Blender 4.0+
    - Base human model (from MakeHuman, Manuel Bastioni Lab, or BodyParts3D)
    - Python 3.10+

OUTPUT:
    - human_body_morphable.glb (GLTF with morph targets)
    - Includes 6 BMI presets: Underweight, Normal, Overweight, Obese1-3
"""

import bpy
import bmesh
import os
import sys
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = PROJECT_ROOT / "cli/packages/apps/client-app/public/models/anatomy"
OUTPUT_FILE = "human_body_morphable.glb"

# BMI Presets (target body compositions)
BMI_PRESETS = {
    'Underweight': {
        'bmi': 17.0,
        'abdomen_scale': 0.85,    # Flatter abdomen
        'limbs_scale': 0.90,      # Thinner limbs
        'face_scale': 0.95,       # Angular face
    },
    'Normal': {
        'bmi': 22.0,
        'abdomen_scale': 1.0,     # Reference (no change)
        'limbs_scale': 1.0,
        'face_scale': 1.0,
    },
    'Overweight': {
        'bmi': 27.5,
        'abdomen_scale': 1.20,    # Moderate belly
        'limbs_scale': 1.08,      # Slightly thicker
        'face_scale': 1.05,       # Fuller face
    },
    'Obese1': {
        'bmi': 32.5,
        'abdomen_scale': 1.45,    # Large belly
        'limbs_scale': 1.15,      # Thicker extremities
        'face_scale': 1.12,       # Double chin begins
    },
    'Obese2': {
        'bmi': 37.5,
        'abdomen_scale': 1.70,    # Very large pannus
        'limbs_scale': 1.22,      # Fat deposits in arms/legs
        'face_scale': 1.18,       # Prominent double chin
    },
    'Obese3': {
        'bmi': 45.0,
        'abdomen_scale': 2.00,    # Massive abdominal obesity
        'limbs_scale': 1.30,      # Significant fat deposits
        'face_scale': 1.25,       # Triple chin, jowls
    },
}


def clear_scene():
    """Clear all existing objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    print("✓ Scene cleared")


def import_base_model():
    """
    Import base human model

    OPTIONS:
    1. MakeHuman (.mhx2 file) - Best for anatomically correct base
    2. Manuel Bastioni Lab addon
    3. BodyParts3D OBJ files (if available)
    4. Simple primitive (for testing)
    """
    print("Importing base human model...")

    # For demonstration, create a simple human-like mesh
    # In production, replace with actual anatomical model import

    # Create base humanoid mesh
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 1))
    body = bpy.context.active_object
    body.name = "BodyReference_BMI22"

    # Scale to human proportions (roughly 170cm tall)
    body.scale = (0.3, 0.2, 0.85)
    bpy.ops.object.transform_apply(scale=True)

    print(f"✓ Base model created: {body.name}")
    return body


def create_vertex_groups(obj):
    """
    Create vertex groups for body regions
    Used for region-specific morphing (abdomen, limbs, face, etc.)
    """
    print("Creating vertex groups for body regions...")

    # Enter edit mode
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')

    # Get mesh data
    bm = bmesh.from_edit_mesh(obj.data)

    # Create vertex groups
    groups = {
        'abdomen': [],
        'chest': [],
        'limbs_upper': [],
        'limbs_lower': [],
        'face': [],
        'neck': [],
    }

    # Assign vertices to groups based on location
    for vert in bm.verts:
        z = vert.co.z
        y = vert.co.y
        x_abs = abs(vert.co.x)

        # Abdomen (mid-torso, front)
        if 0.3 < z < 0.7 and y > 0:
            groups['abdomen'].append(vert.index)

        # Chest (upper torso)
        elif 0.7 < z < 1.0:
            groups['chest'].append(vert.index)

        # Face (top, if model has head)
        elif z > 1.5:
            groups['face'].append(vert.index)

        # Limbs
        elif z < 0.5:
            if x_abs > 0.15:  # Arms/legs (outer edges)
                if z > 0.25:
                    groups['limbs_upper'].append(vert.index)
                else:
                    groups['limbs_lower'].append(vert.index)

    # Create vertex groups in object
    for group_name, vert_indices in groups.items():
        vgroup = obj.vertex_groups.new(name=group_name)
        vgroup.add(vert_indices, 1.0, 'ADD')

    bpy.ops.object.mode_set(mode='OBJECT')
    print(f"✓ Created {len(groups)} vertex groups")

    return groups


def create_bmi_variant(base_obj, preset_name, preset_params):
    """
    Create BMI variant by sculpting/scaling base mesh
    """
    print(f"Creating BMI variant: {preset_name} (BMI {preset_params['bmi']})...")

    # Duplicate base object
    bpy.ops.object.select_all(action='DESELECT')
    base_obj.select_set(True)
    bpy.context.view_layer.objects.active = base_obj
    bpy.ops.object.duplicate()

    variant = bpy.context.active_object
    variant.name = f"Body_{preset_name}"

    # Enter edit mode for vertex manipulation
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(variant.data)

    # Apply region-specific scaling based on BMI preset
    abdomen_scale = preset_params['abdomen_scale']
    limbs_scale = preset_params['limbs_scale']
    face_scale = preset_params['face_scale']

    for vert in bm.verts:
        z = vert.co.z
        y = vert.co.y
        x = vert.co.x

        # Abdomen expansion (belly)
        if 0.3 < z < 0.7 and y > 0:
            vert.co.y *= abdomen_scale
            vert.co.x *= (1 + (abdomen_scale - 1) * 0.5)  # Slight horizontal expansion

        # Limbs thickening
        elif z < 0.5:
            if abs(x) > 0.15:  # Arms/legs
                vert.co.x *= limbs_scale
                vert.co.y *= (1 + (limbs_scale - 1) * 0.5)

        # Face/neck expansion
        elif z > 1.0:
            vert.co *= face_scale

    # Update mesh
    bmesh.update_edit_mesh(variant.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    print(f"✓ Variant created: {preset_name}")
    return variant


def create_shape_keys(base_obj, variants):
    """
    Convert variant objects into shape keys (morph targets) on base object
    """
    print("Creating shape keys from variants...")

    bpy.context.view_layer.objects.active = base_obj

    # Create basis shape key
    base_obj.shape_key_add(name='Basis')
    print("  ✓ Basis shape key created")

    # Create shape key for each variant
    for preset_name, variant_obj in variants.items():
        # Ensure both objects have same vertex count
        if len(base_obj.data.vertices) != len(variant_obj.data.vertices):
            print(f"  ✗ ERROR: Vertex count mismatch for {preset_name}")
            continue

        # Add shape key
        shape_key = base_obj.shape_key_add(name=preset_name, from_mix=False)

        # Copy vertex positions from variant to shape key
        for i, vert in enumerate(variant_obj.data.vertices):
            shape_key.data[i].co = vert.co

        print(f"  ✓ Shape key created: {preset_name}")

    print(f"✓ {len(variants)} shape keys created")


def add_organ_meshes(scene_obj):
    """
    Add simplified organ meshes with metadata
    In production, replace with actual anatomical models from BodyParts3D
    """
    print("Adding organ meshes...")

    organs = [
        # (name, location, scale, color)
        ('heart', (0.05, 0.05, 0.7), 0.08, '#E74C3C'),
        ('liver_right_lobe', (0.15, 0.05, 0.5), 0.12, '#D68910'),
        ('stomach_body', (-0.05, 0.05, 0.55), 0.08, '#E67E22'),
        ('lung_right', (0.12, 0.02, 0.75), 0.10, '#3498DB'),
        ('lung_left', (-0.12, 0.02, 0.75), 0.10, '#3498DB'),
        ('kidney_right', (0.10, -0.05, 0.45), 0.05, '#16A085'),
        ('kidney_left', (-0.10, -0.05, 0.45), 0.05, '#16A085'),
    ]

    for organ_name, location, scale, color in organs:
        # Create simple sphere for organ (replace with actual models)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=scale, location=location)
        organ = bpy.context.active_object
        organ.name = organ_name

        # Add metadata
        organ['isOrgan'] = True
        organ['organName'] = organ_name
        organ['displayColor'] = color

        # Create material
        mat = bpy.data.materials.new(name=f"Mat_{organ_name}")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        bsdf = nodes.get('Principled BSDF')
        if bsdf:
            # Convert hex color to RGB
            r, g, b = tuple(int(color.lstrip('#')[i:i+2], 16) / 255.0 for i in (0, 2, 4))
            bsdf.inputs['Base Color'].default_value = (r, g, b, 1.0)
            bsdf.inputs['Roughness'].default_value = 0.6

        organ.data.materials.append(mat)

    print(f"✓ {len(organs)} organ meshes added")


def export_gltf(base_obj, output_path):
    """
    Export model to GLTF with morph targets (shape keys)
    """
    print(f"Exporting to GLTF: {output_path}")

    # Select base object and all organs
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.data.objects:
        if obj == base_obj or obj.get('isOrgan'):
            obj.select_set(True)

    bpy.context.view_layer.objects.active = base_obj

    # Export with Draco compression
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format='GLB',  # Binary GLTF
        use_selection=True,
        export_textures=True,
        export_normals=True,
        export_materials='EXPORT',
        export_colors=True,
        export_cameras=False,
        export_lights=False,
        export_yup=True,  # Y-up coordinate system for Three.js
        export_apply=True,  # Apply modifiers
        export_morph=True,  # CRITICAL: Include morph targets
        export_morph_normal=True,
        export_morph_tangent=True,
        export_draco_mesh_compression_enable=True,  # Draco compression
        export_draco_mesh_compression_level=6,
    )

    file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
    print(f"✓ Export complete: {file_size:.2f} MB")


def main():
    """Main execution pipeline"""
    print("\n" + "="*60)
    print("3D Morphable Anatomy Model Generator")
    print("Creating patient-specific body model with BMI variants")
    print("="*60 + "\n")

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Clear scene
    clear_scene()

    # Step 2: Import base human model
    base_obj = import_base_model()

    # Step 3: Create vertex groups for region-specific morphing
    create_vertex_groups(base_obj)

    # Step 4: Create BMI variants
    variants = {}
    for preset_name, preset_params in BMI_PRESETS.items():
        if preset_name == 'Normal':  # Normal is the base, skip
            continue
        variants[preset_name] = create_bmi_variant(base_obj, preset_name, preset_params)

    # Step 5: Convert variants to shape keys on base object
    create_shape_keys(base_obj, variants)

    # Step 6: Delete variant objects (no longer needed)
    for variant_obj in variants.values():
        bpy.data.objects.remove(variant_obj, do_unlink=True)

    # Step 7: Add organ meshes
    add_organ_meshes(base_obj)

    # Step 8: Export to GLTF
    output_path = OUTPUT_DIR / OUTPUT_FILE
    export_gltf(base_obj, output_path)

    print("\n" + "="*60)
    print("✓ Model generation complete!")
    print(f"Output: {output_path}")
    print("\nNext steps:")
    print("1. Test model in Three.js viewer")
    print("2. Replace primitive shapes with BodyParts3D anatomical models")
    print("3. Add more detailed organ structures")
    print("4. Refine BMI morph targets based on medical reference images")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
