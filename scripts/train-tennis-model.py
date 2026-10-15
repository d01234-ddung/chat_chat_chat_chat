"""Train and test a small YOLO tennis-ball detection pilot on CPU."""
from __future__ import annotations

import json
import csv
from pathlib import Path

from ultralytics import YOLO

ROOT: Path = Path(__file__).resolve().parents[1]
DATASET: Path = ROOT / 'dataset' / 'tennis-ball' / 'yolo'
DATA_YAML: Path = DATASET / 'data.yaml'
RUNS: Path = DATASET / 'runs'


def main() -> None:
    if not DATA_YAML.is_file():
        raise FileNotFoundError(f'Missing prepared YOLO dataset: {DATA_YAML}')

    model = YOLO('yolov8n.pt')
    train_results = model.train(
        data=str(DATA_YAML),
        epochs=25,
        imgsz=512,
        batch=4,
        device='cpu',
        workers=0,
        patience=8,
        project=str(RUNS),
        name='tennis-ball-pilot',
        exist_ok=True,
        seed=20261015,
        deterministic=True,
        pretrained=True,
        cache=False,
        plots=True,
        verbose=True,
    )

    best_weights = Path(train_results.save_dir) / 'weights' / 'best.pt'
    if not best_weights.is_file():
        raise FileNotFoundError(f'Training did not produce best weights: {best_weights}')

    trained_model = YOLO(str(best_weights))
    test_results = trained_model.val(
        data=str(DATA_YAML),
        split='test',
        imgsz=512,
        batch=4,
        device='cpu',
        workers=0,
        project=str(RUNS),
        name='tennis-ball-pilot-test',
        exist_ok=True,
        plots=True,
        verbose=True,
    )

    results_csv = Path(train_results.save_dir) / 'results.csv'
    with results_csv.open(encoding='utf-8', newline='') as results_file:
        epoch_rows = list(csv.DictReader(results_file))
    best_epoch = max(epoch_rows, key=lambda row: float(row['metrics/mAP50(B)'])) if epoch_rows else {}
    test_image_count = len(list((DATASET / 'images' / 'test').glob('*')))
    test_object_count = sum(
        1 for label in (DATASET / 'labels' / 'test').glob('*.txt')
        for line in label.read_text(encoding='utf-8').splitlines() if line.strip()
    )

    summary = {
        'weights': str(best_weights),
        'training_run': str(train_results.save_dir),
        'test_run': str(test_results.save_dir),
        'epochs_completed': len(epoch_rows),
        'best_validation_epoch': int(best_epoch['epoch']) if best_epoch else None,
        'best_validation_precision': float(best_epoch['metrics/precision(B)']) if best_epoch else None,
        'best_validation_recall': float(best_epoch['metrics/recall(B)']) if best_epoch else None,
        'best_validation_map50': float(best_epoch['metrics/mAP50(B)']) if best_epoch else None,
        'test_images': test_image_count,
        'test_objects': test_object_count,
        'test_precision': float(test_results.box.mp),
        'test_recall': float(test_results.box.mr),
        'test_map50': float(test_results.box.map50),
        'test_map50_95': float(test_results.box.map),
        'warning': 'Not production-ready. Only 17 positive images, 25 manually estimated boxes and 5 test images. Test precision is low, so many predicted boxes are false positives. Test mAP is unstable with only 2 labeled test objects. Manually verify labels before expanding training.',
    }
    summary_path = DATASET / 'training-summary.json'
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
