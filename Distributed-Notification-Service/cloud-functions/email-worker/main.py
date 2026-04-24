import base64
import json
import logging
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Setup logging
logging.basicConfig(level=logging.INFO)

def send_email_notification(event, context):
    """Triggered from a message on a Cloud Pub/Sub topic."""
    
    # 1. Decode the Pub/Sub message
    if 'data' not in event:
        logging.error("No data found in the event")
        return

    pubsub_message = base64.b64decode(event['data']).decode('utf-8')
    logging.info(f"Received message: {pubsub_message}")
    
    try:
        data = json.loads(pubsub_message)
        recipient = data.get('recipient')
        content = data.get('content')
        subject = data.get('subject', 'New Notification')
        
        # 2. Prepare the Email
        # NOTE: from_email must be a verified sender in your SendGrid account
        message = Mail(
            from_email='sethtushar111@gmail.com', 
            to_emails=recipient,
            subject=subject,
            plain_text_content=content
        )
        
        # 3. Send via SendGrid
        sg_key = os.environ.get('SENDGRID_API_KEY')
        if not sg_key:
            logging.error("SENDGRID_API_KEY environment variable not set")
            return

        sg = SendGridAPIClient(sg_key)
        response = sg.send(message)
        
        logging.info(f"Email sent! Status Code: {response.status_code}")
        
    except Exception as e:
        logging.error(f"Error sending email: {str(e)}")
        # Raise the error to trigger a Pub/Sub retry or DLQ logic
        raise e
