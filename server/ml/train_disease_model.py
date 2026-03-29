import argparse
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
GENERIC_DIRS = {"train", "training", "valid", "val", "validation", "test", "testing", "images", "image", "dataset", "data"}

LABEL_ALIASES = {
    "apple_leaf": "apple_healthy",
    "apple_rust_leaf": "apple_rust",
    "apple_scab_leaf": "apple_scab",
    "bacterial_leaf_blight": "rice_bacterial_leaf_blight",
    "bell_pepper_leaf": "pepper_bell_healthy",
    "bell_pepper_leaf_spot": "pepper_bell_bacterial_spot",
    "blueberry_leaf": "blueberry_healthy",
    "brown_spot": "rice_brown_spot",
    "cherry_leaf": "cherry_healthy",
    "corn_gray_leaf_spot": "corn_gray_leaf_spot",
    "corn_leaf_blight": "corn_northern_leaf_blight",
    "corn_rust_leaf": "corn_common_rust",
    "grape_leaf": "grape_healthy",
    "grape_leaf_black_rot": "grape_black_rot",
    "leaf_smut": "rice_leaf_smut",
    "peach_leaf": "peach_healthy",
    "pepper__bell___bacterial_spot": "pepper_bell_bacterial_spot",
    "pepper__bell___healthy": "pepper_bell_healthy",
    "potato___early_blight": "potato_early_blight",
    "potato___healthy": "potato_healthy",
    "potato___late_blight": "potato_late_blight",
    "potato_leaf_early_blight": "potato_early_blight",
    "potato_leaf_late_blight": "potato_late_blight",
    "raspberry_leaf": "raspberry_healthy",
    "soyabean_leaf": "soybean_healthy",
    "squash_powdery_mildew_leaf": "squash_powdery_mildew",
    "strawberry_leaf": "strawberry_healthy",
    "tomato__target_spot": "tomato_target_spot",
    "tomato__tomato_mosaic_virus": "tomato_mosaic_virus",
    "tomato__tomato_yellowleaf__curl_virus": "tomato_yellow_leaf_curl_virus",
    "tomato_bacterial_spot": "tomato_bacterial_spot",
    "tomato_early_blight": "tomato_early_blight",
    "tomato_early_blight_leaf": "tomato_early_blight",
    "tomato_healthy": "tomato_healthy",
    "tomato_late_blight": "tomato_late_blight",
    "tomato_leaf": "tomato_healthy",
    "tomato_leaf_bacterial_spot": "tomato_bacterial_spot",
    "tomato_leaf_late_blight": "tomato_late_blight",
    "tomato_leaf_mold": "tomato_leaf_mold",
    "tomato_leaf_mosaic_virus": "tomato_mosaic_virus",
    "tomato_leaf_yellow_virus": "tomato_yellow_leaf_curl_virus",
    "tomato_mold_leaf": "tomato_leaf_mold",
    "tomato_septoria_leaf_spot": "tomato_septoria_leaf_spot",
    "tomato_spider_mites_two_spotted_spider_mite": "tomato_spider_mites",
}


def is_image(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_EXTS


def clean_label(name: str) -> str:
    return name.strip().lower().replace(" ", "_")


def normalize_label(name: str) -> str:
    cleaned = clean_label(name)
    return LABEL_ALIASES.get(cleaned, cleaned)


def infer_label(img_path: Path, root: Path) -> str:
    rel_parts = list(img_path.relative_to(root).parts)
    if len(rel_parts) == 1:
        return "unknown"

    parent_name = clean_label(img_path.parent.name)
    if parent_name not in GENERIC_DIRS:
        return normalize_label(parent_name)

    for part in reversed(rel_parts[:-1]):
        candidate = clean_label(part)
        if candidate not in GENERIC_DIRS:
            return normalize_label(candidate)

    return normalize_label(parent_name)


def collect_samples(data_roots):
    samples = []
    for root_str in data_roots:
        root = Path(root_str).resolve()
        if not root.exists():
            print(f"[WARN] Data root not found: {root}")
            continue

        for file_path in root.rglob("*"):
            if file_path.is_file() and is_image(file_path):
                label = infer_label(file_path, root)
                samples.append((str(file_path), label))

    if not samples:
        raise RuntimeError("No images found in the given data roots")

    return samples


def stratified_split(file_paths, labels, test_size=0.15, val_size=0.15, seed=42):
    train_val_x, test_x, train_val_y, test_y = train_test_split(
        file_paths,
        labels,
        test_size=test_size,
        random_state=seed,
        stratify=labels,
    )

    val_ratio_on_train_val = val_size / (1.0 - test_size)
    train_x, val_x, train_y, val_y = train_test_split(
        train_val_x,
        train_val_y,
        test_size=val_ratio_on_train_val,
        random_state=seed,
        stratify=train_val_y,
    )

    return (train_x, train_y), (val_x, val_y), (test_x, test_y)


def decode_and_resize(path, label, image_size):
    img = tf.io.read_file(path)
    img = tf.io.decode_image(img, channels=3, expand_animations=False)
    img = tf.image.resize(img, (image_size, image_size))
    img = tf.cast(img, tf.float32) / 255.0
    return img, label


def make_dataset(file_paths, labels, class_to_index, batch_size, image_size, training=False):
    y = np.array([class_to_index[l] for l in labels], dtype=np.int32)
    ds = tf.data.Dataset.from_tensor_slices((file_paths, y))

    if training:
        ds = ds.shuffle(min(10000, len(file_paths)), reshuffle_each_iteration=True)

    ds = ds.map(lambda x, yv: decode_and_resize(x, yv, image_size), num_parallel_calls=tf.data.AUTOTUNE)

    if training:
        aug = tf.keras.Sequential([
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.08),
            tf.keras.layers.RandomZoom(0.12),
            tf.keras.layers.RandomContrast(0.12),
        ])
        ds = ds.map(lambda x, yv: (aug(x, training=True), yv), num_parallel_calls=tf.data.AUTOTUNE)

    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds


def build_model(num_classes, image_size, base_trainable=False):
    base = tf.keras.applications.EfficientNetB0(
        include_top=False,
        input_shape=(image_size, image_size, 3),
        weights="imagenet",
    )
    base.trainable = base_trainable

    inputs = tf.keras.Input(shape=(image_size, image_size, 3))
    x = tf.keras.applications.efficientnet.preprocess_input(inputs * 255.0)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    return model, base


def build_top_confusions(cm: np.ndarray, classes, top_k=25):
    confusions = []
    for true_idx in range(cm.shape[0]):
        for pred_idx in range(cm.shape[1]):
            if true_idx == pred_idx:
                continue
            count = int(cm[true_idx, pred_idx])
            if count > 0:
                confusions.append({
                    "true_label": classes[true_idx],
                    "predicted_label": classes[pred_idx],
                    "count": count,
                })

    confusions.sort(key=lambda item: item["count"], reverse=True)
    return confusions[:top_k]


def main():
    parser = argparse.ArgumentParser(description="Train crop disease classifier")
    parser.add_argument("--data-roots", nargs="+", required=True, help="One or more dataset root directories")
    parser.add_argument("--output-dir", default="ml/artifacts", help="Output directory for model and metrics")
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--fine-tune-epochs", type=int, default=4)
    parser.add_argument("--min-class-samples", type=int, default=25)
    parser.add_argument("--max-samples", type=int, default=0, help="Cap total samples for faster training/debug (0 means all)")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    tf.random.set_seed(args.seed)
    np.random.seed(args.seed)
    random.seed(args.seed)

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print("[INFO] Scanning datasets...")
    samples = collect_samples(args.data_roots)
    label_counts = Counter(lbl for _, lbl in samples)

    valid_labels = {lbl for lbl, cnt in label_counts.items() if cnt >= args.min_class_samples}
    dropped_labels = sorted([lbl for lbl, cnt in label_counts.items() if cnt < args.min_class_samples])
    filtered = [(p, l) for p, l in samples if l in valid_labels]

    if dropped_labels:
        print(f"[INFO] Dropped {len(dropped_labels)} low-sample classes (<{args.min_class_samples})")

    if args.max_samples and args.max_samples > 0 and len(filtered) > args.max_samples:
        by_label = defaultdict(list)
        for p, l in filtered:
            by_label[l].append((p, l))

        per_class = max(1, args.max_samples // len(valid_labels))
        reduced = []
        for label, items in by_label.items():
            random.shuffle(items)
            reduced.extend(items[:per_class])

        random.shuffle(reduced)
        filtered = reduced

    if len(valid_labels) < 2:
        raise RuntimeError("Need at least 2 labels with enough samples for training")

    if len(filtered) < 200:
        raise RuntimeError("Too few images after filtering. Add more data roots or lower --min-class-samples")

    file_paths = [p for p, _ in filtered]
    labels = [l for _, l in filtered]

    classes = sorted(list(set(labels)))
    class_to_index = {c: i for i, c in enumerate(classes)}

    print(f"[INFO] Total images used: {len(file_paths)}")
    print(f"[INFO] Number of classes: {len(classes)}")

    (train_x, train_y), (val_x, val_y), (test_x, test_y) = stratified_split(file_paths, labels, test_size=0.15, val_size=0.15, seed=args.seed)

    train_ds = make_dataset(train_x, train_y, class_to_index, args.batch_size, args.image_size, training=True)
    val_ds = make_dataset(val_x, val_y, class_to_index, args.batch_size, args.image_size, training=False)
    test_ds = make_dataset(test_x, test_y, class_to_index, args.batch_size, args.image_size, training=False)

    model, base_model = build_model(num_classes=len(classes), image_size=args.image_size, base_trainable=False)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=4, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.2, patience=2, min_lr=1e-6),
    ]

    print("[INFO] Stage 1 training...")
    history_1 = model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks, verbose=1)

    checkpoint_path = output_dir / "model_stage1.keras"
    model.save(checkpoint_path)

    history_2 = None
    if args.fine_tune_epochs > 0:
        print("[INFO] Stage 2 fine-tuning...")
        base_model.trainable = True
        for layer in base_model.layers[:-30]:
            layer.trainable = False

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"],
        )

        history_2 = model.fit(train_ds, validation_data=val_ds, epochs=args.fine_tune_epochs, callbacks=callbacks, verbose=1)

    print("[INFO] Evaluating on test split...")
    test_loss, test_acc = model.evaluate(test_ds, verbose=0)

    # Build detailed evaluation outputs for analysis and debugging.
    y_true = np.array([class_to_index[label] for label in test_y], dtype=np.int32)
    y_prob = model.predict(test_ds, verbose=0)
    y_pred = np.argmax(y_prob, axis=1)
    cm = confusion_matrix(y_true, y_pred, labels=np.arange(len(classes)))
    class_report = classification_report(
        y_true,
        y_pred,
        labels=np.arange(len(classes)),
        target_names=classes,
        output_dict=True,
        zero_division=0,
    )
    top_confusions = build_top_confusions(cm, classes, top_k=25)

    model_path = output_dir / "model.keras"
    labels_path = output_dir / "labels.json"
    metrics_path = output_dir / "metrics.json"
    confusion_path = output_dir / "confusion_matrix.json"
    report_path = output_dir / "classification_report.json"

    model.save(model_path)

    with open(labels_path, "w", encoding="utf-8") as f:
        json.dump(classes, f, indent=2)

    metrics = {
        "split": {
            "train_count": len(train_x),
            "val_count": len(val_x),
            "test_count": len(test_x),
            "train_percent": round(100.0 * len(train_x) / len(file_paths), 2),
            "val_percent": round(100.0 * len(val_x) / len(file_paths), 2),
            "test_percent": round(100.0 * len(test_x) / len(file_paths), 2),
        },
        "data": {
            "total_images": len(file_paths),
            "num_classes": len(classes),
            "class_distribution": dict(Counter(labels)),
            "min_class_samples": args.min_class_samples,
            "dropped_low_sample_classes": dropped_labels,
        },
        "evaluation": {
            "test_accuracy": float(test_acc),
            "test_loss": float(test_loss),
            "macro_avg_f1": float(class_report.get("macro avg", {}).get("f1-score", 0.0)),
            "weighted_avg_f1": float(class_report.get("weighted avg", {}).get("f1-score", 0.0)),
            "top_confusions": top_confusions,
        },
        "reproducibility": {
            "seed": args.seed,
            "data_roots": args.data_roots,
            "epochs": args.epochs,
            "fine_tune_epochs": args.fine_tune_epochs,
            "batch_size": args.batch_size,
            "image_size": args.image_size,
            "max_samples": args.max_samples,
            "min_class_samples": args.min_class_samples,
        },
        "history": {
            "stage1_val_accuracy_max": float(max(history_1.history.get("val_accuracy", [0]))),
            "stage2_val_accuracy_max": float(max((history_2.history.get("val_accuracy", [0]) if history_2 else [0]))),
        },
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    with open(confusion_path, "w", encoding="utf-8") as f:
        json.dump({
            "labels": classes,
            "matrix": cm.tolist(),
        }, f, indent=2)

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(class_report, f, indent=2)

    print("[DONE] Model training complete")
    print(f"[DONE] Model saved: {model_path}")
    print(f"[DONE] Labels saved: {labels_path}")
    print(f"[DONE] Metrics saved: {metrics_path}")
    print(f"[DONE] Confusion matrix saved: {confusion_path}")
    print(f"[DONE] Classification report saved: {report_path}")
    print("[DONE] Split used: 70% train, 15% val, 15% test")


if __name__ == "__main__":
    main()
