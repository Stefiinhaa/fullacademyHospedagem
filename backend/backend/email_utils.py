import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()


def enviar_email(destinatario: str, assunto: str, corpo: str):
  
    email_sender = os.getenv("EMAIL_SENDER")
    email_password = os.getenv("EMAIL_PASSWORD")
    
    if not email_sender or not email_password:
        raise Exception(
            "Variáveis EMAIL_SENDER e EMAIL_PASSWORD não configuradas no .env"
        )
    
    try:
        servidor_smtp = smtplib.SMTP("smtp.gmail.com", 587)
        servidor_smtp.starttls()  
        
        servidor_smtp.login(email_sender, email_password)
        mensagem = MIMEMultipart()
        mensagem["From"] = email_sender
        mensagem["To"] = destinatario
        mensagem["Subject"] = assunto
        

        mensagem.attach(MIMEText(corpo, "plain"))
        
        servidor_smtp.send_message(mensagem)
        servidor_smtp.quit()
        
        print(f"Email enviado com sucesso para {destinatario}")
        
    except smtplib.SMTPAuthenticationError:
        raise Exception(
            "Erro de autenticação. Verifique EMAIL_SENDER e EMAIL_PASSWORD no .env"
        )
    except smtplib.SMTPException as e:
        raise Exception(f"Erro ao enviar email: {str(e)}")
    except Exception as e:
        raise Exception(f"Erro inesperado: {str(e)}")
