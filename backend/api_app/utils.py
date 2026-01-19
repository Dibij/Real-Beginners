import base64
import hashlib
from cryptography.fernet import Fernet
from django.conf import settings

def derive_key(password):
    # For MVP, we'll use a simple salt and PBKDF2
    # In production, use unique salts per user stored in the DB
    password_bytes = password.encode()
    salt = settings.ENCRYPTION_SALT
    kdf = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, 100000)
    return base64.urlsafe_b64encode(kdf)

def encrypt_content(content, key):
    f = Fernet(key)
    return f.encrypt(content.encode()).decode()

def decrypt_content(encrypted_content, key):
    f = Fernet(key)
    return f.decrypt(encrypted_content.encode()).decode()
