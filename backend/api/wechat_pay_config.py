# backend/api/wechat_pay_config.py
import os
from dotenv import load_dotenv

load_dotenv()


class WeChatPayConfig:
    """微信支付配置"""

    # 小程序信息
    APPID = os.getenv('WECHAT_PAY_APPID', '')  # 移除硬编码，从环境变量获取

    # 商户信息
    MCHID = os.getenv('WECHAT_PAY_MCHID', '')  # 商户号
    API_V3_KEY = os.getenv('WECHAT_PAY_API_V3_KEY', '')  # API V3密钥 - 移除默认值

    # 证书路径
    APICLIENT_KEY_PATH = os.getenv('WECHAT_PAY_KEY_PATH', '')  # 商户私钥文件路径
    PLATFORM_CERT_PATH = os.getenv('WECHAT_PAY_CERT_PATH', '')  # 平台证书路径

    # 回调地址
    NOTIFY_URL = os.getenv('WECHAT_PAY_NOTIFY_URL', '')  # 支付结果通知URL

    # API地址
    BASE_URL = 'https://api.mch.weixin.qq.com'

    # API V2地址（如果需要）
    API_V2_URL = 'https://api.mch.weixin.qq.com'

    @classmethod
    def validate_config(cls):
        """验证配置是否完整"""
        required_fields = {
            'WECHAT_PAY_APPID': cls.APPID,
            'WECHAT_PAY_MCHID': cls.MCHID,
            'WECHAT_PAY_API_V3_KEY': cls.API_V3_KEY,
            'WECHAT_PAY_KEY_PATH': cls.APICLIENT_KEY_PATH,
            'WECHAT_PAY_CERT_PATH': cls.PLATFORM_CERT_PATH,
            'WECHAT_PAY_NOTIFY_URL': cls.NOTIFY_URL
        }

        missing_fields = [field for field, value in required_fields.items() if not value]

        if missing_fields:
            raise ValueError(f"以下微信支付配置缺失: {', '.join(missing_fields)}")

        # 检查文件是否存在
        if not os.path.exists(cls.APICLIENT_KEY_PATH):
            raise ValueError(f"商户私钥文件不存在: {cls.APICLIENT_KEY_PATH}")

        if cls.PLATFORM_CERT_PATH and not os.path.exists(cls.PLATFORM_CERT_PATH):
            raise ValueError(f"平台证书文件不存在: {cls.PLATFORM_CERT_PATH}")

        return True