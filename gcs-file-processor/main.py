import functions_framework
from google.cloud import storage
from google.cloud.video import transcoder_v1
from google.cloud.video.transcoder_v1.services.transcoder_service import TranscoderServiceClient
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# Configuration
REGION = "us-central1"
PROCESSED_FOLDER = "processed-videos"
SUMMARY_FOLDER = "summaries"

@functions_framework.cloud_event
def process_gcs_event(cloud_event):
    data = cloud_event.data
    bucket = data["bucket"]
    name = data["name"]
    content_type = data["contentType"]

    print(f"Processing file: {name} (Type: {content_type}) in bucket: {bucket}")

    # Avoid infinite loops (don't process files we just created)
    if name.startswith(PROCESSED_FOLDER) or name.startswith(SUMMARY_FOLDER):
        print("Skipping processed file.")
        return

    if content_type == "application/pdf":
        summarize_pdf(bucket, name)
    elif content_type == "video/mp4":
        start_transcoding_job(bucket, name)
    else:
        print(f"No processing defined for type: {content_type}")

def summarize_pdf(bucket_name, file_name):
    print(f"Starting Gemini summarization for: {file_name}")
    vertexai.init(location="us-central1")
    model = GenerativeModel("gemini-1.5-flash")
    
    file_uri = f"gs://{bucket_name}/{file_name}"
    pdf_part = Part.from_uri(file_uri, mime_type="application/pdf")
    
    prompt = "Summarize this document in 3 concise bullet points focusing on the main findings."
    response = model.generate_content([pdf_part, prompt])
    
    summary_text = response.text
    print(f"Summary generated: {summary_text[:50]}...")

    # Save summary to GCS
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    summary_blob = bucket.blob(f"{SUMMARY_FOLDER}/{file_name}.txt")
    summary_blob.upload_from_string(summary_text)
    print("Summary saved to GCS.")

def start_transcoding_job(bucket_name, file_name):
    print(f"Starting Transcoder Job for: {file_name}")
    
    client = TranscoderServiceClient()
    parent = f"projects/{get_project_id()}/locations/{REGION}"
    
    # Output path: processed-videos/{filename-without-extension}/
    base_name = file_name.split("/")[-1].replace(".mp4", "")
    output_uri = f"gs://{bucket_name}/{PROCESSED_FOLDER}/{base_name}/"
    
    job = transcoder_v1.types.Job()
    job.input_uri = f"gs://{bucket_name}/{file_name}"
    job.output_uri = output_uri
    
    # HLS Configuration (360p and 720p)
    job.config = {
        "elementary_streams": [
            {
                "key": "video_360p",
                "video_stream": {"height_pixels": 360, "bitrate_bps": 800000, "frame_rate": 30}
            },
            {
                "key": "video_720p",
                "video_stream": {"height_pixels": 720, "bitrate_bps": 2500000, "frame_rate": 30}
            },
            {
                "key": "audio_main",
                "audio_stream": {"codec": "aac", "bitrate_bps": 128000}
            }
        ],
        "mux_streams": [
            {
                "key": "sd",
                "container": "ts",
                "elementary_streams": ["video_360p", "audio_main"],
                "segment_settings": {"segment_duration": {"seconds": 6}}
            },
            {
                "key": "hd",
                "container": "ts",
                "elementary_streams": ["video_720p", "audio_main"],
                "segment_settings": {"segment_duration": {"seconds": 6}}
            }
        ],
        "manifests": [
            {
                "file_name": "manifest.m3u8",
                "type": "HLS",
                "mux_streams": ["sd", "hd"]
            }
        ]
    }

    response = client.create_job(parent=parent, job=job)
    print(f"Transcoder Job created: {response.name}")

def get_project_id():
    import google.auth
    _, project_id = google.auth.default()
    return project_id
