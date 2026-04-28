import base64
import json
import os
import smtplib
from email.mime.text import MIMEText

def send_email_alert(sensor_id, temp, battery):
    sender_email = os.environ.get('SENDER_EMAIL')
    sender_password = os.environ.get('SENDER_PASSWORD')
    receiver_email = os.environ.get('RECEIVER_EMAIL')
    
    if not sender_email or not sender_password or not receiver_email:
        print("Missing email credentials in environment variables. Cannot send alert.")
        return

    # Construct the email
    email_body = (
        f"CRITICAL ALERT: Sensor {sensor_id} reported an anomaly.\n\n"
        f"Details:\n"
        f"- Temperature: {temp}°C\n"
        f"- Battery Level: {battery}%\n\n"
        f"Please check the device immediately."
    )
    
    msg = MIMEText(email_body)
    msg['Subject'] = f"🚨 IoT Alert: Anomalous reading from {sensor_id}"
    msg['From'] = sender_email
    msg['To'] = receiver_email

    # Send the email via Gmail SMTP
    try:
        # Use port 465 for SSL
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
            print(f"Alert email sent successfully to {receiver_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

import functions_framework

@functions_framework.cloud_event
def process_telemetry(cloud_event):
    """Triggered from a message on a Cloud Pub/Sub topic via Eventarc (Gen 2)."""
    # In Gen 2, the pubsub message is nested inside the cloud_event object
    pubsub_message = base64.b64decode(cloud_event.data["message"]["data"]).decode('utf-8')
    
    try:
        data = json.loads(pubsub_message)
        sensor_id = data.get('sensorId', 'Unknown')
        temp = data.get('temperature', 0.0)
        battery = data.get('batteryLevel', 100)
        
        # Threshold checks (e.g. temp > 40 or battery < 20)
        if temp > 40.0 or battery < 20:
            print(f"Anomaly detected for {sensor_id}! Temp: {temp}, Battery: {battery}. Triggering email alert...")
            send_email_alert(sensor_id, temp, battery)
        else:
            print(f"Readings normal for {sensor_id}. No action taken.")
            
    except Exception as e:
        print(f"Error processing Pub/Sub message: {e}")
