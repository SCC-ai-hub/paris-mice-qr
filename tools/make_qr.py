"""Generate colorful QR codes with center labels for exhibition pages."""
from __future__ import annotations

import argparse
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import RadialGradiantColorMask
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer


PALETTES = [
    # pink → blue
    ((232, 154, 171), (58, 126, 200), (26, 18, 16)),
    # blue → gold
    ((58, 126, 200), (212, 160, 23), (26, 18, 16)),
    # gold → purple
    ((212, 160, 23), (107, 76, 154), (26, 18, 16)),
    # purple → pink
    ((107, 76, 154), (232, 154, 171), (26, 18, 16)),
    # navy → cream accent via gold
    ((30, 58, 95), (212, 160, 23), (26, 18, 16)),
]


def make_qr(url: str, label: str, out: Path, palette_idx: int) -> None:
    center, edge, back = PALETTES[palette_idx % len(PALETTES)]
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=14,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(radius_ratio=0.6),
        color_mask=RadialGradiantColorMask(
            back_color=back,
            center_color=center,
            edge_color=edge,
        ),
    ).convert("RGBA")

    # Soft light panel behind code (for print contrast)
    pad = 28
    canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (243, 234, 216, 255))
    canvas.paste(img, (pad, pad), img)

    # Center badge with number
    draw = ImageDraw.Draw(canvas)
    cx, cy = canvas.width // 2, canvas.height // 2
    badge_r = int(min(canvas.width, canvas.height) * 0.13)
    draw.ellipse(
        (cx - badge_r, cy - badge_r, cx + badge_r, cy + badge_r),
        fill=(243, 234, 216, 255),
        outline=(26, 18, 16, 255),
        width=4,
    )

    try:
        font = ImageFont.truetype("arialbd.ttf", size=int(badge_r * 0.95))
    except OSError:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", size=int(badge_r * 0.95))
        except OSError:
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw / 2, cy - th / 2 - 2), label, fill=(26, 18, 16, 255), font=font)

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out, "PNG")
    print(f"wrote {out}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True, help="Base Pages URL, no trailing slash")
    parser.add_argument("--out", default=str(Path(__file__).resolve().parents[1] / "qr"))
    args = parser.parse_args()
    base = args.base.rstrip("/")
    out_dir = Path(args.out)
    for i in range(1, 6):
        label = f"1.{i}"
        slug = f"1-{i}"
        url = f"{base}/t/{slug}/"
        make_qr(url, label, out_dir / f"{slug}.png", i - 1)


if __name__ == "__main__":
    main()
