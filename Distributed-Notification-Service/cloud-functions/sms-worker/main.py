import base64
import json
import logging
import os
from twilio.rest import Client

# Setup logging
logging.basicConfig(level=logging.INFO)

def send_sms_notification(event, context):
    """Triggered from a message on a Cloud Pub/Sub topic."""
    
    # 1. Decode the Pub/Sub message
    if 'data' not in event:
        logging.error("No data found in the event")
        return

    pubsub_message = base64.b64decode(event['data']).decode('utf-8')
    logging.info(f"Received message for SMS: {pubsub_message}")
    
    try:
        data = json.loads(pubsub_message)
        recipient = data.get('recipient')
        content = data.get('content')
        
        # 2. Twilio Credentials
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_number = os.environ.get('TWILIO_NUMBER')
        
        if not all([account_sid, auth_token, twilio_number]):
            logging.error("Twilio credentials missing in environment variables")
            return

        # 3. Send via Twilio
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=content,
            from_=twilio_number,
            to=recipient
        )
        
        logging.info(f"SMS sent! SID: {message.sid}")
        
    except Exception as e:
        logging.error(f"Error sending SMS: {str(e)}")
        # Raise to trigger Pub/Sub retry/DLQ
        raise e
