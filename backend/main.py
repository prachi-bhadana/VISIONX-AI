from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import boto3

from aws_config import AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS Rekognition Client
rekognition = boto3.client(
    "rekognition",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)


# ✅ EXISTING - Analyze Image (Labels)
@app.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    image_bytes = await image.read()
    response = rekognition.detect_labels(
        Image={"Bytes": image_bytes},
        MaxLabels=10,
        MinConfidence=70
    )
    labels = [label["Name"] for label in response["Labels"]]
    return {"detected_objects": labels}


# ✅ EXISTING - Detect Objects
@app.post("/detect-objects")
async def detect_objects(image: UploadFile = File(...)):
    image_bytes = await image.read()
    response = rekognition.detect_labels(
        Image={"Bytes": image_bytes},
        MaxLabels=10
    )
    objects = [label["Name"] for label in response["Labels"]]
    return {"objects": objects}


# ✅ EXISTING - Detect Text
@app.post("/detect-text")
async def detect_text(image: UploadFile = File(...)):
    image_bytes = await image.read()
    response = rekognition.detect_text(Image={"Bytes": image_bytes})
    texts = [
        text["DetectedText"]
        for text in response["TextDetections"]
        if text["Type"] == "LINE"
    ]
    return {"detected_text": texts}


# ✅ EXISTING - Moderation
@app.post("/detect-moderation")
async def moderation_labels(image: UploadFile = File(...)):
    image_bytes = await image.read()
    response = rekognition.detect_moderation_labels(
        Image={"Bytes": image_bytes}
    )
    labels = [label["Name"] for label in response["ModerationLabels"]]
    return {"moderation_labels": labels}


# ✅ EXISTING - Celebrities
@app.post("/detect-celebs")
async def recognize_celebs(image: UploadFile = File(...)):
    image_bytes = await image.read()
    response = rekognition.recognize_celebrities(
        Image={"Bytes": image_bytes}
    )
    celebs = [celeb["Name"] for celeb in response["CelebrityFaces"]]
    return {"celebrities": celebs}


# 🆕 UPGRADED - Detect Faces with Age, Gender, Emotion, Facial Attributes
@app.post("/detect-faces")
async def detect_faces(image: UploadFile = File(...)):
    image_bytes = await image.read()

    response = rekognition.detect_faces(
        Image={"Bytes": image_bytes},
        Attributes=["ALL"]
    )

    faces = []

    for i, face in enumerate(response["FaceDetails"]):

        # 🎂 Age Detection
        age_range = face["AgeRange"]
        estimated_age = (age_range["Low"] + age_range["High"]) // 2

        # 👤 Gender Detection
        gender = face["Gender"]["Value"]
        gender_confidence = round(face["Gender"]["Confidence"], 2)

        # 😊 Emotion Detection
        emotions = [
            {
                "emotion": e["Type"],
                "confidence": round(e["Confidence"], 2)
            }
            for e in face["Emotions"]
            if e["Confidence"] > 10
        ]
        # Sort emotions by confidence
        emotions = sorted(emotions, key=lambda x: x["confidence"], reverse=True)
        dominant_emotion = emotions[0]["emotion"] if emotions else "UNKNOWN"

        # 👁️ Facial Attributes Detection
        facial_attributes = {
            "smile": {
                "value": face["Smile"]["Value"],
                "confidence": round(face["Smile"]["Confidence"], 2)
            },
            "eyeglasses": {
                "value": face["Eyeglasses"]["Value"],
                "confidence": round(face["Eyeglasses"]["Confidence"], 2)
            },
            "sunglasses": {
                "value": face["Sunglasses"]["Value"],
                "confidence": round(face["Sunglasses"]["Confidence"], 2)
            },
            "beard": {
                "value": face["Beard"]["Value"],
                "confidence": round(face["Beard"]["Confidence"], 2)
            },
            "mustache": {
                "value": face["Mustache"]["Value"],
                "confidence": round(face["Mustache"]["Confidence"], 2)
            },
            "eyes_open": {
                "value": face["EyesOpen"]["Value"],
                "confidence": round(face["EyesOpen"]["Confidence"], 2)
            },
            "mouth_open": {
                "value": face["MouthOpen"]["Value"],
                "confidence": round(face["MouthOpen"]["Confidence"], 2)
            },
        }

        faces.append({
            "face_index": i + 1,
            "confidence": round(face["Confidence"], 2),

            # 🎂 Age
            "age": {
                "range": f"{age_range['Low']}–{age_range['High']} years",
                "estimated": estimated_age
            },

            # 👤 Gender
            "gender": {
                "value": gender,
                "confidence": gender_confidence
            },

            # 😊 Emotions
            "dominant_emotion": dominant_emotion,
            "all_emotions": emotions,

            # 👁️ Facial Attributes
            "facial_attributes": facial_attributes
        })

    return {
        "faces_detected": len(faces),
        "faces": faces
    }


# 🆕 NEW - Face Comparison
@app.post("/compare-faces")
async def compare_faces(
    source_image: UploadFile = File(...),
    target_image: UploadFile = File(...)
):
    source_bytes = await source_image.read()
    target_bytes = await target_image.read()

    response = rekognition.compare_faces(
        SourceImage={"Bytes": source_bytes},
        TargetImage={"Bytes": target_bytes},
        SimilarityThreshold=70
    )

    matches = []
    for match in response["FaceMatches"]:
        matches.append({
            "similarity": round(match["Similarity"], 2),
            "match": match["Similarity"] >= 90,  # Strong match if 90%+
            "confidence": round(match["Face"]["Confidence"], 2),
            "bounding_box": match["Face"]["BoundingBox"]
        })

    unmatched = len(response.get("UnmatchedFaces", []))

    return {
        "faces_matched": len(matches),
        "unmatched_faces": unmatched,
        "is_same_person": len(matches) > 0 and matches[0]["similarity"] >= 90,
        "matches": matches
    }


# 🆕 NEW - Age Verification Gate
@app.post("/verify-age")
async def verify_age(
    image: UploadFile = File(...),
    minimum_age: int = 18
):
    image_bytes = await image.read()

    response = rekognition.detect_faces(
        Image={"Bytes": image_bytes},
        Attributes=["ALL"]
    )

    if not response["FaceDetails"]:
        return {"error": "No face detected in image"}

    face = response["FaceDetails"][0]
    age_low = face["AgeRange"]["Low"]
    age_high = face["AgeRange"]["High"]
    estimated_age = (age_low + age_high) // 2

    return {
        "age_range": f"{age_low}–{age_high} years",
        "estimated_age": estimated_age,
        "minimum_age_required": minimum_age,
        "age_verified": age_low >= minimum_age,  # Conservative check
        "confidence": round(face["Confidence"], 2)
    }
