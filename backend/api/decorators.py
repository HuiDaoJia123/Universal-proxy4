# backend/api/decorators.py
from functools import wraps
from django.http import JsonResponse
import logging
from django.contrib.auth.decorators import login_required

logger = logging.getLogger(__name__)


def api_login_required(view_func):
    """
    API登录验证装饰器
    检查请求头中的token或查询参数中的token
    """

    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        # 从请求头获取token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        token = None

        if auth_header.startswith('Token '):
            token = auth_header[6:]
        elif auth_header.startswith('Bearer '):
            token = auth_header[7:]

        # 从查询参数获取token（兼容性）
        if not token:
            token = request.GET.get('token', '')

        if not token:
            logger.warning(f"未授权访问: {request.path}, IP: {get_client_ip(request)}")
            return JsonResponse({
                'code': 401,
                'msg': '请先登录',
                'data': None
            }, status=401)

        # TODO: 实际应该验证token有效性
        # 这里简化处理，后续实现完整的token验证
        # try:
        #     from api.models import UserProfile
        #     user_profile = UserProfile.objects.filter(token=token).select_related('user').first()
        #     if not user_profile:
        #         raise AuthenticationFailed('无效的token')
        #     request.user = user_profile.user
        #     request.token = token
        # except Exception as e:
        #     logger.error(f"Token验证失败: {e}")
        #     return JsonResponse({
        #         'code': 401,
        #         'msg': '登录已过期，请重新登录',
        #         'data': None
        #     }, status=401)

        return view_func(request, *args, **kwargs)

    return wrapped_view


def get_client_ip(request):
    """
    获取客户端IP地址
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip