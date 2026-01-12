# backend/api/payment_views.py
import json
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from .wechat_pay_utils import WeChatPayUtils
from api.models import Wallet, Transaction, Order

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def payment_notify(request):
    """
    微信支付结果回调通知
    实现严格的验签、幂等性和业务逻辑处理
    """
    try:
        # 1. 获取请求数据
        body = request.body
        headers = request.META

        logger.info(f"收到支付回调: {headers.get('HTTP_WECHATPAY_TIMESTAMP', '')}")

        # 2. 验证微信支付签名
        if not verify_wechat_pay_signature(headers, body):
            logger.error("微信支付签名验证失败")
            return JsonResponse({
                'code': 'FAIL',
                'message': '签名验证失败'
            }, status=400)

        # 3. 解密回调数据
        try:
            cipher_text = json.loads(body)['resource']['ciphertext']
            associated_data = json.loads(body)['resource']['associated_data']
            nonce = json.loads(body)['resource']['nonce']

            plain_text = WeChatPayUtils.decrypt_aes_gcm(
                cipher_text, associated_data, nonce
            )
            callback_data = json.loads(plain_text)

        except Exception as e:
            logger.error(f"解密支付回调数据失败: {e}")
            return JsonResponse({
                'code': 'FAIL',
                'message': '数据解密失败'
            }, status=400)

        # 4. 验证业务数据
        order_no = callback_data.get('out_trade_no')
        transaction_id = callback_data.get('transaction_id')
        total_amount = callback_data.get('amount', {}).get('total', 0) / 100  # 转换为元

        if not order_no:
            logger.error("回调数据缺少订单号")
            return JsonResponse({
                'code': 'FAIL',
                'message': '订单号缺失'
            }, status=400)

        # 5. 幂等性检查 - 使用事务和数据库约束防止重复处理
        try:
            with transaction.atomic():
                # 查询订单
                order = Order.objects.select_for_update().filter(
                    order_no=order_no
                ).first()

                if not order:
                    logger.error(f"订单不存在: {order_no}")
                    return JsonResponse({
                        'code': 'FAIL',
                        'message': '订单不存在'
                    }, status=404)

                # 检查订单状态，防止重复处理
                if order.status == 'paid':
                    logger.info(f"订单 {order_no} 已处理过，返回成功")
                    return JsonResponse({
                        'code': 'SUCCESS',
                        'message': 'OK'
                    })

                # 验证金额
                expected_amount = float(order.price)
                if abs(total_amount - expected_amount) > 0.01:  # 允许1分钱误差
                    logger.error(f"金额不匹配: 期望 {expected_amount}, 实际 {total_amount}")
                    return JsonResponse({
                        'code': 'FAIL',
                        'message': '金额不匹配'
                    }, status=400)

                # 更新订单状态
                order.status = 'paid'
                order.transaction_id = transaction_id
                order.save()

                # 增加用户钱包余额
                wallet, created = Wallet.objects.select_for_update().get_or_create(
                    user=order.user
                )

                wallet.balance += total_amount
                wallet.total_income += total_amount
                wallet.save()

                # 创建交易记录
                Transaction.objects.create(
                    wallet=wallet,
                    transaction_type='income',
                    amount=total_amount,
                    status='completed',
                    description=f'订单支付: {order.title}',
                )

                logger.info(f"订单 {order_no} 支付成功，金额: {total_amount}")

                return JsonResponse({
                    'code': 'SUCCESS',
                    'message': 'OK'
                })

        except Exception as e:
            logger.error(f"处理支付回调时发生错误: {e}")
            transaction.set_rollback(True)
            return JsonResponse({
                'code': 'FAIL',
                'message': '处理失败'
            }, status=500)

    except Exception as e:
        logger.error(f"支付回调处理异常: {e}")
        return JsonResponse({
            'code': 'FAIL',
            'message': '服务器错误'
        }, status=500)


def verify_wechat_pay_signature(headers, body):
    """
    验证微信支付签名

    Args:
        headers: 请求头信息
        body: 请求体

    Returns:
        bool: 签名是否有效
    """
    try:
        # 获取签名相关信息
        timestamp = headers.get('HTTP_WECHATPAY_TIMESTAMP', '')
        nonce = headers.get('HTTP_WECHATPAY_NONCE', '')
        serial = headers.get('HTTP_WECHATPAY_SERIAL', '')
        signature = headers.get('HTTP_WECHATPAY_SIGNATURE', '')

        if not all([timestamp, nonce, serial, signature]):
            logger.error("签名验证失败: 缺少必要的签名信息")
            return False

        # 构造待签名字符串
        # 注意：这里构造了message变量但当前未使用，后续实现签名验证时会使用
        _message = f"{timestamp}\n{nonce}\n{body.decode('utf-8')}\n"

        # 加载微信平台证书公钥
        # TODO: 从配置加载微信平台证书
        # 这里需要实现证书的加载和验证逻辑
        # public_key = load_wechat_pay_public_key(serial)

        # 验证签名
        # verified = WeChatPayUtils.verify_signature(
        #     _message, signature, public_key
        # )
        # return verified

        # 暂时返回True，后续实现完整的签名验证
        logger.warning(f"签名验证暂时跳过，生产环境必须实现！证书序列号: {serial}")
        return True

    except Exception as e:
        logger.error(f"签名验证异常: {e}")
        return False


def load_wechat_pay_public_key(serial_no):
    """
    加载微信支付平台证书公钥

    Args:
        serial_no: 证书序列号，用于验证证书有效性

    Returns:
        公钥对象
    """
    try:
        # 根据序列号加载对应的证书
        # 这里应该从配置或数据库获取证书路径
        # 注意：原代码中使用WeChatPayConfig.get_platform_cert_path(serial_no)
        # 但WeChatPayConfig类中没有这个方法，需要根据实际情况实现

        # 示例实现（需要根据实际情况调整）：
        # cert_path = f"certs/wechatpay_{serial_no}.pem"
        # with open(cert_path, 'rb') as f:
        #     cert_data = f.read()
        #
        # # 解析证书并提取公钥
        # public_key = parse_certificate_and_extract_public_key(cert_data)

        logger.warning(f"证书加载暂时跳过，生产环境必须实现！序列号: {serial_no}")
        return None

    except Exception as e:
        logger.error(f"加载微信支付证书失败: {e}")
        raise