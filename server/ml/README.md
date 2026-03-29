# Disease Model Training Guide

This module trains an image model for crop, vegetable, and fruit disease prediction and serves recommendations for prevention/treatment.

## 1) Datasets
Use these Kaggle sources:
- https://www.kaggle.com/datasets/emmarex/plantdisease
- https://www.kaggle.com/datasets/vbookshelf/rice-leaf-diseases
- https://www.kaggle.com/datasets/vipoooool/new-plant-diseases-dataset

Create folders like this:
- ml/datasets/plantdisease
- ml/datasets/rice-leaf-diseases
- ml/datasets/new-plant-diseases

For Kaggle datasets, download and extract into those folders. Kaggle links can be used for training, but Kaggle authentication is required to download.

## 2) Install Python dependencies
Run from server folder:

pip install -r ml/requirements.txt

## 3) Download datasets automatically (optional)
Set Kaggle credentials in your environment first:

set KAGGLE_USERNAME=your_kaggle_username
set KAGGLE_KEY=your_kaggle_api_key

Then run:

npm run ml:download

This downloads the 3 Kaggle datasets.

## 4) Train and test
Run:

python ml/train_disease_model.py --data-roots ml/datasets/plantdisease ml/datasets/rice-leaf-diseases ml/datasets/new-plant-diseases --output-dir ml/artifacts

or use npm script:

npm run ml:train

## 5) Train/validation/test split
The script uses fixed split:
- 70 percent training
- 15 percent validation
- 15 percent testing

Exact image counts and percentages are saved in:
- ml/artifacts/metrics.json

## 6) Output artifacts
After successful run:
- ml/artifacts/model.keras
- ml/artifacts/labels.json
- ml/artifacts/metrics.json

## 7) API endpoints
- GET /api/disease/status
- POST /api/disease/predict (form-data key image)

## 8) Notes for better performance
- Keep only clear, in-focus leaf images.
- Remove duplicate images where possible.
- Ensure each disease class has at least 25 samples.
- If one class dominates, balance classes before training.
