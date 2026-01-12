# backend/smart_backend/exception_handler.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    自定义异常处理器
    统一处理API异常响应格式
    """
    # 调用DRF默认的异常处理
    response = exception_handler(exc, context)

    if response is not None:
        # 自定义响应格式
        custom_response_data = {
            'code': response.status_code,
            'msg': str(exc) if hasattr(exc, 'detail') else str(exc),
            'data': None
        }

        # 记录错误日志
        logger.error(f"API异常: {exc}, 路径: {context['request'].path}")

        response.data = custom_response_data
        return response

    # 处理未被DRF捕获的异常
    logger.error(f"未捕获的异常: {exc}")
    return Response({
        'code': status.HTTP_500_INTERNAL_SERVER_ERROR,
        'msg': '服务器内部错误',
        'data': None
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)