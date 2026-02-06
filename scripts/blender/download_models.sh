#!/bin/bash
# Download BodyParts3D anatomical models
# Run: bash scripts/blender/download_models.sh

set -e

echo "=================================================="
echo "BodyParts3D Model Downloader"
echo "=================================================="
echo ""

# Create directory
MODELS_DIR="scripts/blender/bodyparts3d_models"
mkdir -p "$MODELS_DIR"

echo "Downloading models to: $MODELS_DIR"
echo ""

# Base URL for BodyParts3D
BASE_URL="http://lifesciencedb.jp/bp3d/OBJ"

# FMA codes to download
declare -a FMA_CODES=(
    # Nervous System
    "FMA50801"  # Brain
    "FMA7647"   # Spinal Cord

    # Cardiovascular
    "FMA7088"   # Heart
    "FMA3986"   # Aorta
    "FMA4720"   # Superior Vena Cava

    # Respiratory
    "FMA7195"   # Right Lung
    "FMA7196"   # Left Lung
    "FMA7394"   # Trachea
    "FMA13322"  # Diaphragm

    # Digestive
    "FMA7197"   # Liver
    "FMA7148"   # Stomach
    "FMA7199"   # Gallbladder
    "FMA7203"   # Pancreas
    "FMA7201"   # Spleen
    "FMA7200"   # Small Intestine
    "FMA14543"  # Large Intestine

    # Urinary
    "FMA7184"   # Right Kidney
    "FMA7185"   # Left Kidney
    "FMA15900"  # Bladder

    # Skeletal
    "FMA46565"  # Skull
    "FMA24136"  # Spine
    "FMA9468"   # Ribs
    "FMA16585"  # Pelvis
)

# Download each model
DOWNLOADED=0
SKIPPED=0
FAILED=0

for FMA in "${FMA_CODES[@]}"; do
    FILE="$MODELS_DIR/${FMA}.obj"

    if [ -f "$FILE" ]; then
        echo "⏭  Skipping $FMA (already exists)"
        SKIPPED=$((SKIPPED + 1))
    else
        echo "⬇️  Downloading $FMA..."
        if curl -f -o "$FILE" "${BASE_URL}/${FMA}.obj" 2>/dev/null; then
            echo "✓ Downloaded $FMA"
            DOWNLOADED=$((DOWNLOADED + 1))
        else
            echo "❌ Failed to download $FMA"
            FAILED=$((FAILED + 1))
            rm -f "$FILE"  # Remove partial file
        fi
    fi
done

echo ""
echo "=================================================="
echo "Download Complete"
echo "=================================================="
echo "Downloaded: $DOWNLOADED"
echo "Skipped: $SKIPPED"
echo "Failed: $FAILED"
echo ""
echo "Next steps:"
echo "1. Run Blender script:"
echo "   blender --background --python scripts/blender/import_bodyparts3d.py"
echo ""
echo "2. Or manually download missing models from:"
echo "   http://lifesciencedb.jp/bp3d/"
echo ""
