const analyzeBtn       = document.getElementById("analyzeBtn");
const imageInput       = document.getElementById("imageInput");
const imageInput2      = document.getElementById("imageInput2");
const analysisType     = document.getElementById("analysisType");
const results          = document.getElementById("results");
const previewImage     = document.getElementById("previewImage");
const previewImage2    = document.getElementById("previewImage2");
const secondImageWrap  = document.getElementById("secondImageWrap");
const ageInputWrap     = document.getElementById("ageInputWrap");

const BASE_URL = "http://127.0.0.1:8000";

/* =====================
   IMAGE PREVIEW — IMAGE 1
===================== */
imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (file) {
        previewImage.src = URL.createObjectURL(file);
        previewImage.style.display = "block";
    }
});

/* =====================
   IMAGE PREVIEW — IMAGE 2
===================== */
imageInput2.addEventListener("change", () => {
    const file = imageInput2.files[0];
    if (file) {
        previewImage2.src = URL.createObjectURL(file);
        previewImage2.style.display = "block";
    }
});

/* =====================
   SHOW / HIDE EXTRA INPUTS
===================== */
analysisType.addEventListener("change", () => {
    const type = analysisType.value;
    secondImageWrap.style.display = type === "compare"     ? "block" : "none";
    ageInputWrap.style.display    = type === "verify-age"  ? "block" : "none";

    // hide second preview when switching away from compare
    if (type !== "compare") {
        previewImage2.style.display = "none";
    }
});

/* =====================
   ANALYZE BUTTON
===================== */
analyzeBtn.addEventListener("click", async () => {

    const file = imageInput.files[0];
    const type = analysisType.value;

    if (!file) {
        results.innerHTML = `<p class="error">⚠ Please upload an image first.</p>`;
        return;
    }

    if (type === "compare" && !imageInput2.files[0]) {
        results.innerHTML = `<p class="error">⚠ Please upload a second image for face comparison.</p>`;
        return;
    }

    results.innerHTML = `<p class="loading">⏳ Analyzing image...</p>`;

    try {
        let data;

        if (type === "compare") {
            const formData = new FormData();
            formData.append("source_image", file);
            formData.append("target_image", imageInput2.files[0]);

            const res = await fetch(`${BASE_URL}/compare-faces`, {
                method: "POST",
                body: formData
            });
            data = await res.json();

        } else if (type === "verify-age") {
            const minAge = document.getElementById("minAge").value;
            const formData = new FormData();
            formData.append("image", file);

            const res = await fetch(`${BASE_URL}/verify-age?minimum_age=${minAge}`, {
                method: "POST",
                body: formData
            });
            data = await res.json();

        } else {
            const endpointMap = {
                faces:      "detect-faces",
                objects:    "detect-objects",
                text:       "detect-text",
                moderation: "detect-moderation",
                celebrity:  "detect-celebs"
            };

            const formData = new FormData();
            formData.append("image", file);

            const res = await fetch(`${BASE_URL}/${endpointMap[type]}`, {
                method: "POST",
                body: formData
            });
            data = await res.json();
        }

        results.innerHTML = renderResults(type, data);

    } catch (err) {
        results.innerHTML = `<p class="error">❌ Something went wrong. Is the server running?</p>`;
    }
});

/* =====================
   RENDER RESULTS
===================== */
function renderResults(type, data) {

    if (data.error) {
        return `<p class="error">⚠ ${data.error}</p>`;
    }

    /* ── FACE ANALYSIS ── */
    if (type === "faces") {
        if (!data.faces || data.faces.length === 0) {
            return `<p class="error">No faces detected in this image.</p>`;
        }

        let html = `
            <div class="result-card">
                <h4>👤 Face Analysis</h4>
                <p>Faces Detected: <span>${data.faces_detected}</span></p>
            </div>
        `;

        data.faces.forEach(face => {

            // Emotion bars (top 5)
            const emotionBars = face.all_emotions.slice(0, 5).map(e => `
                <div class="emotion-bar-wrap">
                    <div class="emotion-label">
                        <span>${cap(e.emotion)}</span>
                        <span>${e.confidence}%</span>
                    </div>
                    <div class="emotion-bar">
                        <div class="emotion-fill" style="width:${e.confidence}%"></div>
                    </div>
                </div>
            `).join("");

            // Facial attribute badges
            const attrs = face.facial_attributes;
            const badgeList = [
                { label: "😊 Smile",        key: attrs.smile },
                { label: "👓 Glasses",       key: attrs.eyeglasses },
                { label: "🕶 Sunglasses",    key: attrs.sunglasses },
                { label: "🧔 Beard",         key: attrs.beard },
                { label: "👨 Mustache",      key: attrs.mustache },
                { label: "👁 Eyes Open",     key: attrs.eyes_open },
                { label: "💬 Mouth Open",    key: attrs.mouth_open },
            ];

            const badges = badgeList.map(b =>
                `<span class="badge ${b.key.value ? "active" : ""}">${b.label}</span>`
            ).join("");

            html += `
                <div class="face-card">
                    <h4>Face ${face.face_index} &nbsp;·&nbsp; ${face.confidence}% confidence</h4>

                    <p>🎂 Age: <span>${face.age.range}</span> (est. ${face.age.estimated} yrs)</p>
                    <p>👤 Gender: <span>${face.gender.value}</span> (${face.gender.confidence}%)</p>
                    <p>😊 Dominant Emotion: <span>${cap(face.dominant_emotion)}</span></p>

                    <p class="section-label">All Emotions</p>
                    ${emotionBars}

                    <p class="section-label">Facial Attributes</p>
                    <div class="badge-wrap">${badges}</div>
                </div>
            `;
        });

        return html;
    }

    /* ── OBJECTS ── */
    if (type === "objects") {
        if (!data.objects || data.objects.length === 0) {
            return `<p class="error">No objects detected.</p>`;
        }
        return `
            <div class="result-card">
                <h4>📦 Objects Detected</h4>
                <div class="badge-wrap">
                    ${data.objects.map(o => `<span class="badge active">${o}</span>`).join("")}
                </div>
            </div>
        `;
    }

    /* ── TEXT ── */
    if (type === "text") {
        if (!data.detected_text || data.detected_text.length === 0) {
            return `<p class="error">No text detected.</p>`;
        }
        return `
            <div class="result-card">
                <h4>📝 Extracted Text</h4>
                ${data.detected_text.map(t => `<p>→ <span>${t}</span></p>`).join("")}
            </div>
        `;
    }

    /* ── MODERATION ── */
    if (type === "moderation") {
        if (!data.moderation_labels || data.moderation_labels.length === 0) {
            return `
                <div class="result-card">
                    <h4>🛡 Moderation Check</h4>
                    <p><span class="verified">✔ No harmful content detected.</span></p>
                </div>
            `;
        }
        return `
            <div class="result-card">
                <h4>🛡 Moderation Labels</h4>
                <div class="badge-wrap">
                    ${data.moderation_labels.map(l => `<span class="badge">${l}</span>`).join("")}
                </div>
            </div>
        `;
    }

    /* ── CELEBRITY ── */
    if (type === "celebrity") {
        if (!data.celebrities || data.celebrities.length === 0) {
            return `<p class="error">No celebrities detected.</p>`;
        }
        return `
            <div class="result-card">
                <h4>⭐ Celebrities Detected</h4>
                ${data.celebrities.map(c => `<p>→ <span>${c}</span></p>`).join("")}
            </div>
        `;
    }

    /* ── FACE COMPARISON ── */
    if (type === "compare") {
        const similarity = data.matches && data.matches.length > 0
            ? data.matches[0].similarity
            : 0;
        const isSame = data.is_same_person;

        return `
            <div class="result-card">
                <h4>🔍 Face Comparison</h4>
                <div class="match-result">
                    <div class="match-score">${similarity}%</div>
                    <div class="match-sub">Similarity Score</div>
                </div>
                <p style="text-align:center; margin-top:10px;">
                    <span class="${isSame ? "verified" : "not-verified"}">
                        ${isSame ? "✔ Same Person" : "✘ Different People"}
                    </span>
                </p>
                <p style="margin-top:12px;">Faces Matched: <span>${data.faces_matched}</span></p>
                <p>Unmatched Faces: <span>${data.unmatched_faces}</span></p>
            </div>
        `;
    }

    /* ── AGE VERIFICATION ── */
    if (type === "verify-age") {
        const verified = data.age_verified;
        return `
            <div class="result-card">
                <h4>🎂 Age Verification</h4>
                <p>Age Range: <span>${data.age_range}</span></p>
                <p>Estimated Age: <span>${data.estimated_age} years</span></p>
                <p>Minimum Required: <span>${data.minimum_age_required} years</span></p>
                <p>Confidence: <span>${data.confidence}%</span></p>
                <p style="margin-top:12px;">
                    <span class="${verified ? "verified" : "not-verified"}">
                        ${verified ? "✔ Age Verified" : "✘ Age Not Verified"}
                    </span>
                </p>
            </div>
        `;
    }

    return `<p class="error">Unknown result.</p>`;
}

/* =====================
   HELPER
===================== */
function cap(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
