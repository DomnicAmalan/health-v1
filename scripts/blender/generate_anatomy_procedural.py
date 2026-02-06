"""
Procedural Anatomy Model Generator for Blender
Creates a detailed human anatomy model using procedural geometry - NO DOWNLOADS NEEDED!

Usage: blender --background --python generate_anatomy_procedural.py

Output: human_anatomy.glb in public/models/
"""

import bpy
import math
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = PROJECT_ROOT / "cli/packages/apps/client-app/public/models"
OUTPUT_FILE = "human_anatomy.glb"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def clear_scene():
    """Remove all objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def hex_to_rgb(hex_color):
    """Convert hex color to RGB (0-1)"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def create_material(name, color_hex, roughness=0.4, subsurface=0.1):
    """Create PBR material"""
    mat = bpy.data.materials.new(name=f"Mat_{name}")
    # use_nodes is True by default in Blender 5.0+
    nodes = mat.node_tree.nodes
    nodes.clear()

    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    rgb = hex_to_rgb(color_hex)
    bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness

    # Subsurface scattering (optional, may not exist in all Blender versions)
    try:
        if 'Subsurface Weight' in bsdf.inputs:
            bsdf.inputs['Subsurface Weight'].default_value = subsurface
        elif 'Subsurface' in bsdf.inputs:
            bsdf.inputs['Subsurface'].default_value = subsurface
    except:
        pass  # Skip if not available

    output = nodes.new(type='ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    return mat

def create_organ(name, geometry_type, size, position, color, system):
    """Create an organ mesh"""
    if geometry_type == 'sphere':
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=size,
            location=position,
            segments=32,
            ring_count=16
        )
    elif geometry_type == 'ellipsoid':
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=1.0,
            location=position,
            segments=32,
            ring_count=16
        )
        obj = bpy.context.active_object
        obj.scale = size  # (x, y, z) tuple
    elif geometry_type == 'cylinder':
        bpy.ops.mesh.primitive_cylinder_add(
            radius=size[0],
            depth=size[1],
            location=position,
            vertices=32
        )
    elif geometry_type == 'capsule':
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=size[0],
            location=position,
            segments=32,
            ring_count=16
        )
        obj = bpy.context.active_object
        obj.scale = (1.0, size[1], 1.0)  # Stretch vertically

    obj = bpy.context.active_object
    obj.name = name

    # Apply material
    mat = create_material(name, color)
    obj.data.materials.append(mat)

    # Add custom properties
    obj['system'] = system
    obj['clickable'] = True

    # Smooth shading
    bpy.ops.object.shade_smooth()

    return obj

# ============================================================================
# BODY STRUCTURE
# ============================================================================

def create_body_outline():
    """Create basic body shape"""
    print("Creating body outline...")

    # Head
    create_organ(
        "head", "sphere", 0.12,
        (0, 1.5, 0),
        "#FFD7BE", "BODY"
    )

    # Neck
    create_organ(
        "neck", "cylinder", (0.04, 0.12),
        (0, 1.35, 0),
        "#FFD7BE", "BODY"
    )

    # Torso (chest)
    create_organ(
        "torso_upper", "ellipsoid", (0.18, 0.35, 0.12),
        (0, 1.0, 0),
        "#FFD7BE", "BODY"
    )

    # Torso (abdomen)
    create_organ(
        "torso_lower", "ellipsoid", (0.15, 0.25, 0.12),
        (0, 0.7, 0),
        "#FFD7BE", "BODY"
    )

    # Arms
    for side, x_pos in [("left", -0.25), ("right", 0.25)]:
        create_organ(
            f"arm_upper_{side}", "cylinder", (0.03, 0.25),
            (x_pos, 0.95, 0),
            "#FFD7BE", "BODY"
        )
        create_organ(
            f"arm_lower_{side}", "cylinder", (0.025, 0.22),
            (x_pos, 0.65, 0),
            "#FFD7BE", "BODY"
        )

    # Legs
    for side, x_pos in [("left", -0.08), ("right", 0.08)]:
        create_organ(
            f"leg_upper_{side}", "cylinder", (0.06, 0.4),
            (x_pos, 0.25, 0),
            "#FFD7BE", "BODY"
        )
        create_organ(
            f"leg_lower_{side}", "cylinder", (0.04, 0.4),
            (x_pos, -0.15, 0),
            "#FFD7BE", "BODY"
        )

# ============================================================================
# ORGAN SYSTEMS
# ============================================================================

def create_brain():
    """Create brain"""
    print("Creating brain...")
    create_organ(
        "brain", "ellipsoid", (0.08, 0.10, 0.09),
        (0, 1.52, 0.02),
        "#E8B4D9", "NERVOUS"
    )

def create_heart():
    """Create heart"""
    print("Creating heart...")
    # Main heart body
    create_organ(
        "heart", "ellipsoid", (0.08, 0.10, 0.07),
        (0.02, 0.98, 0.05),
        "#E74C3C", "CARDIOVASCULAR"
    )

def create_lungs():
    """Create lungs"""
    print("Creating lungs...")
    # Right lung
    create_organ(
        "lung_right", "ellipsoid", (0.10, 0.20, 0.08),
        (0.10, 1.0, 0),
        "#FFB6C1", "RESPIRATORY"
    )
    # Left lung (smaller due to heart)
    create_organ(
        "lung_left", "ellipsoid", (0.08, 0.18, 0.07),
        (-0.10, 1.0, 0),
        "#FFB6C1", "RESPIRATORY"
    )

def create_digestive_system():
    """Create digestive organs"""
    print("Creating digestive system...")

    # Liver (largest solid organ)
    create_organ(
        "liver", "ellipsoid", (0.14, 0.10, 0.18),
        (0.08, 0.85, 0.05),
        "#8B4513", "DIGESTIVE"
    )

    # Stomach
    create_organ(
        "stomach", "ellipsoid", (0.08, 0.12, 0.08),
        (-0.05, 0.80, 0.08),
        "#FFDAB9", "DIGESTIVE"
    )

    # Intestines (simplified)
    create_organ(
        "intestines", "ellipsoid", (0.15, 0.15, 0.12),
        (0, 0.60, 0.08),
        "#FFE4B5", "DIGESTIVE"
    )

    # Pancreas
    create_organ(
        "pancreas", "cylinder", (0.02, 0.12),
        (0, 0.78, 0.02),
        "#DEB887", "DIGESTIVE"
    )

    # Spleen
    create_organ(
        "spleen", "ellipsoid", (0.05, 0.08, 0.04),
        (-0.12, 0.85, 0.02),
        "#8B008B", "DIGESTIVE"
    )

def create_urinary_system():
    """Create kidneys and bladder"""
    print("Creating urinary system...")

    # Kidneys
    for side, x_pos in [("left", -0.08), ("right", 0.08)]:
        create_organ(
            f"kidney_{side}", "ellipsoid", (0.05, 0.08, 0.04),
            (x_pos, 0.70, -0.05),
            "#8B0000", "URINARY"
        )

    # Bladder
    create_organ(
        "bladder", "sphere", 0.06,
        (0, 0.45, 0.08),
        "#FFD700", "URINARY"
    )

def create_skeletal_system():
    """Create skeletal structures"""
    print("Creating skeletal system...")

    # Skull (wireframe)
    obj = create_organ(
        "skull", "sphere", 0.13,
        (0, 1.5, 0),
        "#E8E8E8", "SKELETAL"
    )
    # Make semi-transparent
    try:
        obj.data.materials[0].blend_method = 'BLEND'
        bsdf = obj.data.materials[0].node_tree.nodes.get("Principled BSDF")
        if bsdf and 'Alpha' in bsdf.inputs:
            bsdf.inputs['Alpha'].default_value = 0.3
    except:
        pass  # Skip if transparency not available

    # Spine
    create_organ(
        "spine", "cylinder", (0.02, 0.8),
        (0, 0.8, -0.05),
        "#D3D3D3", "SKELETAL"
    )

    # Ribs (simplified as cage)
    for i in range(6):
        y_pos = 1.2 - i * 0.08
        create_organ(
            f"rib_{i}", "ellipsoid", (0.18, 0.01, 0.10),
            (0, y_pos, 0),
            "#D3D3D3", "SKELETAL"
        )

def create_vascular_system():
    """Create major blood vessels"""
    print("Creating vascular system...")

    # Aorta (simplified)
    create_organ(
        "aorta", "cylinder", (0.015, 0.6),
        (0.02, 0.80, 0),
        "#C0392B", "CARDIOVASCULAR"
    )

    # Superior vena cava
    create_organ(
        "vena_cava_superior", "cylinder", (0.012, 0.15),
        (0.05, 1.15, 0.02),
        "#8B0000", "CARDIOVASCULAR"
    )

def create_nervous_system():
    """Create nervous system"""
    print("Creating nervous system...")

    # Spinal cord
    create_organ(
        "spinal_cord", "cylinder", (0.01, 0.75),
        (0, 0.82, -0.05),
        "#9B59B6", "NERVOUS"
    )

    # Major nerve branches (simplified)
    for side, x_pos in [("left", -0.08), ("right", 0.08)]:
        create_organ(
            f"nerve_branch_{side}", "cylinder", (0.005, 0.3),
            (x_pos, 0.65, -0.05),
            "#8E44AD", "NERVOUS"
        )

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*70)
    print("PROCEDURAL ANATOMY MODEL GENERATOR")
    print("="*70 + "\n")

    # Clear scene
    print("Clearing scene...")
    clear_scene()

    # Create body outline
    create_body_outline()

    # Create organ systems
    create_brain()
    create_heart()
    create_lungs()
    create_digestive_system()
    create_urinary_system()
    create_skeletal_system()
    create_vascular_system()
    create_nervous_system()

    # Count objects
    organ_count = len([obj for obj in bpy.data.objects if obj.type == 'MESH'])
    print(f"\n✓ Created {organ_count} anatomical structures")

    # Export
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
    print(f"  Organs: {organ_count}")

    print("\n" + "="*70)
    print("SUCCESS! Anatomy model created")
    print("="*70)
    print("\nNext step: Update PhysicsAnatomyModel.tsx to load the GLB")
    print()

if __name__ == "__main__":
    main()
