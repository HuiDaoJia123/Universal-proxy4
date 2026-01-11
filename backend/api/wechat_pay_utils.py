# backend/api/wechat_pay_utils.py
import json
import time
import uuid
import hashlib
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from .wechat_pay_config import WeChatPayConfig


class WeChatPayUtils:
    """微信支付工具类"""

    @staticmethod
    def load_private_key(key_path):
        """加载商户私钥"""
        with open(key_path, 'rb') as f:
            private_key = serialization.load_pem_private_key(
                f.read(),
                password=None,
                backend=default_backend()
            )
        return private_key

    @staticmethod
    def sign_message(message, private_key):
        """使用私钥对消息进行签名"""
        signature = private_key.sign(
            message.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return base64.b64encode(signature).decode('utf-8')

    @staticmethod
    def verify_signature(message, signature, public_key):
        """验证签名"""
        try:
            public_key.verify(
                base64.b64decode(signature),
                message.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False

    @staticmethod
    def decrypt_aes_gcm(ciphertext, associated_data, nonce):
        """使用API V3密钥解密"""
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        # Base64解码
        ciphertext = base64.b64decode(ciphertext)

        # 提取加密数据
        tag = ciphertext[-16:]
        encrypted_data = ciphertext[:-16]

        # 创建AES-GCM解密器
        aesgcm = AESGCM(bytes(WeChatPayConfig.API_V3_KEY, 'utf-8'))

        try:
            plaintext = aesgcm.decrypt(
                nonce.encode('utf-8'),
                encrypted_data + tag,
                associated_data.encode('utf-8') if associated_data else None
            )
            return plaintext.decode('utf-8')
        except Exception as e:
            raise Exception(f"解密失败: {str(e)}")

    @staticmethod
    def generate_nonce_str():
        """生成随机字符串"""
        return uuid.uuid4().hex

    @staticmethod
    def get_timestamp():
        """获取当前时间戳"""
        return str(int(time.time()))