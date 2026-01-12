# backend/api/token_utils.py
import jwt
import hashlib
import time
from datetime import datetime, timedelta, timezone
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class TokenManager:
    """
    Token管理器 - 使用JWT实现更强的token机制
    """

    # Token配置
    TOKEN_SECRET = settings.SECRET_KEY  # 使用Django SECRET_KEY作为JWT密钥
    TOKEN_ALGORITHM = 'HS256'  # 使用HS256算法

    # Token过期时间
    ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 访问令牌30分钟过期
    REFRESH_TOKEN_EXPIRE_DAYS = 7  # 刷新令牌7天过期

    @classmethod
    def generate_tokens(cls, user_id, user_data=None):
        """
        生成访问令牌和刷新令牌

        Args:
            user_id: 用户ID
            user_data: 用户数据（可选）

        Returns:
            dict: 包含access_token和refresh_token
        """
        now = datetime.now(timezone.utc)

        # 生成访问令牌
        access_payload = {
            'user_id': user_id,
            'type': 'access',
            'exp': now + timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES),
            'iat': now,
            'data': user_data or {}
        }

        access_token = jwt.encode(
            access_payload,
            cls.TOKEN_SECRET,
            algorithm=cls.TOKEN_ALGORITHM
        )

        # 生成刷新令牌
        refresh_payload = {
            'user_id': user_id,
            'type': 'refresh',
            'exp': now + timedelta(days=cls.REFRESH_TOKEN_EXPIRE_DAYS),
            'iat': now
        }

        refresh_token = jwt.encode(
            refresh_payload,
            cls.TOKEN_SECRET,
            algorithm=cls.TOKEN_ALGORITHM
        )

        logger.info(f"为用户 {user_id} 生成新令牌")

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': cls.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }

    @classmethod
    def verify_token(cls, token, token_type='access'):
        """
        验证令牌

        Args:
            token: 要验证的令牌
            token_type: 令牌类型 ('access' 或 'refresh')

        Returns:
            dict: 令牌数据或None
        """
        try:
            payload = jwt.decode(
                token,
                cls.TOKEN_SECRET,
                algorithms=[cls.TOKEN_ALGORITHM]
            )

            # 检查令牌类型
            if payload.get('type') != token_type:
                logger.warning(f"令牌类型不匹配: 期望 {token_type}, 实际 {payload.get('type')}")
                return None

            return payload

        except jwt.ExpiredSignatureError:
            logger.warning("令牌已过期")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"无效的令牌: {e}")
            return None

    @classmethod
    def refresh_access_token(cls, refresh_token):
        """
        使用刷新令牌获取新的访问令牌

        Args:
            refresh_token: 刷新令牌

        Returns:
            dict: 新的访问令牌或None
        """
        payload = cls.verify_token(refresh_token, 'refresh')
        if not payload:
            return None

        user_id = payload['user_id']

        # 生成新的访问令牌
        return cls.generate_tokens(user_id)

    @classmethod
    def generate_legacy_token(cls, user_id, phone):
        """
        生成兼容旧版本的token (MD5哈希)
        仅用于向后兼容，不建议在新代码中使用

        Args:
            user_id: 用户ID
            phone: 手机号

        Returns:
            str: MD5哈希token
        """
        token_str = f"{user_id}_{int(time.time())}_{phone}"
        return hashlib.md5(token_str.encode()).hexdigest()