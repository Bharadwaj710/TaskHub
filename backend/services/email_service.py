import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
from config.config import Config

class EmailService:
    @staticmethod
    def send_email_async(to_email, subject, body):
        def send():
            if not Config.SMTP_USERNAME or not Config.SMTP_PASSWORD:
                print("Email credentials not configured. Skipping email send.")
                return

            try:
                msg = MIMEMultipart()
                msg['From'] = Config.SMTP_USERNAME
                msg['To'] = to_email
                msg['Subject'] = subject

                msg.attach(MIMEText(body, 'html'))

                server = smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT)
                server.starttls()
                server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()
                print(f"Email successfully sent to {to_email}")
            except Exception as e:
                print(f"Failed to send email to {to_email}: {str(e)}")
        
        thread = threading.Thread(target=send)
        thread.start()

    @staticmethod
    def send_task_assigned_email(user_email, task_title, assigner_name):
        subject = f"New Task Assigned: {task_title}"
        body = f"""
        <html>
            <body>
                <h2>You have a new task!</h2>
                <p><strong>{assigner_name}</strong> has assigned you a new task: <strong>{task_title}</strong>.</p>
                <p>Log in to your dashboard to view the details.</p>
            </body>
        </html>
        """
        EmailService.send_email_async(user_email, subject, body)

    @staticmethod
    def send_task_completed_email(assigner_email, task_title, completer_name):
        subject = f"Task Completed: {task_title}"
        body = f"""
        <html>
            <body>
                <h2>A task you assigned has been completed!</h2>
                <p><strong>{completer_name}</strong> has completed the task: <strong>{task_title}</strong>.</p>
            </body>
        </html>
        """
        EmailService.send_email_async(assigner_email, subject, body)

    @staticmethod
    def send_task_submitted_email(admin_email, task_title, assignee_name):
        subject = f"Task Submitted for Review: {task_title}"
        body = f"""
        <html>
            <body>
                <h2>Task Ready for Review</h2>
                <p><strong>{assignee_name}</strong> has submitted the task <strong>{task_title}</strong> for your review.</p>
                <p>Please log in to the dashboard to review and accept or request revisions.</p>
            </body>
        </html>
        """
        EmailService.send_email_async(admin_email, subject, body)

    @staticmethod
    def send_task_accepted_email(assignee_email, task_title, admin_name):
        subject = f"Task Accepted: {task_title}"
        body = f"""
        <html>
            <body>
                <h2>Great job! Your task was accepted</h2>
                <p><strong>{admin_name}</strong> has accepted your submission for the task: <strong>{task_title}</strong>.</p>
                <p>Thank you for your hard work!</p>
            </body>
        </html>
        """
        EmailService.send_email_async(assignee_email, subject, body)

    @staticmethod
    def send_revision_requested_email(assignee_email, task_title, admin_name):
        subject = f"Revision Requested: {task_title}"
        body = f"""
        <html>
            <body>
                <h2>Action Required: Revision Requested</h2>
                <p><strong>{admin_name}</strong> has requested a revision for the task: <strong>{task_title}</strong>.</p>
                <p>Please log in to the dashboard to review the feedback and resume your work.</p>
            </body>
        </html>
        """
        EmailService.send_email_async(assignee_email, subject, body)
