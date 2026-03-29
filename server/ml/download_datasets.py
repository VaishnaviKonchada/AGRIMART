import os
from pathlib import Path


DATASETS = [
    ("emmarex/plantdisease", "plantdisease"),
    ("vbookshelf/rice-leaf-diseases", "rice-leaf-diseases"),
    ("vipoooool/new-plant-diseases-dataset", "new-plant-diseases"),
]


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


def download_kaggle(dataset_slug: str, out_dir: Path, api):
    print(f"[INFO] Downloading {dataset_slug} -> {out_dir}")
    ensure_dir(out_dir)
    api.dataset_download_files(dataset_slug, path=str(out_dir), unzip=True, quiet=False)


def main():
    root = Path(__file__).resolve().parent
    datasets_root = root / "datasets"
    ensure_dir(datasets_root)

    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    has_creds = bool(
        (os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY"))
        or kaggle_json.exists()
    )

    if not has_creds:
        print("[WARN] Kaggle credentials missing. Set KAGGLE_USERNAME and KAGGLE_KEY in environment.")
        print("[WARN] Or place kaggle.json at ~/.kaggle/kaggle.json")
        print("[WARN] Skipping Kaggle downloads.")
    else:
        from kaggle.api.kaggle_api_extended import KaggleApi

        api = KaggleApi()
        api.authenticate()
        for slug, folder in DATASETS:
            download_kaggle(slug, datasets_root / folder, api)

    print("[DONE] Kaggle dataset preparation command completed")


if __name__ == "__main__":
    main()
