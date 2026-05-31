"""
Composite Provider — Final Quality Optimization Phase
Improvements implemented:
  1. Alpha matting & halo removal for clean edges.
  2. Contrast matching & ambient/contact shadows.
  3. Curvature correction (perspective/polynomial warp).
  4. Adaptive geometric placement (no external API deps).
  5. Deterministic AI preset prompts for variations.
"""

import io, uuid, tempfile, os, requests, random
from dataclasses import dataclass
from typing import Optional, Tuple
import numpy as np
import cv2
from PIL import Image, ImageFilter, ImageEnhance
from rembg import remove, new_session
from .base_provider import AIProvider

# ── Constants ──────────────────────────────────────────────────────────────────
WHITE_BG_THRESHOLD  = 215   # pixel avg brightness above which = background
WARM_DIFF_MIN       = 20    # R-B > this → warm/gold pixel
SAT_MIN             = 35    # HSV-style saturation threshold for jewelry
QUALITY_THRESHOLD   = 0.005 # min coverage to use extracted product (0.5% for delicate chains)

DEBUG_MODE = os.environ.get("COMPOSITE_DEBUG", "false").lower() == "true"
DEBUG_DIR  = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "debug_output"
)

PRESETS_LUXURY = [
    "Pristine white marble podium with subtle gold accents, luxury jewelry store display, sharp 8k photography, clean background",
    "Rich dark purple velvet display cushion, premium jewelry showcase, soft directional studio lighting, elegant shadows",
    "Solid gold pedestal on a black reflective surface, premium luxury aesthetic, dramatic lighting, highly detailed",
    "Boutique glass showcase with soft warm spotlighting, elegant luxury background, blurred background bokeh"
]

PRESETS_CREATIVE = [
    "Refined lifestyle product campaign scene, soft ivory silk fabric surface, warm natural window light, pristine editorial styling, calm premium atmosphere, empty open center",
    "Minimal premium still life background, pale stone surface with soft champagne fabric, gentle daylight, elegant magazine campaign mood, clean open product area",
    "Premium resort-lifestyle product scene, sunlit travertine surface, subtle cream linen texture, warm airy shadows, sophisticated high-end styling, uncluttered foreground",
    "Modern editorial still life background, muted sage and ivory tones, soft diffused studio light, pristine surface, understated luxury campaign aesthetic, empty display area"
]

@dataclass
class ProductProfile:
    jewelry_type: str
    width: int
    height: int
    aspect_ratio: float
    coverage_ratio: float
    pendant_center: Optional[Tuple[int, int]]
    left_endpoint: Optional[Tuple[int, int]]
    right_endpoint: Optional[Tuple[int, int]]
    dominant_material: str
    chain_thickness_estimate: float

# ── Debug helper ───────────────────────────────────────────────────────────────
def _dbg(img: Image.Image, name: str):
    if not DEBUG_MODE:
        return
    os.makedirs(DEBUG_DIR, exist_ok=True)
    img.save(os.path.join(DEBUG_DIR, name))
    print(f"[Composite] DEBUG > {name}")

# ── Phase B: Extraction & Matting ──────────────────────────────────────────────
def _coverage(img: Image.Image) -> float:
    arr = np.array(img)
    return float(np.sum(arr[:, :, 3] > 10)) / float(arr[:, :, 3].size)

def _remove_plain_bg(img: Image.Image, thr: int = WHITE_BG_THRESHOLD) -> Image.Image:
    """Remove near-white/near-grey plain studio backgrounds."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8).copy()
    r, g, b = arr[:,:,0].astype(int), arr[:,:,1].astype(int), arr[:,:,2].astype(int)
    avg = (r + g + b) / 3
    arr[:,:,3] = np.where(avg > thr, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr, "RGBA")
    
    # Advanced Halo Removal
    alpha = out.split()[3]
    alpha = alpha.filter(ImageFilter.MinFilter(3))     # Erosion
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.5))  # Smooth blending
    out.putalpha(alpha)
    return out

def _isolate_jewelry(img: Image.Image) -> Image.Image:
    """
    Keep jewelry-like pixels without assuming every product is yellow gold.
    Warm/high-saturation pixels keep gold and rose gold; edge-gated neutral
    pixels preserve silver, diamonds and pearls without pulling in smooth stands.
    """
    arr = np.array(img.convert("RGBA"), dtype=np.uint8).copy()
    r, g, b = arr[:,:,0].astype(int), arr[:,:,1].astype(int), arr[:,:,2].astype(int)
    
    warm = (r - b) > 30
    rose_gold = ((r - g) > 12) & ((g - b) > -8)
    mx, mn = np.maximum(np.maximum(r,g),b), np.minimum(np.minimum(r,g),b)
    sat = np.where(mx > 0, ((mx - mn) / (mx + 1e-6)) * 255, 0)
    sat_ok = sat > 45
    bright = (r + g + b) / 3
    bright_ok = (bright < 240) & (bright > 40)

    gray = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 35, 110)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1) > 0
    neutral_detail = (sat < 55) & (bright > 85) & (bright < 238) & edges
    color_seed = (warm | rose_gold | sat_ok) & bright_ok
    seed_neighborhood = cv2.dilate(
        np.where(color_seed, 255, 0).astype(np.uint8),
        np.ones((9, 9), np.uint8),
        iterations=1
    ) > 0
    
    keep = color_seed | (neutral_detail & seed_neighborhood)
    raw_alpha = np.where(keep, 255, 0).astype(np.uint8)
    
    # DILATE before connected components to bridge small gaps in the chain!
    kernel = np.ones((5, 5), np.uint8)
    dilated_alpha = cv2.dilate(raw_alpha, kernel, iterations=1)
    
    # Apply Connected Component Analysis to the DILATED alpha
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(dilated_alpha, connectivity=8)
    
    clean_alpha = np.zeros_like(raw_alpha)
    if num_labels > 1:
        # Keep all components larger than 100 pixels to prevent deleting side chains
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] > 100:
                cy = centroids[i][1]
                if cy < raw_alpha.shape[0] * 0.22:
                    continue
                # Apply the original raw_alpha where the dilated mask was kept
                mask = (labels == i)
                seed_pixels = np.count_nonzero(color_seed & mask)
                if seed_pixels < max(10, int(stats[i, cv2.CC_STAT_AREA] * 0.03)):
                    continue
                clean_alpha[mask] = raw_alpha[mask]
    else:
        clean_alpha = raw_alpha
        
    arr[:,:,3] = clean_alpha
    out = Image.fromarray(arr, "RGBA")
    
    # Edge Matting
    alpha = out.split()[3]
    alpha = alpha.filter(ImageFilter.MaxFilter(3))
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(1))
    out.putalpha(alpha)
    return out

def _clean_extraction_halo(img: Image.Image) -> Image.Image:
    """
    Remove light matte/fringe pixels left by white mannequin backgrounds without
    deleting valid jewelry detail. The cleanup is limited to the outer alpha edge.
    """
    arr = np.array(img.convert("RGBA"), dtype=np.uint8).copy()
    alpha = arr[:, :, 3]
    if np.count_nonzero(alpha > 10) == 0:
        return img

    solid = alpha > 235
    if np.count_nonzero(solid) < 20:
        return img

    kernel = np.ones((3, 3), np.uint8)
    eroded = cv2.erode((alpha > 10).astype(np.uint8), kernel, iterations=1) > 0
    edge = (alpha > 0) & ~eroded

    rgb = arr[:, :, :3].astype(np.float32)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    sat = ((mx - mn) / (mx + 1e-6)) * 255
    bright = (r + g + b) / 3

    fringe = edge & (bright > 150) & (sat < 70)
    if np.count_nonzero(fringe) == 0:
        return img

    jewelry_pixels = rgb[solid & ((r - b > 15) | (sat > 45))]
    if jewelry_pixels.size == 0:
        jewelry_pixels = rgb[solid]
    median_color = np.median(jewelry_pixels, axis=0)

    rgb[fringe] = rgb[fringe] * 0.35 + median_color * 0.65
    alpha_f = alpha.astype(np.float32)
    alpha_f[fringe] *= 0.68

    arr[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    arr[:, :, 3] = np.clip(alpha_f, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")

def _component_point(coords: np.ndarray, side: str) -> Optional[Tuple[int, int]]:
    if coords.size == 0:
        return None
    if side == "left":
        x = int(coords[:, 1].min())
        band = coords[coords[:, 1] <= x + 8]
    else:
        x = int(coords[:, 1].max())
        band = coords[coords[:, 1] >= x - 8]
    if band.size == 0:
        return None
    y = int(np.percentile(band[:, 0], 25))
    return (x, y)

def _classify_material(pixels: np.ndarray) -> str:
    if pixels.size == 0:
        return "unknown"
    rgb = pixels.astype(np.float32)
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    sat = ((mx - mn) / (mx + 1e-6)) * 255
    bright = (r + g + b) / 3

    gold = np.mean((r - b > 25) & (r > g - 10) & (bright > 55))
    rose = np.mean((r - g > 12) & (g >= b - 10) & (bright > 55))
    neutral = np.mean((sat < 55) & (bright > 95))
    pearl = np.mean((sat < 35) & (bright > 155))

    if gold > 0.22 and neutral > 0.18:
        return "mixed"
    if gold > 0.22:
        return "gold"
    if rose > 0.20:
        return "rose_gold"
    if pearl > 0.35:
        return "pearl_or_diamond"
    if neutral > 0.30:
        return "silver_or_diamond"
    return "mixed"

def _estimate_chain_thickness(alpha_mask: np.ndarray) -> float:
    mask = (alpha_mask > 20).astype(np.uint8)
    if np.count_nonzero(mask) == 0:
        return 0.0
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
    values = dist[dist > 0]
    if values.size == 0:
        return 0.0
    return float(np.clip(np.percentile(values, 70) * 2.0, 1.0, 40.0))

def _analyze_product_profile(product: Image.Image) -> ProductProfile:
    arr = np.array(product.convert("RGBA"), dtype=np.uint8)
    alpha = arr[:, :, 3]
    coords = np.argwhere(alpha > 20)
    h, w = alpha.shape[:2]
    coverage = float(coords.shape[0]) / float(max(1, h * w))
    if coords.size == 0:
        return ProductProfile("unknown", w, h, w / max(1, h), coverage, None, None, None, "unknown", 0.0)

    y_min, x_min = coords.min(axis=0)
    y_max, x_max = coords.max(axis=0)
    width = int(x_max - x_min + 1)
    height = int(y_max - y_min + 1)
    aspect = float(width) / float(max(1, height))

    upper_limit = y_min + int(height * 0.72)
    upper_coords = coords[coords[:, 0] <= upper_limit]
    local_upper = upper_coords - np.array([y_min, x_min]) if upper_coords.size else np.empty((0, 2), dtype=int)
    left_endpoint = _component_point(local_upper, "left")
    right_endpoint = _component_point(local_upper, "right")

    lower_start = y_min + int(height * 0.62)
    lower_coords = coords[coords[:, 0] >= lower_start]
    pendant_center = None
    if lower_coords.shape[0] > max(12, coords.shape[0] * 0.08):
        local_lower = lower_coords - np.array([y_min, x_min])
        pendant_center = (int(np.median(local_lower[:, 1])), int(np.median(local_lower[:, 0])))

    if aspect > 3.0 and height < 180:
        jewelry_type = "choker_necklace"
    elif aspect > 1.25:
        jewelry_type = "pendant_necklace" if pendant_center and pendant_center[1] > height * 0.70 else "necklace"
    elif height > width * 1.10:
        jewelry_type = "pendant_or_drop"
    else:
        jewelry_type = "compact_jewelry"

    pixels = arr[:, :, :3][alpha > 20]
    return ProductProfile(
        jewelry_type=jewelry_type,
        width=width,
        height=height,
        aspect_ratio=aspect,
        coverage_ratio=coverage,
        pendant_center=pendant_center,
        left_endpoint=left_endpoint,
        right_endpoint=right_endpoint,
        dominant_material=_classify_material(pixels),
        chain_thickness_estimate=_estimate_chain_thickness(alpha),
    )

# ── Phase C: Template Metadata & Masking ───────────────────────────────────────
TEMPLATE_META = {
    "model_front.png": {
        "anchor_x": 512, "anchor_y": 615, "jawline_y": 440, "target_width": 430, "pendant_y": 720
    },
    "model_side.png": {
        "anchor_x": 505, "anchor_y": 610, "jawline_y": 430, "target_width": 390, "pendant_y": 705
    },
    "model_closeup.png": {
        "anchor_x": 512, "anchor_y": 430, "jawline_y": 150, "target_width": 650, "pendant_y": 590
    },
    "model_editorial.png": {
        "anchor_x": 512, "anchor_y": 615, "jawline_y": 440, "target_width": 430, "pendant_y": 720
    },
    "model_warm.png": {
        "anchor_x": 512, "anchor_y": 615, "jawline_y": 440, "target_width": 430, "pendant_y": 720
    }
}

def _build_occlusion_mask(canvas_w: int, canvas_h: int, meta: dict) -> np.ndarray:
    # Occlusion should only remove anatomically impossible pixels above the jaw.
    # Broad chest/shoulder masks were erasing valid necklace edges inconsistently.
    mask = np.ones((canvas_h + 2000, canvas_w + 1000), dtype=np.float32) * 255.0
    jaw_y = meta["jawline_y"]
    fade_band = 24
    hard_cut = max(0, jaw_y - fade_band)
    mask[:hard_cut, :] = 0.0

    if jaw_y > hard_cut:
        for y in range(hard_cut, jaw_y):
            t = (y - hard_cut) / float(max(1, jaw_y - hard_cut))
            mask[y, :] = 255.0 * t
    
    return mask.astype(np.uint8)

# ── Phase D: Visual Realism (Color, Contrast, Blur, Shadows) ───────────────────
def _match_lighting(product: Image.Image, background: Image.Image) -> Image.Image:
    """
    Match color temperature and contrast to seamlessly blend the product.
    """
    bg_arr = np.array(background.convert("RGB")).astype(float)
    h, w = bg_arr.shape[:2]
    sample = bg_arr[int(h*0.05):int(h*0.35), int(w*0.05):int(w*0.95)]
    
    mean_r, mean_g, mean_b = sample[:,:,0].mean(), sample[:,:,1].mean(), sample[:,:,2].mean()
    bg_luminance = (mean_r + mean_g + mean_b) / 3.0
    
    # Temperature matching
    bias_r = np.clip((mean_r - 128) * 0.15, -15, 20)
    bias_g = np.clip((mean_g - 128) * 0.08, -8,  10)
    bias_b = np.clip((mean_b - 128) * 0.15, -15, 20)

    prod_arr = np.array(product, dtype=np.float32)
    prod_arr[:,:,0] = np.clip(prod_arr[:,:,0] + bias_r, 0, 255)
    prod_arr[:,:,1] = np.clip(prod_arr[:,:,1] + bias_g, 0, 255)
    prod_arr[:,:,2] = np.clip(prod_arr[:,:,2] + bias_b, 0, 255)
    
    out = Image.fromarray(prod_arr.astype(np.uint8), product.mode)
    
    # Contrast Matching
    if bg_luminance > 160: # High key
        enhancer = ImageEnhance.Contrast(out)
        out = enhancer.enhance(1.05)
    elif bg_luminance < 80: # Low key
        enhancer = ImageEnhance.Contrast(out)
        out = enhancer.enhance(1.15)
        
    return out

def _add_drop_shadow(img: Image.Image, offset=(3,6), blur=6, opacity=110) -> Image.Image:
    """Contact drop shadow."""
    shadow = Image.new("RGBA", img.size, (0,0,0,0))
    s_alpha = img.split()[3].point(lambda p: opacity if p > 10 else 0)
    shadow.putalpha(s_alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new("RGBA", img.size, (0,0,0,0))
    out.paste(shadow, offset, shadow)
    out.paste(img, (0,0), img)
    return out

def _add_ambient_shadow(canvas: Image.Image, x: int, y: int, pw: int, ph: int) -> Image.Image:
    """Diffuse multi-layered ambient occlusion shadow."""
    shadow_layer = Image.new("RGBA", canvas.size, (0,0,0,0))
    ex, ey = x + pw//2, y + ph - int(ph*0.08)
    ew, eh = int(pw * 0.85), int(ph * 0.25)
    
    import PIL.ImageDraw as ImageDraw
    for radius, alpha in [(ew//2, 65), (ew//3, 45), (ew//4, 25)]:
        layer = Image.new("L", canvas.size, 0)
        draw = ImageDraw.Draw(layer)
        draw.ellipse([ex-radius, ey-eh//2, ex+radius, ey+eh//2], fill=alpha)
        layer = layer.filter(ImageFilter.GaussianBlur(radius//2 + 5))
        
        shadow_arr = np.array(shadow_layer)
        layer_arr  = np.array(layer)
        shadow_arr[:,:,3] = np.clip(shadow_arr[:,:,3].astype(int) + layer_arr, 0, 255).astype(np.uint8)
        shadow_layer = Image.fromarray(shadow_arr, "RGBA")

    out = canvas.copy()
    out.paste(Image.new("RGB", canvas.size, (0,0,0)), (0,0), shadow_layer)
    return out

def _add_surface_contact_shadow(canvas: Image.Image, x: int, y: int, pw: int, ph: int) -> Image.Image:
    """Small grounding shadow for product shots sitting near a surface."""
    shadow_layer = Image.new("RGBA", canvas.size, (0,0,0,0))
    import PIL.ImageDraw as ImageDraw
    draw = ImageDraw.Draw(shadow_layer)
    cx = x + pw // 2
    cy = y + ph - int(ph * 0.06)
    ew = int(pw * 0.62)
    eh = max(12, int(ph * 0.08))
    draw.ellipse([cx - ew // 2, cy - eh // 2, cx + ew // 2, cy + eh // 2], fill=(0, 0, 0, 72))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(max(8, ew // 18)))
    out = canvas.copy()
    out.paste(Image.new("RGB", canvas.size, (0, 0, 0)), (0, 0), shadow_layer)
    return out

def _add_model_contact_shadow(canvas: Image.Image, product: Image.Image, x: int, y: int) -> Image.Image:
    """Subtle alpha-shaped contact shadow behind jewelry on skin/clothing."""
    pw, ph = product.size
    if pw <= 0 or ph <= 0:
        return canvas

    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    alpha = product.split()[3]
    alpha = alpha.point(lambda p: 42 if p > 35 else 0)
    alpha = alpha.filter(ImageFilter.GaussianBlur(3))

    local = Image.new("RGBA", product.size, (0, 0, 0, 0))
    local.putalpha(alpha)
    shadow_layer.paste(local, (x + 1, y + 2), local)

    out = canvas.copy()
    out.paste(Image.new("RGB", canvas.size, (0, 0, 0)), (0, 0), shadow_layer)
    return out

# ── Curvature Correction ───────────────────────────────────────────────────────
def _apply_perspective_warp(img: Image.Image, image_type: str) -> Image.Image:
    """
    Applies a conservative trapezoidal perspective warp to visually lay the necklace flat.
    Strictly limited to 5-10% to preserve exact product proportions and gemstone geometry.
    """
    arr = np.array(img)
    h, w = arr.shape[:2]
    
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    
    if "Side" in image_type:
        # Conservative side warp: max 10% deformation on left side only
        dst = np.float32([
            [w * 0.1, h * 0.05],
            [w, 0],
            [w, h],
            [w * 0.1, h * 0.95]
        ])
    else:
        # Conservative front warp: max 5% deformation
        intensity = 0.05
        dst = np.float32([
            [w * intensity, 0],
            [w * (1 - intensity), 0],
            [w, h],
            [0, h]
        ])
        
    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(arr, M, (w, h), borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))
    return Image.fromarray(warped, "RGBA")

def _advanced_blend(product: Image.Image, bg_img: Image.Image, x: int, y: int) -> Image.Image:
    """
    Applies skin reflection tinting, directional edge lighting, and edge feathering.
    This creates the "melting" and realistic subsurface scattering look.
    """
    pw, ph = product.size
    bh, bw = bg_img.size
    
    sx1, sy1 = max(0, x), max(0, y)
    sx2, sy2 = min(bw, x + pw), min(bh, y + ph)
    if sx2 <= sx1 or sy2 <= sy1:
        return product
        
    bg_patch = bg_img.crop((sx1, sy1, sx2, sy2)).convert("RGB")
    if bg_patch.size != (pw, ph):
        bg_patch = bg_patch.resize((pw, ph), Image.Resampling.LANCZOS)
        
    prod_arr = np.array(product)
    bg_arr = np.array(bg_patch)
    alpha = prod_arr[:, :, 3]
    
    # A. Directional Relighting (Bump Map via Sobel)
    grad_x = cv2.Sobel(alpha, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(alpha, cv2.CV_64F, 0, 1, ksize=3)
    
    # Simulate light from Top-Right
    light_dir = np.array([1.0, -1.0])
    light_dir = light_dir / np.linalg.norm(light_dir)
    illumination = -(grad_x * light_dir[0] + grad_y * light_dir[1])
    illumination = np.clip(illumination, -150, 150)
    
    # B. Skin Tinting (10% Reflection) & Relighting
    skin_tint = 0.14
    for c in range(3):
        base = prod_arr[:, :, c].astype(np.float32)
        bg_c = bg_arr[:, :, c].astype(np.float32)
        # Multiply blend with skin tone
        blended = base * (1 - skin_tint) + bg_c * skin_tint
        # Add highlights/shadows to edges
        blended = blended + (illumination * 0.25)
        prod_arr[:, :, c] = np.clip(blended, 0, 255).astype(np.uint8)

    # C. Edge Feathering (Melting into skin)
    feathered_alpha = cv2.GaussianBlur(alpha, (5, 5), 0)
    # Keep solid center, only soften the outer transition pixels
    mask = alpha > 240
    softened = np.where(mask, alpha, feathered_alpha)
    edge = (alpha > 8) & (alpha < 190)
    softened = np.where(edge, softened * 0.92, softened)
    prod_arr[:, :, 3] = np.clip(softened, 0, 255).astype(np.uint8)
    
    return Image.fromarray(prod_arr, "RGBA")

def _preserve_model_alpha_edges(product: Image.Image, image_type: str) -> Image.Image:
    """
    Preserve the necklace silhouette while lightly smoothing alpha transitions.
    Earlier broad endpoint fading removed valid side-chain pixels and made model
    shots look fake, so this helper no longer deletes outer necklace ends.
    """
    arr = np.array(product.convert("RGBA"), dtype=np.uint8).copy()
    alpha = arr[:, :, 3]
    if alpha.size == 0:
        return product
    blurred = cv2.GaussianBlur(alpha, (3, 3), 0)
    edge = (alpha > 0) & (alpha < 220)
    arr[:, :, 3] = np.where(edge, np.maximum(alpha, blurred * 0.96), alpha).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


# ── Provider ───────────────────────────────────────────────────────────────────
def _adaptive_model_width(meta: dict, profile: ProductProfile, image_type: str) -> int:
    base = int(meta.get("target_width", 550))
    scale = 1.0

    if profile.jewelry_type == "choker_necklace":
        scale *= 0.82
    elif profile.jewelry_type == "pendant_necklace":
        scale *= 0.88
    elif profile.jewelry_type == "pendant_or_drop":
        scale *= 0.78
    elif 1.25 <= profile.aspect_ratio < 1.8:
        scale *= 0.92
    elif profile.aspect_ratio > 2.7:
        scale *= 0.88

    if profile.chain_thickness_estimate and profile.chain_thickness_estimate < 3.0:
        scale *= 1.02
    if profile.coverage_ratio > 0.18:
        scale *= 0.90

    if "Close" in image_type:
        min_w, max_w = 500, 620
    elif "Side" in image_type:
        min_w, max_w = 300, 400
    else:
        min_w, max_w = 300, 400
    return int(np.clip(base * scale, min_w, max_w))

def _compose_style_prompt(preset_prompt: str, user_prompt: str, image_type: str) -> str:
    if not preset_prompt:
        return ""
    style = " ".join((user_prompt or "").strip().split())
    if len(style) > 220:
        style = style[:220]

    t = image_type.lower()
    if "luxury" in t or "marble" in t or "gold" in t or "velvet" in t:
        scene_shell = (
            "empty luxury jewelry campaign background, clean open center for one product, "
            "single marble or velvet display surface, no jewelry, no necklace, no earrings, "
            "no display stands, no small props, no text, no watermark"
        )
    elif "creative" in t or "beach" in t or "cyber" in t:
        scene_shell = (
            "pristine editorial lifestyle product background, clean open foreground product area, "
            "soft fabric or pale stone surface, warm natural light, refined premium styling, "
            "no neon, no cyberpunk, no street scene, no beach, no props, no extra objects, "
            "no text, no watermark"
        )
    else:
        scene_shell = (
            "empty product photography scene, clean open center, no jewelry, no necklace, "
            "no earrings, no extra product, no text, no watermark"
        )

    if not style:
        return f"{scene_shell}. {preset_prompt}"
    return f"{scene_shell}. Base scene: {preset_prompt}. Style modifier: {style}"

class CompositeProvider(AIProvider):
    _session      = None
    _session_name = None

    @classmethod
    def _get_session(cls):
        if cls._session is not None:
            return cls._session
        for model_name in ("silueta", "u2net"):
            try:
                sess = new_session(model_name)
                _test = Image.new("RGB", (32, 32), (200, 200, 200))
                buf = io.BytesIO(); _test.save(buf, "PNG")
                remove(buf.getvalue(), session=sess)
                cls._session, cls._session_name = sess, model_name
                print(f"[Composite] rembg ready: {model_name}")
                return cls._session
            except Exception as e:
                pass
        return None

    def generate_image(self, prompt: str, base_image_url: str, image_type: str) -> str:
        is_model = any(k in image_type for k in ("Front", "Side", "Close", "Model", "Wearing"))

        # ── 1. Fetch source ────────────────────────────────────────────────────
        if base_image_url.startswith("file://"):
            with open(base_image_url.replace("file://", ""), "rb") as f:
                raw = f.read()
        else:
            raw = requests.get(base_image_url, timeout=30).content

        original = Image.open(io.BytesIO(raw)).convert("RGBA")
        _dbg(original.convert("RGB"), "debug_1_original.png")
        print(f"[Composite] Source: {original.size}  model_shot={is_model}")

        # ── 2. Extract product ─────────────────────────────────────────────────
        product_img = self._extract(raw, original, is_model)
        bbox = product_img.getbbox()
        if bbox:
            product_img = product_img.crop(bbox)
        product_img = _clean_extraction_halo(product_img)
        _dbg(product_img, "debug_3_cropped.png")
        profile = _analyze_product_profile(product_img)
        print(
            "[Composite] ProductProfile "
            f"type={profile.jewelry_type} material={profile.dominant_material} "
            f"size={profile.width}x{profile.height} aspect={profile.aspect_ratio:.2f} "
            f"coverage={profile.coverage_ratio:.3f} thickness={profile.chain_thickness_estimate:.1f}"
        )

        # ── 3. Load Background ─────────────────────────────────────────────────
        CANVAS = 1024
        templates_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "assets", "templates"
        )
        bg_path, preset_prompt = self._resolve_template(image_type, templates_dir)
        ai_prompt = _compose_style_prompt(preset_prompt, prompt, image_type)
        bg_img = self._load_bg(bg_path, CANVAS, ai_prompt, is_model)

        # ── 4. Scale & Adaptive Neck Sizing ────────────────────────────────────
        meta_key = os.path.basename(bg_path)
        if is_model:
            meta = TEMPLATE_META.get(meta_key, {})
            target_width = _adaptive_model_width(meta, profile, image_type)
            aspect_ratio = product_img.height / product_img.width
            max_dim = int(target_width * aspect_ratio)
            product_img = product_img.resize((target_width, max_dim), Image.Resampling.LANCZOS)
        else:
            scale_ratio = 0.75 if bg_path == "white" else 0.65
            max_dim = int(CANVAS * scale_ratio)
            product_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        
        # ── 5. Perspective Warp Correction ─────────────────────────────────────
        if is_model:
            product_img = _apply_perspective_warp(product_img, image_type)
            product_img = _preserve_model_alpha_edges(product_img, image_type)
            
        pw, ph = product_img.size
        _dbg(product_img, "debug_5_scaled_curved.png")

        # ── 6. Match Lighting & Blur ───────────────────────────────────────────
        if bg_path != "white":
            product_img = _match_lighting(product_img, bg_img)
            # Add subtle blur to mimic depth of field
            if "Close" in image_type or "cyber" in ai_prompt.lower() or "bokeh" in ai_prompt.lower():
                product_img = product_img.filter(ImageFilter.GaussianBlur(0.8))

        # ── 7. Placement & Masking (Geometric tuned) ───────────────────────────
        meta_key = os.path.basename(bg_path)
        offset_x, offset_y = self._compute_placement(meta_key, image_type, CANVAS, pw, ph, is_model, profile)
        print(f"[Composite] Placement: ({offset_x},{offset_y})")

        # ── 8. Shadows & Advanced Blending ─────────────────────────────────────
        if bg_path != "white":
            if not is_model:
                bg_img = _add_ambient_shadow(bg_img, offset_x, offset_y, pw, ph)
                if "luxury" in image_type.lower() or "marble" in image_type.lower() or "gold" in image_type.lower():
                    bg_img = _add_surface_contact_shadow(bg_img, offset_x, offset_y, pw, ph)
            else:
                bg_img = _add_model_contact_shadow(bg_img, product_img, offset_x, offset_y)
            # Contact drop shadow
            product_img = _add_drop_shadow(product_img, blur=2 if is_model else 8, opacity=34 if is_model else 145)
            
            if is_model:
                # Apply Skin Blending, Edge Feathering, and Directional Relighting
                product_img = _advanced_blend(product_img, bg_img, offset_x, offset_y)
                
                    # Apply Dynamic Chain Trimming Occlusion Mask
                if meta_key in TEMPLATE_META:
                    mask = _build_occlusion_mask(CANVAS, CANVAS, TEMPLATE_META[meta_key])
                    # Safe slicing since mask is oversized
                    mask_patch = mask[offset_y:offset_y+ph, offset_x:offset_x+pw]
                    prod_arr = np.array(product_img)
                    original_alpha = prod_arr[:,:,3].astype(np.float32)
                    
                    # Ensure mask_patch matches product dimensions exactly
                    if mask_patch.shape[:2] != (ph, pw):
                        mask_patch = cv2.resize(mask_patch, (pw, ph))
                        
                    mask_patch_f = mask_patch.astype(np.float32) / 255.0
                    new_alpha = original_alpha * mask_patch_f
                    prod_arr[:,:,3] = np.clip(new_alpha, 0, 255).astype(np.uint8)
                    product_img = Image.fromarray(prod_arr, "RGBA")
            
        pw, ph = product_img.size
        
        # ── 9. Composite ───────────────────────────────────────────────────────
        composite = bg_img.copy()
        composite.paste(product_img, (offset_x, offset_y), product_img)
        final = composite.convert("RGB")
        _dbg(final, "debug_9_final.png")

        # ── 10. Return temp file ───────────────────────────────────────────────
        out = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4()}.png")
        final.save(out, "PNG")
        print(f"[Composite] Done > {out}")
        return f"file://{out}"

    def _extract(self, raw: bytes, original: Image.Image, is_model: bool) -> Image.Image:
        plain = _remove_plain_bg(original.copy())
        jewelry = _isolate_jewelry(plain)
        
        if _coverage(jewelry) >= QUALITY_THRESHOLD:
            return jewelry
        if _coverage(plain) >= QUALITY_THRESHOLD:
            return plain

        sess = CompositeProvider._get_session()
        if sess:
            try:
                rb = Image.open(io.BytesIO(remove(raw, session=sess))).convert("RGBA")
                if _coverage(rb) >= QUALITY_THRESHOLD:
                    return rb
            except Exception as e:
                pass

        # NEVER return raw original if extraction fails, it creates white blocks.
        # Force return the jewelry layer even if coverage is tiny.
        return jewelry

    def _compute_placement(self, meta_key: str, image_type: str, canvas: int,
                            pw: int, ph: int, is_model: bool, profile: ProductProfile = None):
        if is_model:
            if meta_key in TEMPLATE_META:
                meta = TEMPLATE_META[meta_key]
                cx = meta["anchor_x"] - (pw // 2)
                y = meta["anchor_y"] - int(ph * 0.10)

                if profile:
                    if profile.jewelry_type == "choker_necklace":
                        y -= int(ph * 0.08)
                    elif profile.jewelry_type in ("pendant_necklace", "pendant_or_drop"):
                        y += int(ph * 0.02)

                    if profile.pendant_center and profile.width > 0 and profile.height > 0:
                        sx = pw / float(profile.width)
                        sy = ph / float(profile.height)
                        pendant_y = y + int(profile.pendant_center[1] * sy)
                        target_y = int(meta.get("pendant_y", meta["anchor_y"] + 105))
                        y += int(np.clip(target_y - pendant_y, -45, 45))

                cx = int(np.clip(cx, 0, max(0, canvas - pw)))
                y = int(np.clip(y, 0, max(0, canvas - ph)))
                return (cx, y)
            
            # Fallback
            y = int(canvas * 0.5) - (ph // 2)
            cx = (canvas - pw) // 2
            return (int(cx), max(0, y))
        else:
            cx = (canvas - pw) // 2
            if "beach" in meta_key.lower() or "creative" in image_type.lower():
                y = int(canvas * 0.58) - ph // 2
            elif "luxury" in image_type.lower() or "marble" in image_type.lower() or "gold" in image_type.lower():
                y = int(canvas * 0.63) - ph
            else:
                y = int(canvas * 0.45) - ph // 2
            return (int(np.clip(cx, 0, max(0, canvas - pw))), int(np.clip(y, 0, max(0, canvas - ph))))

    @staticmethod
    def _resolve_template(image_type: str, templates_dir: str):
        t = image_type.lower()
        if "white" in t: return "white", ""
            
        if "marble" in t or "gold" in t:
            prompt = random.choice(PRESETS_LUXURY)
            return os.path.join(templates_dir, "marble.png"), prompt

        if "luxury" in t or "velvet" in t:
            prompt = random.choice(PRESETS_LUXURY)
            return os.path.join(templates_dir, "velvet.png"), prompt
            
        if "cyber" in t or "beach" in t or "creative" in t:
            prompt = random.choice(PRESETS_CREATIVE)
            return os.path.join(templates_dir, "marble.png"), prompt
            
        if "editorial" in t: return os.path.join(templates_dir, "model_editorial.png"), ""
        if "warm" in t: return os.path.join(templates_dir, "model_warm.png"), ""
        if "side" in t: return os.path.join(templates_dir, "model_side.png"), ""
        if "front" in t: return os.path.join(templates_dir, "model_front.png"), ""
        if "close" in t: return os.path.join(templates_dir, "model_closeup.png"), ""
        
        return os.path.join(templates_dir, "velvet.png"), ""

    @staticmethod
    def _load_bg(bg_path: str, size: int, ai_prompt: str, is_model: bool) -> Image.Image:
        if not is_model and ai_prompt:
            print(f"[Composite] Requesting Preset Background: '{ai_prompt}'")
            import urllib.parse
            # Seed based on prompt length to keep it deterministic per prompt
            encoded_prompt = urllib.parse.quote(ai_prompt)
            url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={size}&height={size}&nologo=true&seed={len(ai_prompt)}"
            try:
                resp = requests.get(url, timeout=15)
                if resp.status_code == 200:
                    ai_bg = Image.open(io.BytesIO(resp.content)).convert("RGBA")
                    if ai_bg.size != (size, size):
                        ai_bg = ai_bg.resize((size, size), Image.Resampling.LANCZOS)
                    return ai_bg
            except Exception as e:
                print(f"[Composite] AI background error: {e}")
                
        if bg_path == "white":
            return Image.new("RGBA", (size, size), (255, 255, 255, 255))
        try:
            return Image.open(bg_path).convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
        except:
            return Image.new("RGBA", (size, size), (255, 255, 255, 255))
