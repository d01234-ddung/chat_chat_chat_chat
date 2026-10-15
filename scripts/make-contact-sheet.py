from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json

root = Path('dataset/tennis-ball')
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
font = ImageFont.load_default()
for folder in [root / 'positive', root / 'negative' / 'stop-signs', root / 'negative' / 'apples']:
    files = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'})
    if not files:
        continue
    cols, cell_w, cell_h, thumb_h = 4, 250, 210, 170
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell_w, rows * cell_h), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, file in enumerate(files):
        with Image.open(file) as source:
            image = ImageOps.exif_transpose(source).convert('RGB')
            image.thumbnail((cell_w - 12, thumb_h - 8))
            x, y = (i % cols) * cell_w, (i // cols) * cell_h
            sheet.paste(image, (x + (cell_w - image.width) // 2, y + 4))
            draw.text((x + 6, y + thumb_h + 3), file.name[:34], fill='black', font=font)
            draw.text((x + 6, y + thumb_h + 17), f'{Image.open(file).size[0]}x{Image.open(file).size[1]}', fill='gray', font=font)
    out = Path('tmp') / f'{folder.parent.name}-{folder.name}-contact.jpg'
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=88)
    print(f'{out}: {len(files)} files')
