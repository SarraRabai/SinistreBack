import sys
import json
import os
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
from ultralytics import YOLO
from datetime import datetime 
# Dossier de sortie
RESULT_FOLDER = "resultat_constat"
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Mapping des clés vers les noms visuels
KEY_LABEL_MAP = {
    "frontImage": "Face avant",
    "leftImage": "Face gauche",
    "backImage": "Face arriere",
    "rightImage": "Face droite"
}

# Configuration
VERTICAL_SPACING_HEIGHT = 35        # Espace entre paires d'images
SMALL_SPACING_HEIGHT = 15           # Espace entre lignes de texte
SPACING_COLOR = (255, 255, 255)     # Blanc
SUMMARY_BACKGROUND_COLOR = (240, 240, 240)  # Gris clair
TEXT_COLOR = (0, 0, 0)               # Noir
FRAUD_THRESHOLD = 0.31              # Seuil de fraude

# Classes de véhicules dans COCO dataset
VEHICLE_CLASSES = [2, 3, 5, 7]  # car, motorcycle, bus, truck

def load_image(path):
    """Charge une image et extrait uniquement le véhicule"""
    if not os.path.exists(path):
        print(f"Erreur : Fichier introuvable - {path}", file=sys.stderr)
        return None
    img = cv2.imread(path)
    vehicle_img = detect_vehicle(img)
    if vehicle_img is None or len(vehicle_img.shape) < 2:
        print(f"⚠️ Échec détection véhicule dans {path}, image originale utilisée")
        return img
    return vehicle_img

def detect_vehicle(image):
    """Détecte le véhicule dans l'image et retourne la région découpée"""
    results = model(image, verbose=False)
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls = int(box.cls)
            if cls in VEHICLE_CLASSES:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                return image[y1:y2, x1:x2]
    return image  # Si aucun véhicule trouvé

def calculate_similarity(img1_path, img2_path):
    """Calcule la similarité SSIM entre deux images après redimensionnement"""
    img1 = cv2.imread(img1_path, cv2.IMREAD_GRAYSCALE)
    img2 = cv2.imread(img2_path, cv2.IMREAD_GRAYSCALE)

    if img1 is None or img2 is None:
        print(f"❌ Erreur de chargement : {img1_path} ou {img2_path}")
        return 0.0

    target_size = (img1.shape[1], img1.shape[0])
    img2_resized = cv2.resize(img2, target_size)
    img1_resized = cv2.resize(img1, target_size)

    score, _ = ssim(img1_resized, img2_resized, full=True)
    return round(float(score), 4)

def detect_shock_points(img1, img2):
    """Détecte les différences entre deux images et encadre les zones suspectes"""
    if img1.shape != img2.shape:
        img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))

    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    diff = cv2.absdiff(gray1, gray2)
    _, thresh = cv2.threshold(diff, 50, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    shock_points = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w * h > 100:  # Ignorer les petites différences
            shock_points.append((x, y, w, h))

    return shock_points

def draw_key_result(img, key_name, shock_points):
    """Dessine les points de choc + nom de la clé sur l'image"""
    annotated_img = img.copy()
    for pt in shock_points:
        x, y, w, h = pt
        cv2.rectangle(annotated_img, (x, y), (x + w, y + h), (255, 0, 0), 2)  # Rectangle bleu
    cv2.putText(annotated_img, key_name, (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2, cv2.LINE_AA)
    return annotated_img

def draw_key_result_with_similarity(img, key_name, shock_points, similarity):
    """Dessine l'image annotée + affiche la similarité sous le nom de la clé"""
    annotated_img = draw_key_result(img, key_name, shock_points)
    
    return annotated_img

def resize_to_height(img, target_h):
    """Redimensionne une image à une hauteur donnée tout en conservant le ratio"""
    scale = target_h / img.shape[0]
    new_dim = (int(img.shape[1] * scale), target_h)
    return cv2.resize(img, new_dim)

def create_spacing(width, height, color=(255, 255, 255)):
    """Crée une image uniforme (espace vertical)"""
    return np.full((height, width, 3), color, dtype=np.uint8)

def create_summary_block(width, total_sim, fraud, key_scores):
    """
    Crée une image de résumé avec :
    - Similarité globale
    - Fraude détectée
    - Similarités par face
    """
    lines = [
        f"Similarite globale : {round(total_sim * 100)}%",
        f"Fraude detectee : {'Oui' if fraud else 'Non'}",
        "",
        "Similarites par face :"
    ]
    for label, sim in key_scores:
        lines.append(f"- {label} : {round(sim * 100)}%")

    line_height = 30
    padding = 20
    font_scale = 0.7
    thickness = 2

    height = padding + len(lines) * line_height + padding
    summary = np.full((height, width, 3), SUMMARY_BACKGROUND_COLOR, dtype=np.uint8)

    y = padding + 25
    for line in lines:
        cv2.putText(summary, line, (padding, y),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, TEXT_COLOR, thickness)
        y += line_height

    return summary

def main():
    input_data = sys.argv[1]
    data = json.loads(input_data)

    old_images = data["oldImages"]
    new_images = data["newImages"]

    all_key_results = []  # Liste de toutes les paires comparées
    similarity_scores = []
    key_labels_and_scores = []

    for key in new_images:
        new_img_path = new_images[key]

        # Récupérer le label traduit
        display_label = KEY_LABEL_MAP.get(key, key)

        candidates = []

        # Chercher tous les oldImages qui contiennent cette clé
        for old_pair in old_images:
            if key in old_pair:
                old_img_path = old_pair[key]
                sim = calculate_similarity(new_img_path, old_img_path)
                candidates.append({
                    "old_img_path": old_img_path,
                    "similarity": sim
                })

        if not candidates:
            continue

        # Sélectionner la meilleure correspondance
        best_candidate = max(candidates, key=lambda x: x["similarity"])
        best_old_img_path = best_candidate["old_img_path"]
        best_similarity = best_candidate["similarity"]
        similarity_scores.append(best_similarity)
        key_labels_and_scores.append((display_label, best_similarity))

        # Charger les images
        new_img = load_image(new_img_path)
        best_old_img = load_image(best_old_img_path)

        if new_img is None or best_old_img is None:
            continue

        # Détecter les points de choc
        shock_points_new = detect_shock_points(new_img, best_old_img)
        shock_points_best_old = detect_shock_points(best_old_img, new_img)

        # Annoter les images
        new_annotated = draw_key_result(new_img, f"{display_label} (nouveau)", shock_points_new)
        old_annotated = draw_key_result_with_similarity(
            best_old_img,
            f"{display_label} (ancien)",
            shock_points_best_old,
            best_similarity
        )

        # Redimensionner les deux images à la même hauteur
        target_height = min(new_annotated.shape[0], old_annotated.shape[0])
        new_resized = resize_to_height(new_annotated, target_height)
        old_resized = resize_to_height(old_annotated, target_height)

        # Juxtaposer horizontalement
        combined = np.hstack((new_resized, old_resized))
        all_key_results.append(combined)

        # 🔲 Ajouter un espace vertical après chaque élément
        spacing = create_spacing(combined.shape[1], VERTICAL_SPACING_HEIGHT, SPACING_COLOR)
        all_key_results.append(spacing)

    # Si aucune comparaison n’a été possible
    if not all_key_results:
        print("❌ Aucune comparaison valide effectuée", file=sys.stderr)
        sys.exit(1)

    # Retirer le dernier espace si on l’a ajouté
    if len(all_key_results) > 1 and np.array_equal(all_key_results[-1], create_spacing(*all_key_results[-2].shape[:2], SPACING_COLOR)):
        all_key_results.pop()

    # Filtrer les éléments None ou vides
    valid_rows = [row for row in all_key_results if row is not None and len(row.shape) >= 2]

    if not valid_rows:
        print("❌ Pas d’image valide à fusionner", file=sys.stderr)
        sys.exit(1)

    # Définir la largeur cible
    target_width = valid_rows[0].shape[1]

    # Redimensionner chaque ligne à la même largeur
    resized_rows = []
    for row in valid_rows:
        if row.shape[1] != target_width:
            try:
                ratio = target_width / row.shape[1]
                new_h = int(row.shape[0] * ratio)
                resized_row = cv2.resize(row, (target_width, new_h))
                resized_rows.append(resized_row)
            except Exception as e:
                print(f"❌ Échec de redimensionnement : {e}")
                continue
        else:
            resized_rows.append(row)

    if not resized_rows:
        print("❌ Aucune ligne valide après redimensionnement", file=sys.stderr)
        sys.exit(1)

    # Assembler verticalement
    try:
        image_body = np.vstack(resized_rows)
    except Exception as e:
        print(f"❌ Impossible de faire vstack : {e}")
        sys.exit(1)

    avg_similarity = sum(similarity_scores) / len(similarity_scores)
    is_fraud = avg_similarity >= FRAUD_THRESHOLD

    # Créer le bloc de résumé
    summary_block = create_summary_block(target_width, avg_similarity, is_fraud, key_labels_and_scores)

    # Ajouter un espace entre le corps et le résumé
    spacing_summary = create_spacing(target_width, VERTICAL_SPACING_HEIGHT, SPACING_COLOR)

    # Assembler le tout
    try:
        final_image = np.vstack([
            image_body,
            spacing_summary,
            summary_block
        ])
    except Exception as e:
        print(f"❌ Échec d’assemblage final : {e}")
        sys.exit(1)

    # Sauvegarder l’image finale
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_filename = f"fraud{timestamp}.jpg"
    result_path = os.path.join(RESULT_FOLDER, result_filename)
    cv2.imwrite(result_path, final_image)

    # Générer la réponse JSON
    result = {
        "message": "Comparaisons terminées",
        "result_image": result_path,
        "total_similarity": round(avg_similarity, 4),
        "fraud": is_fraud,
        "key_similarities": [
            {"label": label, "similarity": round(sim, 4)}
            for label, sim in zip([KEY_LABEL_MAP[k] for k in new_images if k in KEY_LABEL_MAP], similarity_scores)
        ]
    }

    print(json.dumps(result))

# Charger le modèle YOLOv8 pré-entraîné
model = YOLO("yolov8n.pt")  # Téléchargé automatiquement si nécessaire

if __name__ == "__main__":
    main()