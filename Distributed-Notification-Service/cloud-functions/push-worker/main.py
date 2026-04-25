import base64
import json
import firebase_admin
from firebase_admin import credentials, messaging
import functions_framework

# Initialize Firebase Admin SDK
# The JSON key will be provided via an environment variable path
cred = credentials.Certificate('firebase-key.json')
firebase_admin.initialize_app(cred)

@functions_framework.cloud_event
def send_push_notification(cloud_event):
    # 1. Parse the Pub/Sub message
    pubsub_message = base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
    data = json.loads(pubsub_message)
    
    # Recipient here is the FCM Device Token
    device_token = data.get('recipient')
    title = data.get('subject', 'New Notification')
    body = data.get('content', '')

    if not device_token:
        print("Error: No device token provided in 'recipient' field.")
        return

    # 2. Prepare the Message
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=device_token,
    )

    # 3. Send the message
    try:
        response = messaging.send(message)
        print(f'Successfully sent push message: {response}')
    except Exception as e:
        print(f'Error sending push message: {e}')
