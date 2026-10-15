"""Validate the generated YOLO pilot and make a visual box-review contact sheet."""
from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('dataset/tennis-ball')
YOLO = ROOT / 'yolo'


def main() -> None:
    manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    result = {'splits': {}, 'errors': [], 'licenses': set(), 'objects': 0}
    cells = []
    source_splits: dict[str, str] = {}
    font = ImageFont.load_default()

    for split in ('train', 'val', 'test'):
        images = sorted((YOLO / 'images' / split).glob('*.jpg'))
        result['splits'][split] = {
            'images': len(images), 'positive': 0, 'negative_stop_sign': 0,
            'negative_apple': 0, 'objects': 0,
        }
        for image_path in images:
            label_path = YOLO / 'labels' / split / f'{image_path.stem}.txt'
            if not label_path.exists():
                result['errors'].append(f'missing label file: {label_path}')
                continue
            rows = [line.split() for line in label_path.read_text(encoding='utf-8').splitlines() if line.strip()]
            valid_rows = []
            for row in rows:
                if len(row) != 5 or row[0] != '0':
                    result['errors'].append(f'invalid YOLO row: {label_path}: {row}')
                    continue
                values = [float(value) for value in row[1:]]
                cx, cy, width, height = values
                if not all(0 <= value <= 1 for value in values) or cx - width / 2 < 0 or cy - height / 2 < 0 or cx + width / 2 > 1 or cy + height / 2 > 1:
                    result['errors'].append(f'out-of-bounds box: {label_path}: {row}')
                    continue
                valid_rows.append(values)
            if valid_rows:
                kind = 'positive'
            elif image_path.stem.startswith('stop-sign_'):
                kind = 'negative_stop_sign'
            elif image_path.stem.startswith('apple_'):
                kind = 'negative_apple'
            else:
                result['errors'].append(f'negative image has unknown class: {image_path.name}')
                continue
            result['splits'][split][kind] += 1
            result['splits'][split]['objects'] += len(valid_rows)
            result['objects'] += len(valid_rows)

            with Image.open(image_path) as opened:
                image = opened.convert('RGB')
            draw = ImageDraw.Draw(image)
            for cx, cy, width, height in valid_rows:
                left = (cx - width / 2) * image.width
                top = (cy - height / 2) * image.height
                right = (cx + width / 2) * image.width
                bottom = (cy + height / 2) * image.height
                draw.rectangle((left, top, right, bottom), outline='#ff2424', width=max(2, image.width // 300))
            image.thumbnail((240, 160))
            cells.append((image.copy(), f'{split}: {image_path.name[:30]}', len(valid_rows)))

    for split in ('train', 'val', 'test'):
        for image_path in (YOLO / 'images' / split).glob('*.jpg'):
            source_stem = image_path.stem
            source = next((r for r in manifest['records'] if Path(r['filename']).stem == source_stem), None)
            if not source:
                result['errors'].append(f'no source/license metadata for {image_path.name}')
                continue
            if source.get('license'):
                result['licenses'].add(source['license'])
            source_key = source['sourceTitle'].casefold()
            if source_key in source_splits and source_splits[source_key] != split:
                result['errors'].append(f'duplicate source leaked across splits: {source["sourceTitle"]}')
            source_splits[source_key] = split

    cols, cell_w, cell_h = 4, 260, 195
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell_w, max(1, rows) * cell_h), 'white')
    draw = ImageDraw.Draw(sheet)
    for index, (image, caption, count) in enumerate(cells):
        x, y = index % cols * cell_w, index // cols * cell_h
        sheet.paste(image, (x + (cell_w - image.width) // 2, y + 2))
        draw.text((x + 5, y + 166), caption, fill='black', font=font)
        draw.text((x + 5, y + 180), f'boxes: {count}', fill='#555', font=font)
    output = Path('tmp/tennis-yolo-annotation-review.jpg')
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=90)

    result['licenses'] = sorted(result['licenses'])
    result['contactSheet'] = str(output)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result['errors']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
