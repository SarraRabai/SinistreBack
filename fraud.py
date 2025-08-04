import json
import os
import cv2
import numpy as np
from datetime import datetime
from ultralytics import YOLO
from detectron2.engine import DefaultPredictor
from detectron2.config import get_cfg
from detectron2.utils.visualizer import Visualizer, ColorMode
from detectron2.data import MetadataCatalog, Metadata
import matplotlib.pyplot as plt
import sys
import warnings
warnings.filterwarnings("ignore", category=UserWarning)
# Folder to save results
RESULT_FOLDER = "resultat_constat"
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Map keys to labels
KEY_LABEL_MAP = {
    "frontImage": "Face avant",
    "leftImage": "Face gauche",
    "backImage": "Face arriere",
    "rightImage": "Face droite"
}

# Configs
VERTICAL_SPACING_HEIGHT = 35
SPACING_COLOR = (255, 255, 255)
SUMMARY_BACKGROUND_COLOR = (240, 240, 240)
TEXT_COLOR = (0, 0, 0)
FRAUD_THRESHOLD = 0.50

VEHICLE_CLASSES = [2, 3, 5, 7]  # COCO vehicle classes

def load_image(path):
    if not os.path.exists(path):
        print(f"Erreur : Fichier introuvable - {path}")
        return None
    img = cv2.imread(path)
    vehicle_img = detect_vehicle(img)
    if vehicle_img is None or len(vehicle_img.shape) < 2:
        print(f"⚠️ Échec détection véhicule dans {path}, image originale utilisée")
        return img
    return vehicle_img

def detect_vehicle(image):
    results = yolov_model(image, verbose=False)
    for result in results:
        for box in result.boxes:
            cls = int(box.cls)
            if cls in VEHICLE_CLASSES:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                return image[y1:y2, x1:x2]
    return image

def calculate_similarity(img1_path, img2_path):
    img1 = cv2.imread(img1_path, cv2.IMREAD_GRAYSCALE)
    img2 = cv2.imread(img2_path, cv2.IMREAD_GRAYSCALE)
    if img1 is None or img2 is None:
        return 0.0
    img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
    score = np.corrcoef(img1.flatten(), img2.flatten())[0, 1]
    return round(float(score), 4)


def iou(boxA, boxB):
        # Compute intersection
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])
        interArea = max(0, xB - xA) * max(0, yB - yA)

        # Compute union
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
        unionArea = float(boxAArea + boxBArea - interArea)

        return interArea / unionArea if unionArea > 0 else 0

def non_max_suppression(boxes, scores, iou_threshold=0.3):
        # Sort boxes by score
        indices = np.argsort(scores)[::-1]
        keep = []

        while len(indices) > 0:
            current = indices[0]
            keep.append(current)
            rest = indices[1:]

            indices = []
            for i in rest:
                if iou(boxes[current], boxes[i]) < iou_threshold:
                    indices.append(i)

        return [boxes[i] for i in keep]

def detect_damage_boxes(image, predictor, iou_threshold=0.25):
        outputs = predictor(image)
        instances = outputs["instances"].to("cpu")

        boxes = instances.pred_boxes.tensor.numpy()
        scores = instances.scores.numpy()

        # Convert boxes from (x1, y1, x2, y2) to (x, y, w, h) after NMS
        filtered_boxes = non_max_suppression(boxes, scores, iou_threshold)
        return [(int(x1), int(y1), int(x2 - x1), int(y2 - y1)) for (x1, y1, x2, y2) in filtered_boxes]


def draw_key_result(img, key_name, shock_points):
    annotated_img = img.copy()
    for pt in shock_points:
        x, y, w, h = pt
        cv2.rectangle(annotated_img, (x, y), (x + w, y + h), (255, 0, 0), 2)
    cv2.putText(annotated_img, key_name, (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
    return annotated_img

def resize_to_height(img, target_h):
    scale = target_h / img.shape[0]
    new_dim = (int(img.shape[1] * scale), target_h)
    return cv2.resize(img, new_dim)

def create_spacing(width, height):
    return np.full((height, width, 3), SPACING_COLOR, dtype=np.uint8)

def create_summary_block(width, total_sim, fraud, key_scores):
    lines = [
        f"Similarite globale : {round(total_sim * 100)}%",
        f"Fraude detectee : {'Oui' if fraud else 'Non'}",
        "",
        "Similarites par face :"
    ]
    for label, sim in key_scores:
        lines.append(f"- {label} : {round(sim * 100)}%")

    height = 150 + len(lines) * 30
    summary = np.full((height, width, 3), SUMMARY_BACKGROUND_COLOR, dtype=np.uint8)
    y = 40
    for line in lines:
        cv2.putText(summary, line, (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, TEXT_COLOR, 2)
        y += 30
    return summary

def main():
    input_data = sys.argv[1]
    
    # Décoder le JSON
    try:
        data = json.loads(input_data)
    except json.JSONDecodeError as e:
        print("Erreur de décodage JSON :", e)
        print("Contenu reçu :", input_data)
        return



    old_images = data["oldImages"]
    new_images = data["newImages"]

    all_key_results = []
    similarity_scores = []
    key_labels_and_scores = []

    for key in new_images:
        new_img_path = new_images[key]
        display_label = KEY_LABEL_MAP.get(key, key)

        candidates = []
        for old_pair in old_images:
            if key in old_pair:
                old_img_path = old_pair[key]
                sim = calculate_similarity(new_img_path, old_img_path)
                candidates.append({"old_img_path": old_img_path, "similarity": sim})

        if not candidates:
            continue

        best = max(candidates, key=lambda x: x["similarity"])
        similarity_scores.append(best["similarity"])
        key_labels_and_scores.append((display_label, best["similarity"]))

        new_img = load_image(new_img_path)
        best_old_img = load_image(best["old_img_path"])

        if new_img is None or best_old_img is None:
            continue

        shock_points_new = detect_damage_boxes(new_img, predictor)
        shock_points_old = detect_damage_boxes(best_old_img, predictor)

        new_annot = draw_key_result(new_img, f"{display_label} (nouveau)", shock_points_new)
        old_annot = draw_key_result(best_old_img, f"{display_label} (ancien)", shock_points_old)

        target_h = min(new_annot.shape[0], old_annot.shape[0])
        combined = np.hstack([
            resize_to_height(new_annot, target_h),
            resize_to_height(old_annot, target_h)
        ])
        all_key_results.append(combined)
        all_key_results.append(create_spacing(combined.shape[1], VERTICAL_SPACING_HEIGHT))

    if all_key_results:
        image_body = np.vstack(all_key_results[:-1])
        avg_sim = sum(similarity_scores) / len(similarity_scores)
        fraud = avg_sim >= FRAUD_THRESHOLD

        summary = create_summary_block(image_body.shape[1], avg_sim, fraud, key_labels_and_scores)
        final_image = np.vstack([image_body, create_spacing(image_body.shape[1], VERTICAL_SPACING_HEIGHT), summary])

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_path = os.path.join(RESULT_FOLDER, f"fraud_{timestamp}.jpg")
        cv2.imwrite(result_path, final_image)

        print(json.dumps({
            "message": "Comparaison terminée",
            "result_image": result_path,
            "total_similarity": round(avg_sim, 4),
            "fraud": fraud,
            "key_similarities": [
                {"label": label, "similarity": round(sim, 4)}
                for label, sim in key_labels_and_scores
            ]
        }))
    else:
        print("❌ Aucune comparaison valide effectuée")


# --- Initialize Models ---

def load_trained_model():
    cfg = get_cfg()
    from detectron2 import model_zoo
    cfg.merge_from_file(model_zoo.get_config_file("COCO-InstanceSegmentation/mask_rcnn_R_50_FPN_3x.yaml"))
    cfg.MODEL.WEIGHTS = "model_final.pth"
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = 0.7
    cfg.MODEL.ROI_HEADS.NUM_CLASSES = 1
    cfg.MODEL.DEVICE = "cpu"
    return DefaultPredictor(cfg)

# Load both models
predictor = load_trained_model()
yolov_model = YOLO("yolov8n.pt")



if __name__ == "__main__":
    main()