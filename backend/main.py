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

# API Route
@app.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):

    # Read uploaded image
    image_bytes = await image.read()

    print("Image received")

    # Detect labels
    response = rekognition.detect_labels(
        Image={"Bytes": image_bytes},
        MaxLabels=10,
        MinConfidence=70
    )

    print("AWS RESPONSE:", response)

    labels = []

    for label in response["Labels"]:
        labels.append(label["Name"])

    return {
        "detected_objects": labels
    }

@app.post("/detect-faces")

async def detect_faces(image: UploadFile = File(...)):

    image_bytes = await image.read()

    response = rekognition.detect_faces(

        Image={'Bytes': image_bytes},

        Attributes=['ALL']

    )

    face_count = len(response['FaceDetails'])

    return {

        "faces_detected": face_count

    }
@app.post("/detect-text")

async def detect_text(image: UploadFile = File(...)):

    image_bytes = await image.read()

    response = rekognition.detect_text(

        Image={'Bytes': image_bytes}

    )

    texts = []

    for text in response['TextDetections']:

        if text['Type'] == 'LINE':

            texts.append(text['DetectedText'])

    return {

        "detected_text": texts

    }
@app.post("/detect-moderation")
async def moderation_labels(image: UploadFile = File(...)):

    image_bytes = await image.read()

    response = rekognition.detect_moderation_labels(
        Image={"Bytes": image_bytes}
    )

    labels = []

    for label in response["ModerationLabels"]:
        labels.append(label["Name"])

    return {
        "moderation_labels": labels
    }
@app.post("/detect-celebs")
async def recognize_celebs(image: UploadFile = File(...)):

    image_bytes = await image.read()

    response = rekognition.recognize_celebrities(
        Image={"Bytes": image_bytes}
    )

    celebs = []

    for celeb in response["CelebrityFaces"]:
        celebs.append(celeb["Name"])

    return {
        "celebrities": celebs
    }
@app.post("/detect-objects")

async def detect_objects(image: UploadFile = File(...)):

    image_bytes = await image.read()

    response = rekognition.detect_labels(

        Image={'Bytes': image_bytes},

        MaxLabels=10

    )

    objects = []

    for label in response['Labels']:

        objects.append(label['Name'])

    return {

        "objects": objects

    }