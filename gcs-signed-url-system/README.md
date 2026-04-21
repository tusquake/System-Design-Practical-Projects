# CloudStream: Secure GCS File Upload System

CloudStream is a production-grade implementation of a Decoupled File Upload System using Google Cloud Storage (GCS), V4 Signed URLs, and PostgreSQL for metadata persistence. This architecture is designed to handle high-traffic file uploads efficiently by offloading data transfer to the cloud while maintaining a robust audit trail in a relational database.

---

## System Design Architecture

The project implements a "Direct-to-Cloud" pattern combined with "Metadata Persistence." Instead of just uploading files, the system now tracks every upload attempt and successful generation of access links in a database.

### Process Flow (Mermaid)

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant B as Spring Boot Backend
    participant DB as PostgreSQL Database
    participant G as Google Cloud Storage

    Note over U, G: Step 1: Request Permission & Record Metadata
    U->>B: GET /files/upload-url?fileName=paper.pdf&contentType=application/pdf
    B->>B: Validate Content Type
    B->>G: Request Signed PUT URL (V4)
    G-->>B: Return Signed URL
    B->>DB: Save FileMetadata (Original Name, GCS Name, Type)
    DB-->>B: Metadata Persisted
    B-->>U: Return JSON {uploadUrl, uniqueFileName}

    Note over U, G: Step 2: Direct Upload
    U->>G: PUT [File Bytes] to Signed URL
    G-->>U: 200 OK (Upload Successful)

    Note over U, G: Step 3: Access & History
    U->>B: GET /files (Retrieve History)
    B->>DB: Fetch All FileMetadata
    DB-->>B: List of Files
    B-->>U: Return JSON Array of Files

    U->>B: GET /files/download-url?fileName=unique-name.pdf
    B->>G: Request Signed GET URL
    G-->>B: Return Signed Download URL
    B-->>U: Return JSON {downloadUrl}
```

---

## Key System Design Concepts

### 1. Decoupled Data Transfer (Offloading)
The application server never touches the file bytes. This saves bandwidth and CPU, allowing the server to scale horizontally without being bottlenecked by I/O.

### 2. Metadata Persistence (Audit Trail)
Every upload request is logged in PostgreSQL. This allows the system to:
- Track which files were uploaded and when.
- Provide a history/dashboard of uploads to the user.
- Maintain a mapping between the user's original filename and the unique GCS storage name.

### 3. Time-Limited Principle (Least Privilege)
Signed URLs expire in 15 minutes. This minimizes the window of risk if a URL is leaked.

### 4. Idempotency & Collision Avoidance
The system uses UUIDs for storage names. This ensures that even if 1,000 users upload a file named `resume.pdf`, they are all stored as unique objects in GCS without overwriting each other.

---

## Technical Stack

- **Backend**: Java 17, Spring Boot 3.2.4
- **Persistence**: Spring Data JPA, Hibernate, PostgreSQL
- **Cloud Storage**: Google Cloud Storage SDK (V4 Signatures)
- **Frontend**: Vanilla JS (ES6+), HTML5, CSS3 (Glassmorphism design)
- **Auth**: Service Account (JSON Key) with Storage Object Admin roles.

---

## Setup & Installation

### 1. Google Cloud Configuration

#### A. Create a Storage Bucket
1. Navigate to GCS Console.
2. Create a bucket (e.g., tushar-secure-uploads).

#### B. Configure CORS
Apply the following CORS policy to your bucket:
```json
[
  {
    "origin": ["*"],
    "method": ["PUT", "GET", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```
Command: `gsutil cors set cors.json gs://YOUR_BUCKET_NAME`

### 2. Database Configuration
Ensure you have a PostgreSQL instance running. Create a database named `gcs_db`.

Update `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/gcs_db
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

### 3. Service Account
Ensure your Service Account JSON key is available and referenced in the properties file:
```properties
gcp.storage.credentials-path=file:C:/path/to/your/key.json
```

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/files/upload-url` | Generates a signed PUT URL and saves metadata. |
| `GET` | `/files/download-url` | Generates a signed GET URL for viewing. |
| `GET` | `/files` | Lists all uploaded file metadata from the database. |

---

## Security Considerations

- **V4 Signature Validation**: The signed URL is locked to a specific `Content-Type`. If the client tries to upload a different type, GCS will reject it.
- **Relational Integrity**: The database ensures that every GCS object has a corresponding metadata record, facilitating easier cleanup and management.
- **Environment Isolation**: Sensitive configuration (DB passwords, Cloud Keys) is kept in properties files, allowing for easy environment-specific overrides.

---

## Potential Enhancements
- **Pub/Sub Notifications**: Trigger a background process (e.g., thumbnail generation) when a file is successfully uploaded to GCS.
- **Resumable Uploads**: For very large files (GBs), implement GCS Resumable Uploads to handle network interruptions.
- **User Ownership**: Add a `user_id` column to the metadata table to restrict file access to specific users.

---
Created as a System Design Practical Project by Antigravity AI.
