import argparse
import json
from pathlib import Path

import numpy as np
import tensorflow as tf


IMAGE_SIZE = 224


def normalize_key(value: str) -> str:
    return value.lower().replace(" ", "_").replace("-", "_")


def load_image_tensor(image_path: Path, image_size: int):
    img = tf.keras.utils.load_img(image_path, target_size=(image_size, image_size))
    arr = tf.keras.utils.img_to_array(img)
    arr = arr / 255.0
    return np.expand_dims(arr, axis=0)


def build_solution(label: str, solutions: dict):
    normalized = normalize_key(label)

    if normalized in solutions:
        return solutions[normalized]

    if "healthy" in normalized and "healthy" in solutions:
        return solutions["healthy"]

    for key in solutions.keys():
        if key == "default":
            continue
        if key in normalized or normalized in key:
            return solutions[key]

    for key in ["blight", "rust", "powdery_mildew", "downy_mildew", "leaf_spot", "bacterial", "viral", "scab"]:
        if key in normalized and key in solutions:
            return solutions[key]

    return solutions.get("default", {
        "disease": "Unknown condition",
        "severity": "Needs inspection",
        "solution": ["Capture clearer image and consult extension officer."]
    })


def main():
    parser = argparse.ArgumentParser(description="Predict crop disease from leaf image")
    parser.add_argument("--model", required=True, help="Path to model.keras")
    parser.add_argument("--labels", required=True, help="Path to labels.json")
    parser.add_argument("--image", required=True, help="Path to image")
    parser.add_argument("--solutions", required=True, help="Path to disease_solutions.json")
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--image-size", type=int, default=IMAGE_SIZE)
    args = parser.parse_args()

    model_path = Path(args.model).resolve()
    labels_path = Path(args.labels).resolve()
    image_path = Path(args.image).resolve()
    solutions_path = Path(args.solutions).resolve()

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    if not labels_path.exists():
        raise FileNotFoundError(f"Labels not found: {labels_path}")
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")
    if not solutions_path.exists():
        raise FileNotFoundError(f"Solutions not found: {solutions_path}")

    model = tf.keras.models.load_model(model_path)

    with open(labels_path, "r", encoding="utf-8") as f:
        labels = json.load(f)

    with open(solutions_path, "r", encoding="utf-8") as f:
        solutions = json.load(f)

    x = load_image_tensor(image_path, args.image_size)
    probs = model.predict(x, verbose=0)[0]

    top_k = max(1, min(args.top_k, len(labels)))
    top_indices = np.argsort(probs)[-top_k:][::-1]

    predictions = []
    for idx in top_indices:
        predictions.append({
            "label": labels[int(idx)],
            "confidence": float(probs[int(idx)])
        })

    diagnosis_label = predictions[0]["label"]
    advice = build_solution(diagnosis_label, solutions)

    output = {
        "diagnosis": diagnosis_label,
        "confidence": predictions[0]["confidence"],
        "predictions": predictions,
        "advice": advice,
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
