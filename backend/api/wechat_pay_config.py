# backend/api/wechat_pay_config.py
import os
from dotenv import load_dotenv

load_dotenv()


class WeChatPayConfig:
    """微信支付配置"""

    # 小程序信息
    APPID = 'wx673d65c7713a9573'  # 小程序AppID

    # 商户信息
    MCHID = os.getenv('WECHAT_PAY_MCHID', '')  # 商户号
    API_V3_KEY = os.getenv('WECHAT_PAY_API_V3_KEY', 'WHAT0C2SJ3G5aXRPqgp3Et2sdqeVEmK45PCqKevQPCg=')  # API V3密钥

    # 证书路径
    APICLIENT_KEY_PATH = os.getenv('WECHAT_PAY_KEY_PATH', '')  # 商户私钥文件路径
    PLATFORM_CERT_PATH = os.getenv('WECHAT_PAY_CERT_PATH', '')  # 平台证书路径

    # 回调地址
    NOTIFY_URL = 'https://xwydservice.cn/api/payment/notify/'  # 支付结果通知URL

    # API地址
    BASE_URL = 'https://api.mch.weixin.qq.com'

    # API V2地址（如果需要）
    API_V2_URL = 'https://api.mch.weixin.qq.com'

    @classmethod
    def validate_config(cls):
        """验证配置是否完整"""
        if not cls.MCHID:
            raise ValueError("请在环境变量中设置微信商户号")
        if not cls.APICLIENT_KEY_PATH:
            raise ValueError("请设置商户私钥文件路径")
        if not os.path.exists(cls.APICLIENT_KEY_PATH):
            raise ValueError(f"商户私钥文件不存在: {cls.APICLIENT_KEY_PATH}")
        return True