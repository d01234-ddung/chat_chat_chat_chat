"""Build a reviewed YOLO-format pilot set from the Commons candidate images.

All positive boxes in BOXES are manually estimated from the images after visual
review. Treat them as initial labels and inspect them in an annotation tool before
production training.
"""
from __future__ import annotations

import csv
import json
import random
import shutil
from collections import defaultdict
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path('dataset/tennis-ball')
OUTPUT = ROOT / 'yolo'
SEED = 20261015

# Boxes use normalized center-x, center-y, width, height in the source image.
# Multiple boxes mean multiple visible tennis balls in the same frame.
BOXES: dict[str, list[tuple[float, float, float, float]]] = {
    'A type of tennis ball.jpg': [(0.505, 0.500, 0.480, 0.480)],
    'Anyone? (598098803).jpg': [(0.523, 0.482, 0.620, 0.890)],
    'Balles.JPG': [
        (0.205, 0.565, 0.315, 0.420),
        (0.500, 0.325, 0.275, 0.365),
        (0.785, 0.325, 0.285, 0.360),
        (0.595, 0.540, 0.320, 0.430),
    ],
    'Ben Shelton.png': [(0.108, 0.668, 0.072, 0.050)],
    'Closeup of a tennis ball (2).jpg': [(0.370, 0.580, 0.500, 0.700)],
    'Cmglee tennis balls.jpg': [
        (0.503, 0.665, 0.270, 0.235),
        (0.550, 0.820, 0.270, 0.245),
        (0.740, 0.755, 0.230, 0.200),
    ],
    'Día de padel (4387262971).jpg': [(0.480, 0.380, 0.130, 0.180)],
    'Do you like tennis? (500891469).jpg': [(0.520, 0.705, 0.780, 0.590)],
    'EVD-tenis-037.jpg': [(0.292, 0.512, 0.414, 0.625)],
    'Frozen tennis ball.jpg': [(0.720, 0.735, 0.550, 0.460)],
    'Galaxy Sports - Flickr - aloshbennett.jpg': [
        (0.360, 0.505, 0.535, 0.695),
        (0.670, 0.460, 0.195, 0.355),
    ],
    'Grass court season is here! (18161963964).jpg': [(0.528, 0.490, 0.330, 0.500)],
    'Dog with tennis ball 01.jpg': [(0.720, 0.745, 0.245, 0.160)],
    'Dog with tennis ball 02.jpg': [(0.555, 0.680, 0.165, 0.205)],
    'Dachshund catching tennis ball.jpg': [(0.278, 0.318, 0.140, 0.125)],
    'Ball (4728613105).jpg': [(0.670, 0.580, 0.550, 0.440)],
    '2014 US Open (Tennis) - Qualifying Rounds (14835679230).jpg': [
        (0.295, 0.625, 0.225, 0.225),
        (0.435, 0.415, 0.165, 0.195),
        (0.505, 0.485, 0.155, 0.185),
    ],
}

# These candidate negatives were visually reviewed as fruit or stop-sign scenes.
NEGATIVE_PREFIXES = ('stop-sign_', 'apple_')


def clean_output() -> None:
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    for split in ('train', 'val', 'test'):
        (OUTPUT / 'images' / split).mkdir(parents=True, exist_ok=True)
        (OUTPUT / 'labels' / split).mkdir(parents=True, exist_ok=True)


def main() -> None:
    clean_output()
    manifest_path = ROOT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    records = manifest['records']
    chosen: list[dict] = []
    missing_boxes = []

    for record in records:
        title = record['sourceTitle']
        if title in BOXES:
            record['review'] = 'included_positive_manual_box'
            record['boxes_normalized_xywh'] = BOXES[title]
            chosen.append(record)
        elif record['filename'].startswith(NEGATIVE_PREFIXES):
            record['review'] = 'included_negative_no_ball'
            record['boxes_normalized_xywh'] = []
            chosen.append(record)
        else:
            record['review'] = 'excluded_from_pilot'
            record['boxes_normalized_xywh'] = []

    chosen_positive = [r for r in chosen if r['review'].startswith('included_positive')]
    if set(r['sourceTitle'] for r in chosen_positive) != set(BOXES):
        available = {r['sourceTitle'] for r in records}
        missing_boxes = sorted(set(BOXES) - available)
        raise ValueError(f'Missing manually labelled sources: {missing_boxes}')

    rng = random.Random(SEED)
    groups: dict[str, list[dict]] = defaultdict(list)
    for record in chosen:
        if record['review'].startswith('included_positive'):
            group = 'positive'
        elif record['directory'] == 'negative/stop-signs':
            group = 'negative_stop_sign'
        else:
            group = 'negative_apple'
        groups[group].append(record)

    # Stratified deterministic 70/15/15 split by positive/negative class and
    # negative subtype. Source photos remain disjoint across splits.
    assigned: dict[str, str] = {}
    for group, items in groups.items():
        items.sort(key=lambda item: item['sourceTitle'])
        rng.shuffle(items)
        n = len(items)
        n_train = max(1, round(n * 0.70))
        n_val = max(1, round(n * 0.15)) if n >= 7 else 0
        if n_train + n_val >= n:
            n_train = max(1, n - n_val - 1)
        for index, item in enumerate(items):
            split = 'train' if index < n_train else 'val' if index < n_train + n_val else 'test'
            assigned[item['filename']] = split
            item['dataset_split'] = split

    annotations = []
    yaml_names = {0: 'tennis_ball'}
    for record in chosen:
        split = assigned[record['filename']]
        source = ROOT / record['directory'] / record['filename']
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original)
            width, height = image.size
            image.verify()
        dest_name = Path(record['filename']).stem + '.jpg'
        dest_image = OUTPUT / 'images' / split / dest_name
        with Image.open(source) as original:
            ImageOps.exif_transpose(original).convert('RGB').save(dest_image, quality=95)

        lines = []
        for cx, cy, box_w, box_h in record['boxes_normalized_xywh']:
            cx = min(max(cx, 0.0), 1.0)
            cy = min(max(cy, 0.0), 1.0)
            box_w = min(max(box_w, 0.001), 1.0)
            box_h = min(max(box_h, 0.001), 1.0)
            lines.append(f'0 {cx:.6f} {cy:.6f} {box_w:.6f} {box_h:.6f}')
            xmin = round((cx - box_w / 2) * width)
            ymin = round((cy - box_h / 2) * height)
            xmax = round((cx + box_w / 2) * width)
            ymax = round((cy + box_h / 2) * height)
            annotations.append({
                'filename': f'{split}/{dest_name}', 'split': split, 'label': 'tennis_ball',
                'xmin': max(0, xmin), 'ymin': max(0, ymin),
                'xmax': min(width, xmax), 'ymax': min(height, ymax), 'annotated': True,
                'boxMethod': 'manual_visual_review',
            })
        label_file = OUTPUT / 'labels' / split / f'{Path(record["filename"]).stem}.txt'
        label_file.write_text('\n'.join(lines), encoding='utf-8')
        if not lines:
            annotations.append({
                'filename': f'{split}/{dest_name}', 'split': split, 'label': 'no_ball',
                'xmin': '', 'ymin': '', 'xmax': '', 'ymax': '', 'annotated': True,
                'boxMethod': 'verified_negative_image',
            })

    # Keep original candidate annotations in sync with the manually-reviewed subset.
    with (ROOT / 'annotations.csv').open('w', newline='', encoding='utf-8') as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=['filename', 'split', 'label', 'xmin', 'ymin', 'xmax', 'ymax', 'annotated', 'boxMethod'])
        writer.writeheader()
        writer.writerows(annotations)

    manifest['datasetReview'] = {
        'status': 'small_manual_pilot_not_production_ready',
        'annotationFormat': 'YOLO normalized center-x center-y width height; class 0=tennis_ball',
        'splitRatios': 'approximately 70/15/15, stratified by positive images, stop-sign negatives, and apple negatives',
        'reviewedImageCount': len(chosen),
        'positiveImageCount': len(chosen_positive),
        'negativeImageCount': len(chosen) - len(chosen_positive),
        'positiveObjectCount': sum(len(r['boxes_normalized_xywh']) for r in chosen_positive),
        'importantCaveat': 'Manual boxes were estimated from visual inspection and must be checked/adjusted in CVAT or Label Studio. The dataset is too small for reliable production training.',
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

    yaml = f'path: {OUTPUT.resolve().as_posix()}\ntrain: images/train\nval: images/val\ntest: images/test\nnames:\n  0: tennis_ball\n'
    (OUTPUT / 'data.yaml').write_text(yaml, encoding='utf-8')
    print(json.dumps(manifest['datasetReview'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
