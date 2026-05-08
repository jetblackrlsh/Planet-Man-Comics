from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
import math


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Planet-Man Volume Two"
PAGE_SIZE = (1024, 1536)

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_IMPACT = "/System/Library/Fonts/Supplemental/Impact.ttf"

GOLD = (231, 205, 152)
GOLD_DARK = (154, 112, 51)
INK = (8, 10, 11)
WHITE = (245, 239, 225)


ISSUES = [
    ("8", "Planet-Man: Machine Monarch", ROOT / "issue-08-machine-monarch"),
    ("9", "Planet-Man: Hoppette", ROOT / "issue-09-hoppette"),
    ("10", "Planet-Man: Blizzard", ROOT / "issue-10-blizzard-redesignation"),
    ("11", "Planet-Man: Lily Pad Lesson", ROOT / "issue-11-lily-pad-lesson"),
    ("12", "Planet-Man: Hop Incoming", ROOT / "issue-12-hop-incoming"),
    ("13", "Planet-Man: Shock Step", ROOT / "issue-13-shock-step"),
    ("14", "Planet-Man: Bruiser", ROOT / "issue-14-bruiser"),
]


VOLUME_TWO_CHARACTERS = [
    ("Machine Monarch", ROOT / "Reference Images/32-machine-monarch-character-reference.png"),
    ("Robot Guards", ROOT / "Reference Images/34-miniature-prison-robot-guards-reference.png"),
    ("Hoppette", ROOT / "Reference Images/28-hoppette-character-reference.png"),
    ("Blizzard", ROOT / "Reference Images/29-blizzard-character-reference.png"),
    ("Char Cole", ROOT / "Reference Images/30-char-cole-character-reference.png"),
    ("Doctor Metal Fist", ROOT / "Reference Images/31-doctor-metal-fist-character-reference.png"),
    ("Golem Guardians", ROOT / "Reference Images/35-generic-golem-guardian-character-reference.png"),
    ("Bruiser", ROOT / "Reference Images/37-bruiser-character-reference.png"),
    ("Shock Step", ROOT / "Reference Images/38-shock-step-character-reference.png"),
    ("Stray Dog", ROOT / "issue-12-hop-incoming/assets/comic-pages/page-02.png"),
]


def font(path, size):
    return ImageFont.truetype(path, size)


def text_size(draw, text, fnt):
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def fit_font(draw, text, path, max_width, start_size, min_size=16):
    for size in range(start_size, min_size - 1, -2):
        fnt = font(path, size)
        if text_size(draw, text, fnt)[0] <= max_width:
            return fnt
    return font(path, min_size)


def cover_fit(img, size):
    return ImageOps.fit(img.convert("RGB"), size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.35))


def contain_on_blur(img, size=PAGE_SIZE):
    img = img.convert("RGB")
    bg = ImageOps.fit(img, size, method=Image.Resampling.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(28))
    bg = Image.blend(bg, Image.new("RGB", size, INK), 0.35)
    fg = ImageOps.contain(img, size, method=Image.Resampling.LANCZOS)
    x = (size[0] - fg.width) // 2
    y = (size[1] - fg.height) // 2
    bg.paste(fg, (x, y))
    return bg


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def draw_panel(draw, rect, radius=18, fill=(5, 7, 8, 232), outline=GOLD_DARK, width=3):
    draw.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=width)


def paste_character_tile(canvas, rect, name, path):
    x1, y1, x2, y2 = rect
    w, h = x2 - x1, y2 - y1
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw_panel(draw, rect)

    img = Image.open(path).convert("RGB")
    if name == "Stray Dog":
        crop = img.crop((0, int(img.height * 0.15), int(img.width * 0.62), int(img.height * 0.92)))
    else:
        crop = img
    fitted = cover_fit(crop, (w - 12, h - 50))
    mask = rounded_mask(fitted.size, 14)
    canvas.paste(fitted, (x1 + 6, y1 + 6), mask)

    label_h = 44
    draw.rounded_rectangle((x1 + 6, y2 - label_h - 6, x2 - 6, y2 - 6), radius=12, fill=(0, 0, 0, 190))
    label_font = fit_font(draw, name.upper(), FONT_BOLD, w - 22, 24, 15)
    tw, th = text_size(draw, name.upper(), label_font)
    draw.text((x1 + (w - tw) / 2, y2 - label_h + (label_h - th) / 2 - 5), name.upper(), font=label_font, fill=GOLD)


def add_texture(img, alpha=28):
    noise = Image.effect_noise(img.size, 42).convert("L")
    texture = Image.new("RGBA", img.size, (240, 220, 170, 0))
    texture.putalpha(noise.point(lambda p: int((p / 255) * alpha)))
    return Image.alpha_composite(img.convert("RGBA"), texture)


def build_cover():
    generated_cover = OUT / "planet-man-volume-two-cover-generated.png"
    if generated_cover.exists():
        cover = Image.open(generated_cover).convert("RGB")
        out = OUT / "planet-man-volume-two-cover.png"
        contain_on_blur(cover, PAGE_SIZE).save(out, quality=95)
        return out

    bg_src = Image.open(ROOT / "Reference Images/36-generic-golem-guardian-lineup-reference.png").convert("RGB")
    cover = ImageOps.fit(bg_src, PAGE_SIZE, method=Image.Resampling.LANCZOS)
    cover = cover.filter(ImageFilter.GaussianBlur(12))
    cover = Image.blend(cover, Image.new("RGB", PAGE_SIZE, (4, 8, 12)), 0.58).convert("RGBA")
    cover = add_texture(cover, alpha=18)

    draw = ImageDraw.Draw(cover, "RGBA")
    title_font = fit_font(draw, "PLANET-MAN", FONT_IMPACT, 940, 188, 120)
    subtitle_font = font(FONT_BOLD, 58)
    issues_font = font(FONT_BOLD, 37)
    author_font = fit_font(draw, "Nicholas Alexander Benson", FONT_BOLD, 760, 42, 30)

    for text, y, fnt, fill in [
        ("PLANET-MAN", 32, title_font, GOLD),
        ("VOLUME 2", 202, subtitle_font, WHITE),
        ("Issues 8-14", 275, issues_font, GOLD),
    ]:
        tw, th = text_size(draw, text, fnt)
        draw.text(((PAGE_SIZE[0] - tw) / 2 + 4, y + 5), text, font=fnt, fill=(0, 0, 0, 170))
        draw.text(((PAGE_SIZE[0] - tw) / 2, y), text, font=fnt, fill=fill)

    columns = 5
    rows = 2
    margin_x = 46
    top = 362
    gap = 16
    tile_w = (PAGE_SIZE[0] - 2 * margin_x - (columns - 1) * gap) // columns
    tile_h = 440

    for idx, (name, path) in enumerate(VOLUME_TWO_CHARACTERS):
        row = idx // columns
        col = idx % columns
        x = margin_x + col * (tile_w + gap)
        y = top + row * (tile_h + gap)
        paste_character_tile(cover, (x, y, x + tile_w, y + tile_h), name, path)

    banner = (116, 1396, 908, 1460)
    draw.rounded_rectangle(banner, radius=8, fill=(8, 9, 10, 230), outline=GOLD_DARK, width=3)
    tw, th = text_size(draw, "Nicholas Alexander Benson", author_font)
    draw.text(((PAGE_SIZE[0] - tw) / 2, banner[1] + (banner[3] - banner[1] - th) / 2 - 4),
              "Nicholas Alexander Benson", font=author_font, fill=GOLD)

    border = (24, 22, PAGE_SIZE[0] - 24, PAGE_SIZE[1] - 22)
    draw.rectangle(border, outline=GOLD_DARK, width=3)
    out = OUT / "planet-man-volume-two-cover.png"
    cover.convert("RGB").save(out, quality=95)
    return out


def build_toc():
    bg_src = Image.open(ROOT / "Reference Images/33-miniature-prison-interior-reference.png").convert("RGB")
    toc = ImageOps.fit(bg_src, PAGE_SIZE, method=Image.Resampling.LANCZOS)
    toc = toc.filter(ImageFilter.GaussianBlur(5))
    toc = Image.blend(toc, Image.new("RGB", PAGE_SIZE, (3, 5, 6)), 0.45).convert("RGBA")
    toc = add_texture(toc, alpha=14)
    draw = ImageDraw.Draw(toc, "RGBA")

    header = (72, 46, 952, 304)
    draw.rounded_rectangle(header, radius=4, fill=(4, 6, 7, 238), outline=GOLD_DARK, width=4)
    h1 = fit_font(draw, "TABLE OF CONTENTS", FONT_BOLD, 840, 86, 64)
    h2 = fit_font(draw, "Planet-Man Volume Two", FONT_BOLD, 760, 47, 36)
    for text, y, fnt, fill in [
        ("TABLE OF CONTENTS", 88, h1, GOLD),
        ("Planet-Man Volume Two", 226, h2, WHITE),
    ]:
        tw, th = text_size(draw, text, fnt)
        draw.text(((PAGE_SIZE[0] - tw) / 2, y), text, font=fnt, fill=fill)

    row_top = 330
    row_h = 145
    gap = 11
    num_font = font(FONT_BOLD, 54)
    title_font = font(FONT_BOLD, 32)
    small_title_font = font(FONT_BOLD, 28)
    for i, (num, title, issue_dir) in enumerate(ISSUES):
        y = row_top + i * (row_h + gap)
        rect = (78, y, 946, y + row_h)
        draw.rounded_rectangle(rect, radius=8, fill=(3, 5, 6, 232), outline=GOLD_DARK, width=3)

        thumb_path = issue_dir / "assets/comic-pages/page-01-cover.png"
        thumb = Image.open(thumb_path).convert("RGB")
        thumb = ImageOps.fit(thumb, (190, row_h - 18), method=Image.Resampling.LANCZOS)
        mask = rounded_mask(thumb.size, 8)
        toc.paste(thumb, (88, y + 9), mask)
        draw.rounded_rectangle((88, y + 9, 278, y + row_h - 9), radius=8, outline=GOLD_DARK, width=2)

        cx, cy = 326, y + row_h // 2
        draw.ellipse((cx - 36, cy - 36, cx + 36, cy + 36), fill=GOLD)
        tw, th = text_size(draw, num, num_font)
        draw.text((cx - tw / 2, cy - th / 2 - 4), num, font=num_font, fill=INK)

        fnt = title_font if text_size(draw, f"Issue {num} - {title}", title_font)[0] < 560 else small_title_font
        text = f"Issue {num} - {title}"
        tw, th = text_size(draw, text, fnt)
        draw.text((382, cy - th / 2 - 4), text, font=fnt, fill=WHITE)

    footer = (184, 1410, 840, 1480)
    draw.rounded_rectangle(footer, radius=6, fill=(4, 6, 7, 235), outline=GOLD_DARK, width=3)
    footer_font = fit_font(draw, "Collected edition: Issues 8-14", FONT_BOLD, 560, 34, 24)
    tw, th = text_size(draw, "Collected edition: Issues 8-14", footer_font)
    draw.text(((PAGE_SIZE[0] - tw) / 2, footer[1] + (footer[3] - footer[1] - th) / 2 - 4),
              "Collected edition: Issues 8-14", font=footer_font, fill=GOLD)

    out = OUT / "planet-man-volume-two-table-of-contents.png"
    toc.convert("RGB").save(out, quality=95)
    return out


def collect_volume_pages(cover_path, toc_path):
    page_paths = [cover_path, toc_path]
    for _, _, issue_dir in ISSUES:
        page_paths.extend(sorted((issue_dir / "assets/comic-pages").glob("page-*.png")))
    pages = []
    for path in page_paths:
        pages.append(contain_on_blur(Image.open(path), PAGE_SIZE))
    return pages, page_paths


def write_pdf(pages):
    out = OUT / "planet-man-volume-two.pdf"
    first, rest = pages[0], pages[1:]
    first.save(out, "PDF", save_all=True, append_images=rest, resolution=100.0, quality=92)
    return out


def write_previews(pages):
    preview_dir = OUT / "tmp/previews"
    preview_dir.mkdir(parents=True, exist_ok=True)
    for idx in [0, 1, 2, 29, len(pages) - 1]:
        pages[idx].save(preview_dir / f"preview-page-{idx + 1:02d}.png")

    thumbs = []
    for idx in range(min(12, len(pages))):
        thumb = pages[idx].resize((170, 255), Image.Resampling.LANCZOS)
        thumbs.append((idx + 1, thumb))
    sheet_w = 4 * 170 + 5 * 18
    sheet_h = 3 * 255 + 4 * 34
    sheet = Image.new("RGB", (sheet_w, sheet_h), (10, 11, 12))
    d = ImageDraw.Draw(sheet)
    fnt = font(FONT_BOLD, 18)
    for idx, thumb in thumbs:
        col = (idx - 1) % 4
        row = (idx - 1) // 4
        x = 18 + col * (170 + 18)
        y = 24 + row * (255 + 34)
        sheet.paste(thumb, (x, y))
        d.text((x, y + 258), f"Page {idx}", font=fnt, fill=GOLD)
    sheet.save(preview_dir / "contact-sheet-first-12-pages.png")


def write_manifest(page_paths, pdf_path):
    lines = [
        "# Planet-Man Volume Two Build Manifest",
        "",
        f"PDF: {pdf_path.name}",
        f"Page count: {len(page_paths)}",
        "Collected issues: 8-14",
        "",
        "## New Volume 2 Characters Featured On Cover",
    ]
    lines.extend(f"- {name}" for name, _ in VOLUME_TWO_CHARACTERS)
    lines.extend(["", "## Page Sources"])
    lines.extend(f"{idx:02d}. {path.relative_to(ROOT)}" for idx, path in enumerate(page_paths, start=1))
    (OUT / "planet-man-volume-two-manifest.md").write_text("\n".join(lines) + "\n")


def main():
    OUT.mkdir(exist_ok=True)
    cover_path = build_cover()
    toc_path = build_toc()
    pages, page_paths = collect_volume_pages(cover_path, toc_path)
    pdf_path = write_pdf(pages)
    write_previews(pages)
    write_manifest(page_paths, pdf_path)
    print(pdf_path)
    print(f"{len(page_paths)} pages")


if __name__ == "__main__":
    main()
