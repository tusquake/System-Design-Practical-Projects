# AI Document Summarization (Gemini 1.5 Flash)

This project features an automated AI pipeline that generates concise summaries for every PDF uploaded to the system.

---

### 1. The Tech Stack
- **AI Model:** `gemini-1.5-flash` (Vertex AI).
- **Processing:** Python 3.10 Cloud Function (Gen 2).
- **Trigger:** GCS `Object Finalized` event.

### 2. The Workflow
1. **Upload:** User uploads a PDF to GCS via a signed URL.
2. **Trigger:** Eventarc detects the file and triggers the Python Cloud Function.
3. **Processing:** 
   - The function reads the PDF directly from GCS using its `gs://` URI.
   - It sends a multimodal prompt to the Gemini 1.5 Flash model: *"Summarize this document in 3 concise bullet points focusing on the main findings."*
4. **Persistence:** The resulting text is saved back to a `/summaries` folder in GCS as a `.txt` file.
5. **Consumption:** When the user clicks "View Summary" in the UI, the Spring Boot backend fetches this text file and displays it.

### 3. Engineering Challenges
- **Cold Starts:** Cloud Functions need a few seconds to "warm up" when first triggered. We used **Gen 2** functions for better performance and concurrency.
- **Service Agents:** Vertex AI requires specific permissions to read from your private GCS buckets. We had to ensure the `service-PROJECT_NUMBER@gcp-sa-aiplatform.iam.gserviceaccount.com` had `Storage Object Viewer` access.
- **Resource Limits:** AI SDKs are memory-heavy. We increased the function memory to **512MiB** to ensure stable processing of large documents.

### 4. Why Gemini 1.5 Flash?
We chose the **Flash** model because it offers the perfect balance of **high speed** and **low cost**, making it ideal for "real-time" automated summarization tasks in a high-traffic system.

---
*Created as part of the System Design Practical Projects.*
