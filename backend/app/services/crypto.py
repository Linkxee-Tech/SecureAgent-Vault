import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException, status

from app.core.config import get_settings


def _decode_encryption_key(encoded_key: str) -> bytes:
    raw = encoded_key.encode("utf-8")
    if len(raw) == 32:
        return raw

    try:
        decoded = base64.b64decode(encoded_key, validate=True)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ENCRYPTION_KEY must be 32 raw bytes or valid base64.",
        ) from exc

    if len(decoded) != 32:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ENCRYPTION_KEY must decode to 32 bytes.",
        )
    return decoded


def encrypt_api_key(api_key: str) -> bytes:
    settings = get_settings()
    if not settings.encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ENCRYPTION_KEY is not configured.",
        )

    key = _decode_encryption_key(settings.encryption_key)
    aes_gcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aes_gcm.encrypt(nonce, api_key.encode("utf-8"), None)
    return nonce + ciphertext


def decrypt_api_key(blob: bytes) -> str:
    settings = get_settings()
    if not settings.encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ENCRYPTION_KEY is not configured.",
        )
    if len(blob) < 13:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encrypted blob is malformed.",
        )

    key = _decode_encryption_key(settings.encryption_key)
    nonce = blob[:12]
    ciphertext = blob[12:]
    aes_gcm = AESGCM(key)
    plaintext = aes_gcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")
