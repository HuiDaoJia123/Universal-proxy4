# smart/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.conf import settings
from .models import Welcome
from api.models import UserProfile
import json
import requests
import logging
import hashlib
import time

logger = logging.getLogger(__name__)


@csrf_exempt
def welcome(request):
    """
    获取order最大的欢迎页图片
    返回格式：{'code': 100, 'msg': '成功', 'result': '图片URL'}
    """
    try:
        # 查出order最大的一张图片（没有删除的）
        res = Welcome.objects.filter(is_delete=False).order_by('-order').first()

        if res and res.img:
            # 构建完整的图片URL
            img_url = request.build_absolute_uri(res.img.url)

            return JsonResponse({
                'code': 100,
                'msg': '成功',
                'result': img_url,
                'data': {
                    'img_url': img_url,
                    'order': res.order,
                    'create_time': res.create_time.strftime('%Y-%m-%d %H:%M:%S')
                }
            })
        else:
            return JsonResponse({
                'code': 101,
                'msg': '暂无欢迎页图片',
                'result': ''
            })

    except Exception as e:
        logger.error(f"获取欢迎页图片失败: {str(e)}")
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'result': ''
        })


@csrf_exempt
def test_api(request):
    """
    测试接口，用于检查服务器是否正常运行
    """
    return JsonResponse({
        'code': 200,
        'msg': '服务器运行正常',
        'data': {
            'server': 'http://127.0.0.1:8000',
            'status': 'ok',
            'service': 'smart_backend'
        }
    })


@csrf_exempt
def simple_login(request):
    """
    微信一键登录接口（支持获取真实手机号）
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            login_type = data.get('login_type', 'normal')

            if login_type == 'wechat':
                # 微信一键登录
                phone_code = data.get('phone_code')
                user_info = data.get('userInfo', {})

                # 开发环境：直接使用手机号
                dev_phone = data.get('dev_phone')

                if dev_phone:
                    # 开发环境模拟登录
                    logger.info(f'开发环境模拟登录，手机号: {dev_phone}')

                    # 查找或创建用户
                    try:
                        user_profile = UserProfile.objects.get(phone=dev_phone)
                        user = user_profile.user
                        user.username = f"dev_{dev_phone}"
                        user.save()
                        logger.info(f'用户已存在: {user.id}')
                    except UserProfile.DoesNotExist:
                        # 创建测试用户
                        user = User.objects.create_user(
                            username=f"dev_{dev_phone}",
                            password=None
                        )
                        user_profile = UserProfile.objects.create(
                            user=user,
                            phone=dev_phone,
                            real_name=user_info.get('nickName', '开发用户'),
                            student_id='',
                            is_verified=False
                        )
                        logger.info(f'创建新用户: {user.id}')

                    # 生成token
                    token_str = f"{user.id}_{int(time.time())}_{dev_phone}"
                    token = hashlib.md5(token_str.encode()).hexdigest()

                    return JsonResponse({
                        'code': 200,
                        'msg': '登录成功',
                        'data': {
                            'user': {
                                'id': user.id,
                                'username': user.username,
                                'nickname': user_profile.real_name,
                                'phone': user_profile.phone,
                                'avatar_url': user_info.get('avatarUrl', ''),
                                'country_code': '86'
                            },
                            'token': token,
                            'openid': f"dev_openid_{user.id}"
                        }
                    })

                # 真机环境：使用phone_code
                if not phone_code:
                    return JsonResponse({
                        'code': 400,
                        'msg': '缺少手机号授权码',
                        'data': None
                    })

                # 获取微信配置
                wechat_config = getattr(settings, 'WECHAT_MINIPROGRAM', {})
                appid = wechat_config.get('APPID', '')
                appsecret = wechat_config.get('APPSECRET', '')

                if not appid or not appsecret:
                    logger.error('微信小程序配置缺失')
                    return JsonResponse({
                        'code': 500,
                        'msg': '微信小程序配置缺失',
                        'data': None
                    })

                # 1. 获取微信access_token
                token_url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={appsecret}"
                token_response = requests.get(token_url, timeout=10)
                token_data = token_response.json()

                if 'errcode' in token_data:
                    logger.error(f"获取微信token失败: {token_data}")
                    return JsonResponse({
                        'code': 500,
                        'msg': f'获取微信token失败: {token_data.get("errmsg")}',
                        'data': None
                    })

                access_token = token_data.get('access_token')
                logger.info('获取微信access_token成功')

                # 2. 使用access_token和phone_code获取真实手机号
                phone_url = f"https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token={access_token}"
                phone_response = requests.post(phone_url, json={'code': phone_code}, timeout=10)
                phone_data = phone_response.json()

                if phone_data.get('errcode') != 0:
                    logger.error(f"获取手机号失败: {phone_data}")
                    return JsonResponse({
                        'code': 500,
                        'msg': f'获取手机号失败: {phone_data.get("errmsg")}',
                        'data': None
                    })

                # 3. 解析真实手机号
                phone_info = phone_data.get('phone_info', {})
                pure_phone = phone_info.get('purePhoneNumber', '')
                country_code = phone_info.get('countryCode', '86')

                if not pure_phone:
                    logger.error('无法解析手机号')
                    return JsonResponse({
                        'code': 500,
                        'msg': '无法解析手机号',
                        'data': None
                    })

                logger.info(f'获取到真实手机号: {pure_phone}')

                # 4. 查找或创建User和UserProfile
                # 先查找是否已有该手机号的UserProfile
                try:
                    user_profile = UserProfile.objects.get(phone=pure_phone)
                    user = user_profile.user
                    # 更新用户信息
                    user.username = f"wx_{pure_phone}"
                    user.save()
                    logger.info(f'用户已存在，更新信息: {user.id}')
                except UserProfile.DoesNotExist:
                    # 创建新User
                    user = User.objects.create_user(
                        username=f"wx_{pure_phone}",
                        password=None  # 微信登录不需要密码
                    )
                    logger.info(f'创建新User: {user.id}')

                    # 创建UserProfile
                    user_profile = UserProfile.objects.create(
                        user=user,
                        phone=pure_phone,
                        real_name=user_info.get('nickName', '微信用户'),
                        student_id='',
                        is_verified=False
                    )
                    logger.info(f'创建新UserProfile: {user_profile.id}')

                # 5. 生成token
                token_str = f"{user.id}_{int(time.time())}_{pure_phone}"
                token = hashlib.md5(token_str.encode()).hexdigest()

                return JsonResponse({
                    'code': 200,
                    'msg': '登录成功',
                    'data': {
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'nickname': user_profile.real_name,
                            'phone': user_profile.phone,
                            'avatar_url': user_info.get('avatarUrl', ''),
                            'country_code': country_code
                        },
                        'token': token,
                        'openid': f"openid_{user.id}"
                    }
                })

            else:
                # 普通登录（向后兼容）
                username = data.get('username', 'test')

                return JsonResponse({
                    'code': 200,
                    'msg': '登录成功',
                    'data': {
                        'user': {
                            'id': 1,
                            'username': username,
                            'nickname': '测试用户'
                        },
                        'token': 'test_token_123456'
                    }
                })

        except json.JSONDecodeError as e:
            logger.error(f'请求数据格式错误: {str(e)}')
            return JsonResponse({
                'code': 400,
                'msg': '请求数据格式错误',
                'data': None
            })
        except Exception as e:
            logger.error(f'登录错误: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '请使用POST请求',
        'data': None
    })


@csrf_exempt
def get_welcome_images(request):
    """获取欢迎页图片列表"""
    try:
        # 只获取启用且未删除的图片
        active_images = Welcome.objects.filter(
            is_active=True,
            is_delete=False
        ).order_by('order', '-create_time')

        images_data = []
        for img in active_images:
            images_data.append({
                'id': img.id,
                'url': img.img.url if img.img else '',
                'title': getattr(img, 'title', '') or '',
                'description': getattr(img, 'description', '') or '',
                'order': img.order
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': images_data
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'获取失败: {str(e)}',
            'data': []
        })


@csrf_exempt
def get_default_welcome(request):
    """获取默认欢迎图片"""
    try:
        # 获取优先级最高的启用图片
        default_image = Welcome.objects.filter(
            is_active=True,
            is_delete=False
        ).order_by('-order').first()

        if default_image and default_image.img:
            return JsonResponse({
                'code': 100,
                'result': default_image.img.url
            })
        else:
            return JsonResponse({
                'code': 404,
                'msg': '暂无欢迎页图片',
                'result': ''
            })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'获取失败: {str(e)}',
            'result': ''
        })