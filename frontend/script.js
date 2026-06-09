const analyzeBtn = document.getElementById("analyzeBtn");

const imageInput = document.getElementById("imageInput");

const analysisType = document.getElementById("analysisType");

const results = document.getElementById("results");

const previewImage = document.getElementById("previewImage");



/* IMAGE PREVIEW */

imageInput.addEventListener("change", () => {

    const file = imageInput.files[0];

    if (file) {

        previewImage.src = URL.createObjectURL(file);

        previewImage.style.display = "block";

    }

});



/* ANALYZE BUTTON */

analyzeBtn.addEventListener("click", async () => {

    const file = imageInput.files[0];



    /* ERROR HANDLING */

    if (!file) {

        results.innerHTML = `

            <p class="error">

                ⚠ Please upload an image first

            </p>

        `;

        return;

    }



    const type = analysisType.value;



    /* API ROUTING */

    let endpoint = "";



    if (type === "faces") {

        endpoint = "detect-faces";

    }

    else if (type === "objects") {

        endpoint = "detect-objects";

    }

    else if (type === "text") {

        endpoint = "detect-text";

    }

    else if (type === "moderation") {

        endpoint = "detect-moderation";

    }

    else if (type === "celebrity") {

        endpoint = "detect-celebs";

    }



    /* FORM DATA */

    const formData = new FormData();

    formData.append("image", file);



    /* LOADING ANIMATION */

    results.innerHTML = `

        <p class="loading">

            ⏳ Analyzing image...

        </p>

    `;



    try {

        const response = await fetch(

            `http://127.0.0.1:8000/${endpoint}`,

            {

                method: "POST",

                body: formData

            }

        );



        const data = await response.json();



        /* PRETTY RESULTS */

        let output = "";



        if (data.faces_detected !== undefined) {

    output += `

        <h4>👤 Face Detection</h4>

        <p>
            Faces Detected:
            ${data.faces_detected}
        </p>

    `;
}


        if (data.objects) {

            output += `

                <h4>📦 Objects Detected:</h4>

                <p>${data.objects.join(", ")}</p>

            `;

        }



        
           if (data.detected_text) {

    output += `

        <h4>📝 Extracted Text</h4>

        <p>
            ${data.detected_text.join(", ")}
        </p>

    `;
}



        if (data.moderation_labels) {

            output += `

                <h4>🛡 Moderation Labels:</h4>

                <p>${data.moderation_labels.join(", ")}</p>

            `;

        }



        if (data.celebrities) {

            output += `

                <h4>⭐ Celebrity Detected:</h4>

                <p>${data.celebrities.join(", ")}</p>

            `;

        }



        /* IF EMPTY */

        if (output === "") {

            output = `

                <p class="error">

                    No results found

                </p>

            `;

        }



        results.innerHTML = output;

    }



    catch (error) {

        results.innerHTML = `

            <p class="error">

                ❌ Something went wrong

            </p>

        `;

    }

});