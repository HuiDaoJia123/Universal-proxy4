# backend/api/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from datetime import datetime, timedelta
from .models import (
    UserProfile,
    BlacklistRecord,
    AuditApplication,
    Wallet,
    Transaction,
    Notification,
    Conversation,
    Message,
    Announcement,
    UserFeedback,
    OrderCategory,
    RiderSettings,
    RiderGrabRecord,
    Order
)
import json
import sys
import io
import logging
import random
import time
import hashlib
import requests
import os
import uuid
 
# 设置标准输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 配置日志
logger = logging.getLogger(__name__)


@csrf_exempt
def login(request):
    """登录接口"""
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
                        profile_obj = UserProfile.objects.get(phone=dev_phone)
                        user = profile_obj.user
                        user.username = f"dev_{dev_phone}"
                        user.save()
                        logger.info(f'用户已存在: {user.id}')
                    except UserProfile.DoesNotExist:
                        # 创建测试用户
                        user = User.objects.create_user(
                            username=f"dev_{dev_phone}",
                            password=None
                        )
                        profile_obj = UserProfile.objects.create(
                            user=user,
                            phone=dev_phone,
                            real_name=user_info.get('nickName', '开发用户'),
                            student_id='',
                            is_verified=False,
                            avatar_url=user_info.get('avatarUrl', '/media/default-avatar.png')
                        )
                        logger.info(f'创建新用户: {user.id}')

                    # 生成token - 这里使用了 hashlib
                    token_str = f"{user.id}_{int(time.time())}_{dev_phone}"
                    token = hashlib.md5(token_str.encode()).hexdigest()

                    return JsonResponse({
                        'code': 200,
                        'msg': '登录成功',
                        'data': {
                            'user': {
                                'id': user.id,
                                'username': user.username,
                                'nickname': profile_obj.real_name,
                                'phone': profile_obj.phone,
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
                    profile_obj = UserProfile.objects.get(phone=pure_phone)
                    user = profile_obj.user
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
                    profile_obj = UserProfile.objects.create(
                        user=user,
                        phone=pure_phone,
                        real_name=user_info.get('nickName', '微信用户'),
                        student_id='',
                        is_verified=False,
                       avatar_url = user_info.get('avatarUrl', '/media/default-avatar.png')
                    )
                    logger.info(f'创建新UserProfile: {profile_obj.id}')

                # 5. 生成token - 这里也使用了 hashlib
                token_str = f"{user.id}_{int(time.time())}_{pure_phone}"
                token = hashlib.md5(token_str.encode()).hexdigest()

                return JsonResponse({
                    'code': 200,
                    'msg': '登录成功',
                    'data': {
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'nickname': profile_obj.real_name,
                            'phone': profile_obj.phone,
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
def upload_image(request):
    """图片上传接口"""
    if request.method == 'POST':
        try:
            # 获取上传的文件
            image_file = request.FILES.get('image')

            if not image_file:
                return JsonResponse({
                    'code': 400,
                    'msg': '请选择要上传的图片',
                    'data': None
                })

            # 验证文件类型
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if image_file.content_type not in allowed_types:
                return JsonResponse({
                    'code': 400,
                    'msg': '只支持 JPG、PNG、GIF、WEBP 格式的图片',
                    'data': None
                })

            # 验证文件大小（最大 5MB）
            max_size = 5 * 1024 * 1024
            if image_file.size > max_size:
                return JsonResponse({
                    'code': 400,
                    'msg': '图片大小不能超过 5MB',
                    'data': None
                })

            # 生成文件名
            ext = os.path.splitext(image_file.name)[1]
            timestamp = int(time.time())
            filename = f'avatar_{timestamp}_{uuid.uuid4().hex[:8]}{ext}'

            # 保存文件
            upload_path = os.path.join(settings.MEDIA_ROOT, 'avatars')
            os.makedirs(upload_path, exist_ok=True)

            file_path = os.path.join(upload_path, filename)
            with open(file_path, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)

            # 生成 URL
            file_url = f'{settings.MEDIA_URL}avatars/{filename}'

            logger.info(f'图片上传成功: {file_url}')

            return JsonResponse({
                'code': 200,
                'msg': '上传成功',
                'data': {
                    'url': file_url,
                    'filename': filename
                }
            })

        except Exception as e:
            logger.error(f'图片上传失败: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'上传失败: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '请使用 POST 请求',
        'data': None
    })

@csrf_exempt
def get_user_info(request):
    """获取用户信息"""
    token = request.headers.get('Authorization', '')
    user_id = request.GET.get('user_id') or request.GET.get('userId')

    if request.method == 'GET':
        try:
            if not user_id:
                # 通过token获取用户信息
                if not token:
                    return JsonResponse({
                        'code': 401,
                        'msg': '缺少token',
                        'data': None
                    })

                # 这里可以添加token验证逻辑
                # 暂时返回错误
                return JsonResponse({
                    'code': 401,
                    'msg': 'token验证未实现',
                    'data': None
                })

            # 获取用户信息
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return JsonResponse({
                    'code': 404,
                    'msg': '用户不存在',
                    'data': None
                })

            # 获取用户资料
            try:
                profile = UserProfile.objects.get(user=user)
            except UserProfile.DoesNotExist:
                profile = None

            # 构建返回数据
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'date_joined': user.date_joined.strftime('%Y-%m-%d %H:%M:%S') if user.date_joined else ''
            }

            if profile:
                user_data.update({
                    'phone': profile.phone,
                    'real_name': profile.real_name,
                    'student_id': profile.student_id,
                    'is_verified': profile.is_verified,
                    'credit_score': profile.credit_score,
                    'is_blacklisted': profile.is_blacklisted,
                    'blacklist_reason': profile.blacklist_reason,
                    'last_login_time': profile.last_login_time.strftime(
                        '%Y-%m-%d %H:%M:%S') if profile.last_login_time else ''
                })

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': user_data
            })

        except Exception as e:
            logger.error(f'获取用户信息失败: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '请使用GET请求',
        'data': None
    })


@csrf_exempt
def update_user_info(request, user_id):
    """更新用户信息"""
    if request.method == 'PUT':
        try:
            # 获取当前用户
            user = User.objects.get(id=user_id)
            profile_obj = UserProfile.objects.get(user=user)

            # 解析请求数据
            data = json.loads(request.body)

            # 更新用户信息
            profile_obj.avatar_url = data.get('avatar_url', profile_obj.avatar_url)
            profile_obj.real_name = data.get('real_name', profile_obj.real_name)
            profile_obj.phone = data.get('phone', profile_obj.phone)
            profile_obj.student_id = data.get('student_id', profile_obj.student_id)
            profile_obj.gender = data.get('gender', profile_obj.gender)
            profile_obj.school = data.get('school', '')
            profile_obj.college = data.get('college', '')
            profile_obj.major = data.get('major', '')

            # 保存
            profile_obj.save()

            logger.info(f'用户信息更新成功: user_id={user_id}')

            return JsonResponse({
                'code': 200,
                'msg': '更新成功',
                'data': {
                    'id': user.id,
                    'avatar_url': profile_obj.avatar_url,
                    'real_name': profile_obj.real_name,
                    'phone': profile_obj.phone,
                    'gender': profile_obj.gender,
                    'school': profile_obj.school,
                    'college': profile_obj.college,
                    'major': profile_obj.major,
                    'student_id': profile_obj.student_id
                }
            })

        except User.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '用户不存在',
                'data': None
            })
        except Exception as e:
            logger.error(f'更新用户信息失败: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'更新失败: {str(e)}',
                'data': None
            })

@csrf_exempt
@require_http_methods(["GET", "POST"])
def blacklist_users(request):
    """黑名单用户管理"""
    if request.method == 'GET':
        try:
            blacklisted_profiles = UserProfile.objects.filter(is_blacklisted=True)
            users_data = []

            for profile in blacklisted_profiles:
                users_data.append({
                    'id': profile.user.id,
                    'username': profile.user.username,
                    'reason': profile.blacklist_reason,
                    'blacklist_until': profile.blacklist_until,
                })

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': users_data
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            reason = data.get('reason', '违规操作')

            if not user_id:
                return JsonResponse({
                    'code': 400,
                    'msg': '缺少用户ID',
                    'data': None
                })

            user = User.objects.get(id=user_id)
            profile, created = UserProfile.objects.get_or_create(user=user)

            profile.is_blacklisted = True
            profile.blacklist_reason = reason
            profile.save()

            BlacklistRecord.objects.create(
                user=user,
                reason=reason,
                status='active'
            )

            return JsonResponse({
                'code': 200,
                'msg': '用户已加入黑名单',
                'data': None
            })
        except User.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '用户不存在',
                'data': None
            })
        except json.JSONDecodeError:
            return JsonResponse({
                'code': 400,
                'msg': '请求数据格式错误',
                'data': None
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '不支持的请求方法',
        'data': None
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def audit_applications(request):
    """审核申请管理"""
    if request.method == 'GET':
        try:
            pending_applications = AuditApplication.objects.filter(status='pending')
            applications_data = []

            for app in pending_applications:
                applications_data.append({
                    'id': app.id,
                    'user_id': app.user.id,
                    'username': app.user.username,
                    'audit_type': app.audit_type,
                    'application_data': app.application_data,
                    'created_at': app.created_at,
                })

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': applications_data
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            audit_type = data.get('audit_type', 'rider')
            application_data = data.get('application_data', {})

            if not user_id:
                return JsonResponse({
                    'code': 400,
                    'msg': '缺少用户ID',
                    'data': None
                })

            user = User.objects.get(id=user_id)

            application = AuditApplication.objects.create(
                user=user,
                audit_type=audit_type,
                application_data=application_data
            )

            return JsonResponse({
                'code': 200,
                'msg': '申请提交成功',
                'data': {'application_id': application.id}
            })
        except User.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '用户不存在',
                'data': None
            })
        except json.JSONDecodeError:
            return JsonResponse({
                'code': 400,
                'msg': '请求数据格式错误',
                'data': None
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '不支持的请求方法',
        'data': None
    })


@csrf_exempt
@require_http_methods(["POST"])
def approve_application(request, application_id):
    """审核通过"""
    try:

        application = AuditApplication.objects.get(id=application_id)
        application.status = 'approved'
        application.reviewed_at = timezone.now()
        application.reviewer = request.user if request.user.is_authenticated else User.objects.first()
        application.save()

        # 如果是实名认证，更新用户状态
        if application.audit_type == 'real_name':
            profile, created = UserProfile.objects.get_or_create(user=application.user)
            profile.is_verified = True
            profile.save()

        return JsonResponse({
            'code': 200,
            'msg': '审核通过',
            'data': None
        })
    except AuditApplication.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '申请不存在',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@require_http_methods(["POST"])
def reject_application(request, application_id):
    """审核拒绝"""
    try:

        data = json.loads(request.body)
        reject_reason = data.get('reject_reason', '审核不通过')

        application = AuditApplication.objects.get(id=application_id)
        application.status = 'rejected'
        application.reject_reason = reject_reason
        application.reviewed_at = timezone.now()
        application.reviewer = request.user if request.user.is_authenticated else User.objects.first()
        application.save()

        return JsonResponse({
            'code': 200,
            'msg': '已拒绝申请',
            'data': None
        })
    except AuditApplication.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '申请不存在',
            'data': None
        })
    except json.JSONDecodeError:
        return JsonResponse({
            'code': 400,
            'msg': '请求数据格式错误',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


# 获取/保存骑手设置
@csrf_exempt
@require_http_methods(["GET", "POST"])
def rider_settings(request):
    """骑手自动接单设置"""
    if not request.user.is_authenticated:
        return JsonResponse({'code': 401, 'msg': '请先登录'})

    rider_setting, created = RiderSettings.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # 检查是否选择了多个分类
            category_ids = data.get('categories', [])
            if len(category_ids) > 1:
                # 返回警告，但允许保存
                categories = OrderCategory.objects.filter(id__in=category_ids)
                category_names = ', '.join([cat.name for cat in categories])
                warning_msg = f"您选择了多个订单分类: {category_names}。这可能会影响接单效率，确认继续吗？"
            else:
                warning_msg = None

            # 更新设置
            rider_setting.auto_grab_enabled = data.get('auto_grab_enabled', False)
            max_orders = data.get('max_orders', 20)

            # 限制上限为20
            rider_setting.max_orders_per_hour = min(max_orders, 20)
            rider_setting.max_orders_total = 20  # 内置固定上限

            # 更新分类 - 修复IDE警告
            rider_setting.categories.clear()
            if category_ids:
                categories = OrderCategory.objects.filter(id__in=category_ids)
                # 使用add()方法替代set()，避免IDE警告
                for category in categories:
                    rider_setting.categories.add(category)
                # 或者使用扩展语法：
                # rider_setting.categories.add(*categories)

            rider_setting.save()

            response = {
                'code': 100,
                'msg': '设置保存成功',
                'warning': warning_msg,
                'data': {
                    'auto_grab_enabled': rider_setting.auto_grab_enabled,
                    'max_orders': rider_setting.max_orders_per_hour,
                    'categories': list(rider_setting.categories.values('id', 'name', 'code'))
                }
            }

        except Exception as e:
            response = {'code': 400, 'msg': f'保存失败: {str(e)}'}
    else:
        # GET请求，返回当前设置
        response = {
            'code': 100,
            'msg': '成功',
            'data': {
                'auto_grab_enabled': rider_setting.auto_grab_enabled,
                'max_orders': rider_setting.max_orders_per_hour,
                'categories': list(rider_setting.categories.values('id', 'name', 'code'))
            }
        }

    return JsonResponse(response)


# 获取订单分类列表
@csrf_exempt
def order_categories(request):
    """获取订单分类列表"""
    categories = OrderCategory.objects.filter(is_active=True).values('id', 'name', 'code', 'description')
    return JsonResponse({
        'code': 100,
        'msg': '成功',
        'data': list(categories)
    })


# 自动接单接口
@csrf_exempt
@require_http_methods(["POST"])
def auto_grab_order(request):
    """骑手自动接单"""
    if not request.user.is_authenticated:
        return JsonResponse({'code': 401, 'msg': '请先登录'})

    try:
        # 获取骑手设置
        rider_setting = RiderSettings.objects.get(user=request.user)

        # 检查是否启用自动接单
        if not rider_setting.auto_grab_enabled:
            return JsonResponse({'code': 400, 'msg': '未启用自动接单功能'})

        # 检查是否设置了分类
        if not rider_setting.categories.exists():
            return JsonResponse({'code': 400, 'msg': '请先设置可接订单分类'})

        # 检查1小时内的接单数
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_grabs = RiderGrabRecord.objects.filter(
            user=request.user,
            grabbed_at__gte=one_hour_ago
        ).count()

        # 统计未完成的订单数
        incomplete_orders = RiderGrabRecord.objects.filter(
            user=request.user,
            completed=False,
            grabbed_at__gte=one_hour_ago
        ).count()

        # 如果1小时内未完成的订单已达20单，则无法接单
        if incomplete_orders >= 20:
            return JsonResponse({
                'code': 400,
                'msg': '您1小时内已有20单未完成，请等待完成或1小时后再试'
            })

        # 如果1小时内已接订单数已达上限
        if recent_grabs >= rider_setting.max_orders_per_hour:
            return JsonResponse({
                'code': 400,
                'msg': f'您1小时内已接{recent_grabs}单，已达上限'
            })

        # 使用事务确保订单不会被多个骑手同时抢到
        with transaction.atomic():
            # 获取骑手可接的分类
            category_ids = rider_setting.categories.values_list('id', flat=True)

            # 随机选择一个分类（从骑手选中的分类中）
            selected_category = random.choice(list(category_ids))

            # 查找该分类下的待接订单（使用 select_for_update 锁定）
            available_orders = Order.objects.select_for_update().filter(
                category_id=selected_category,
                status='pending'
            ).order_by('created_at')[:5]  # 取前5个，增加随机性

            if not available_orders:
                return JsonResponse({'code': 404, 'msg': '当前暂无可接订单'})

            # 随机选择一个订单
            order_to_grab = random.choice(list(available_orders))

            # 双重检查，确保订单仍然是pending状态
            if order_to_grab.status != 'pending':
                return JsonResponse({'code': 400, 'msg': '订单已被他人接单'})

            # 接单
            order_to_grab.rider = request.user
            order_to_grab.status = 'accepted'
            order_to_grab.accepted_at = datetime.now()
            order_to_grab.save()

            # 记录接单
            RiderGrabRecord.objects.create(
                user=request.user,
                order=order_to_grab
            )

        return JsonResponse({
            'code': 100,
            'msg': '接单成功',
            'data': {
                'order_id': order_to_grab.id,
                'order_no': order_to_grab.order_no,
                'category': order_to_grab.category.name,
                'price': float(order_to_grab.price)
            }
        })

    except RiderSettings.DoesNotExist:
        return JsonResponse({'code': 404, 'msg': '请先配置骑手设置'})
    except Exception as e:
        return JsonResponse({'code': 500, 'msg': f'接单失败: {str(e)}'})


# 获取骑手接单统计
@csrf_exempt
def rider_grab_stats(request):
    """获取骑手接单统计"""
    if not request.user.is_authenticated:
        return JsonResponse({'code': 401, 'msg': '请先登录'})

    one_hour_ago = datetime.now() - timedelta(hours=1)

    # 1小时内接单总数
    total_grabs = RiderGrabRecord.objects.filter(
        user=request.user,
        grabbed_at__gte=one_hour_ago
    ).count()

    # 未完成订单数
    incomplete_count = RiderGrabRecord.objects.filter(
        user=request.user,
        completed=False,
        grabbed_at__gte=one_hour_ago
    ).count()

    return JsonResponse({
        'code': 100,
        'msg': '成功',
        'data': {
            'total_grabs': total_grabs,
            'incomplete_count': incomplete_count,
            'can_grab': incomplete_count < 20
        }
    })


@csrf_exempt
def user_profile_detail(request, user_id):
    """用户资料"""
    if request.method == 'GET':
        try:
            # 获取客户端信息用于日志记录
            meta = request.META
            ip_address = meta.get('REMOTE_ADDR', 'unknown')
            user_agent = meta.get('HTTP_USER_AGENT', 'unknown')

            # 记录访问日志（实际项目中可以使用日志框架）
            print(f"User profile access - IP: {ip_address}, User-Agent: {user_agent}")

            user = User.objects.get(id=user_id)
            profile_obj, created = UserProfile.objects.get_or_create(user=user)

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'phone': profile_obj.phone,
                    'real_name': profile_obj.real_name,
                    'student_id': profile_obj.student_id,
                    'is_verified': profile_obj.is_verified,
                    'credit_score': profile_obj.credit_score,
                    'is_blacklisted': profile_obj.is_blacklisted,
                    'blacklist_reason': profile_obj.blacklist_reason,
                    'blacklist_until': profile_obj.blacklist_until,
                }
            })
        except User.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '用户不存在',
                'data': None
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '请使用GET请求',
        'data': None
    })


@csrf_exempt
def submit_real_name_auth(request):
    """提交实名认证"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            real_name = data.get('real_name')
            student_id = data.get('student_id')

            if not all([user_id, real_name, student_id]):
                return JsonResponse({
                    'code': 400,
                    'msg': '缺少必填字段',
                    'data': None
                })

            user = User.objects.get(id=user_id)
            profile_obj, created = UserProfile.objects.get_or_create(user=user)

            profile_obj.real_name = real_name
            profile_obj.student_id = student_id
            profile_obj.save()

            # 创建审核申请
            AuditApplication.objects.create(
                user=user,
                audit_type='real_name',
                application_data={
                    'real_name': real_name,
                    'student_id': student_id
                }
            )

            return JsonResponse({
                'code': 200,
                'msg': '实名认证申请已提交',
                'data': None
            })
        except User.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '用户不存在',
                'data': None
            })
        except json.JSONDecodeError:
            return JsonResponse({
                'code': 400,
                'msg': '请求数据格式错误',
                'data': None
            })
        except Exception as e:
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
def bind_phone(request):
    """绑定手机号"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            phone = data.get('phone', '')

            if not phone:
                return JsonResponse({
                    'code': 400,
                    'msg': '请填写手机号',
                    'data': None
                })

            user = User.objects.get(id=user_id)
            profile_obj, created = UserProfile.objects.get_or_create(user=user)
            profile_obj.phone = phone
            profile_obj.save()

            return JsonResponse({
                'code': 200,
                'msg': '手机号绑定成功',
                'data': None
            })
        except User.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '用户不存在',
                'data': None
            })
        except json.JSONDecodeError:
            return JsonResponse({
                'code': 400,
                'msg': '请求数据格式错误',
                'data': None
            })
        except Exception as e:
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


# ===== 钱包相关API =====

@csrf_exempt
def wallet_info(request):
    """获取钱包信息"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        # 从查询参数获取用户ID，默认为1（用于测试）
        user_id = request.GET.get('user_id', 1)
        user = User.objects.get(id=user_id)

        # 获取或创建钱包
        wallet, created = Wallet.objects.get_or_create(user=user)

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': {
                'user_id': user.id,
                'username': user.username,
                'balance': str(wallet.balance),
                'frozen_balance': str(wallet.frozen_balance),
                'total_income': str(wallet.total_income),
                'total_expenditure': str(wallet.total_expenditure)
            }
        })

    except User.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户不存在',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
def wallet_withdraw(request):
    """提现申请"""
    if request.method != 'POST':
        return JsonResponse({
            'code': 400,
            'msg': '请使用POST请求',
            'data': None
        })

    try:
        data = json.loads(request.body)
        user_id = data.get('user_id', 1)
        amount = data.get('amount')

        if not amount:
            return JsonResponse({
                'code': 400,
                'msg': '请输入提现金额',
                'data': None
            })

        user = User.objects.get(id=user_id)
        wallet = Wallet.objects.get(user=user)

        # 检查余额
        if wallet.balance < float(amount):
            return JsonResponse({
                'code': 400,
                'msg': '余额不足',
                'data': None
            })

        # 创建提现交易记录
        Transaction.objects.create(
            wallet=wallet,
            transaction_type='withdraw',
            amount=amount,
            description='用户提现',
            status='pending'
        )

        return JsonResponse({
            'code': 200,
            'msg': '提现申请已提交，等待审核',
            'data': None
        })

    except User.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户不存在',
            'data': None
        })
    except Wallet.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '钱包不存在',
            'data': None
        })
    except json.JSONDecodeError:
        return JsonResponse({
            'code': 400,
            'msg': '请求数据格式错误',
            'data': None
        })
    except ValueError:
        return JsonResponse({
            'code': 400,
            'msg': '金额格式错误',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
def wallet_transactions(request):
    """获取交易记录"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        user_id = request.GET.get('user_id', 1)
        user = User.objects.get(id=user_id)

        # 获取交易记录
        wallet = Wallet.objects.get(user=user)
        transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')

        transactions_data = []
        for trans in transactions:
            transactions_data.append({
                'id': trans.id,
                'transaction_type': trans.transaction_type,
                'amount': str(trans.amount),
                'status': trans.status,
                'description': trans.description,
                'created_at': trans.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': transactions_data
        })

    except User.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户不存在',
            'data': None
        })
    except Wallet.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '钱包不存在',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


# ===== 通知相关API =====

@csrf_exempt
def notification_list(request):
    """获取用户通知列表"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        user_id = request.GET.get('user_id', 1)
        user = User.objects.get(id=user_id)

        # 获取通知列表
        notification_qs = Notification.objects.filter(user=user).order_by('-created_at')

        notifications_data = []
        for notif in notification_qs:
            notifications_data.append({
                'id': notif.id,
                'notification_type': notif.notification_type,
                'title': notif.title,
                'content': notif.content,
                'is_read': notif.is_read,
                'created_at': notif.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': notifications_data
        })

    except User.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户不存在',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
def notification_mark_read(request, notification_id):
    """标记通知为已读"""
    if request.method != 'POST':
        return JsonResponse({
            'code': 400,
            'msg': '请使用POST请求',
            'data': None
        })

    try:
        notification = Notification.objects.get(id=notification_id)
        notification.is_read = True
        notification.save()

        return JsonResponse({
            'code': 200,
            'msg': '标记成功',
            'data': None
        })

    except Notification.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '通知不存在',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


# ===== 消息相关API =====

@csrf_exempt
def conversation_list(request):
    """获取用户会话列表"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        user_id = request.GET.get('user_id', 1)
        user = User.objects.get(id=user_id)

        # 获取用户参与的所有会话
        conversation_qs = Conversation.objects.filter(participants=user).order_by('-last_message_time')

        conversations_data = []
        for conv in conversation_qs:
            # 获取会话中的其他参与者
            other_participants = conv.participants.exclude(id=user.id)
            participant_names = ', '.join([p.username for p in other_participants])

            conversations_data.append({
                'id': conv.id,
                'participants': participant_names,
                'last_message': conv.last_message,
                'last_message_time': conv.last_message_time.strftime(
                    '%Y-%m-d %H:%M:%S') if conv.last_message_time else None
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': conversations_data
        })

    except User.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户不存在',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
def message_list(request, conversation_id):
    """获取会话中的消息列表"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        conversation = Conversation.objects.get(id=conversation_id)
        message_qs = Message.objects.filter(conversation=conversation).order_by('created_at')

        messages_data = []
        for msg in message_qs:
            messages_data.append({
                'id': msg.id,
                'sender_id': msg.sender.id,
                'sender_name': msg.sender.username,
                'content': msg.content,
                'is_read': msg.is_read,
                'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': messages_data
        })

    except Conversation.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '会话不存在',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@require_http_methods(["GET"])
def announcement_list(request):
    """获取公告列表"""
    try:
        # 只获取生效中的公告
        announcements = Announcement.objects.filter(is_active=True)
        announcements_data = []

        for announcement in announcements:
            announcements_data.append({
                'id': announcement.id,
                'announcement_type': announcement.announcement_type,
                'title': announcement.title,
                'content': announcement.content,
                'priority': announcement.priority,
                'created_at': announcement.created_at.strftime('%Y-%m-%d %H:%M'),
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': announcements_data
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@require_http_methods(["GET"])
def announcement_by_type(request, announcement_type):
    """根据类型获取公告"""
    try:
        # 获取指定类型且生效中的公告
        announcements = Announcement.objects.filter(
            announcement_type=announcement_type,
            status='active'
        ).order_by('-priority', '-created_at')

        if announcements.exists():
            announcement = announcements.first()
            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': {
                    'id': announcement.id,
                    'announcement_type': announcement.announcement_type,
                    'title': announcement.title,
                    'content': announcement.content,
                    'created_at': announcement.created_at.strftime('%Y-%m-%d %H:%M'),
                }
            })
        else:
            return JsonResponse({
                'code': 404,
                'msg': '暂无公告内容',
                'data': None
            })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def user_feedback(request):
    """用户反馈管理"""
    if request.method == 'GET':
        try:
            # 获取当前用户的反馈列表
            user_id = request.GET.get('user_id')
            if user_id:
                user = User.objects.get(id=user_id)
                feedbacks = UserFeedback.objects.filter(user=user)
            else:
                # 管理员查看所有反馈
                feedbacks = UserFeedback.objects.all()

            feedbacks_data = []
            for feedback in feedbacks:
                feedbacks_data.append({
                    'id': feedback.id,
                    'user_id': feedback.user.id if feedback.user else None,
                    'username': feedback.user.username if feedback.user else '匿名',
                    'feedback_type': feedback.feedback_type,
                    'feedback_type_display': feedback.get_feedback_type_display(),
                    'title': feedback.title,
                    'content': feedback.content,
                    'status': feedback.status,
                    'status_display': feedback.get_status_display(),
                    'reply': feedback.reply,
                    'contact': feedback.contact,
                    'created_at': feedback.created_at.strftime('%Y-%m-%d %H:%M'),
                })

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': feedbacks_data
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'获取失败: {str(e)}',
                'data': []
            })

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')

            user = User.objects.get(id=user_id) if user_id else None

            feedback = UserFeedback.objects.create(
                user=user,
                feedback_type=data.get('feedback_type', 'other'),
                title=data.get('title'),
                content=data.get('content'),
                contact=data.get('contact', '')
            )

            return JsonResponse({
                'code': 200,
                'msg': '提交成功',
                'data': {'feedback_id': feedback.id}
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'提交失败: {str(e)}',
                'data': None
            })


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def feedback_detail(request, feedback_id):
    """反馈详情管理"""
    try:
        feedback = UserFeedback.objects.get(id=feedback_id)

        if request.method == 'GET':
            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': {
                    'id': feedback.id,
                    'user_id': feedback.user.id if feedback.user else None,
                    'username': feedback.user.username if feedback.user else '匿名',
                    'feedback_type': feedback.feedback_type,
                    'title': feedback.title,
                    'content': feedback.content,
                    'contact': feedback.contact,
                    'status': feedback.status,
                    'reply': feedback.reply,
                    'created_at': feedback.created_at.strftime('%Y-%m-%d %H:%M'),
                }
            })

        elif request.method == 'PUT':
            data = json.loads(request.body)
            if 'status' in data:
                feedback.status = data['status']
            if 'admin_reply' in data:
                feedback.admin_reply = data['admin_reply']
            feedback.save()

            return JsonResponse({
                'code': 200,
                'msg': '更新成功',
                'data': None
            })

        elif request.method == 'DELETE':
            feedback.delete()
            return JsonResponse({
                'code': 200,
                'msg': '删除成功',
                'data': None
            })

    except UserFeedback.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '反馈不存在',
            'data': None
        })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'msg': f'操作失败: {str(e)}',
            'data': None
        })


@csrf_exempt
def user_logout(request):
    """用户退出登录"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')

            # 记录退出登录日志
            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                    UserProfile.objects.filter(user=user).update(
                        last_logout_time=timezone.now()
                    )
                    print(f'用户退出登录: {user.username}')
                except User.DoesNotExist:
                    pass

            return JsonResponse({
                'code': 200,
                'msg': '退出成功',
                'data': None
            })
        except Exception as e:
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
def user_login_log(request):
    """记录用户访问日志"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            action = data.get('action', 'visit')
            page = data.get('page', '')

            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                    profile = UserProfile.objects.get(user=user)

                    # 更新最后访问时间
                    profile.last_login_time = timezone.now()
                    profile.save()

                    print(f'用户访问日志 - 用户ID: {user_id}, 操作: {action}, 页面: {page}')

                except (User.DoesNotExist, UserProfile.DoesNotExist) as e:
                    print(f'记录日志失败: {str(e)}')

            return JsonResponse({
                'code': 200,
                'msg': '记录成功',
                'data': None
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 200,
        'msg': '记录成功',
        'data': None
    })


@csrf_exempt
def get_user_list(request):
    """获取用户列表（管理员）"""
    if request.method == 'GET':
        try:
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            search = request.GET.get('search', '')

            # 构建查询
            query = UserProfile.objects.select_related('user').all()

            if search:
                query = query.filter(
                    Q(user__username__icontains=search) |
                    Q(phone__icontains=search) |
                    Q(real_name__icontains=search)
                )

            # 分页
            total = query.count()
            offset = (page - 1) * page_size
            user_list = query[offset:offset + page_size]

            # 构建返回数据
            users = []
            for profile in user_list:
                users.append({
                    'id': profile.user.id,
                    'username': profile.user.username,
                    'nickname': profile.real_name,
                    'phone': profile.phone,
                    'student_id': profile.student_id,
                    'is_verified': profile.is_verified,
                    'credit_score': profile.credit_score,
                    'is_blacklisted': profile.is_blacklisted,
                    'last_login': profile.last_login_time.strftime(
                        '%Y-%m-%d %H:%M:%S') if profile.last_login_time else '',
                    'created_at': profile.user.date_joined.strftime('%Y-%m-%d %H:%M:%S')
                })

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': {
                    'users': users,
                    'total': total,
                    'page': page,
                    'page_size': page_size
                }
            })
        except Exception as e:
            return JsonResponse({
                'code': 500,
                'msg': f'服务器错误: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '请使用GET请求',
        'data': None
    })


@csrf_exempt
def simple_login(request):
    """简单登录接口 - 测试用"""
    return JsonResponse({
        'code': 200,
        'msg': '登录成功（测试）',
        'data': {
            'user': {
                'id': 1,
                'username': 'test_user',
                'nickname': '测试用户'
            },
            'token': 'test_token_simple_login'
        }
    })


@csrf_exempt
def upload_avatar(request):
    """上传用户头像"""
    if request.method == 'POST':
        try:
            user_id = request.POST.get('user_id')
            avatar_file = request.FILES.get('avatar')

            if not user_id or not avatar_file:
                return JsonResponse({
                    'code': 400,
                    'msg': '缺少必要参数',
                    'data': None
                })

            # 获取用户
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return JsonResponse({
                    'code': 404,
                    'msg': '用户不存在',
                    'data': None
                })

            # 保存图片
            import os
            from django.conf import settings

            # 创建存储目录
            avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
            os.makedirs(avatar_dir, exist_ok=True)

            # 生成文件名
            file_extension = avatar_file.name.split('.')[-1]
            filename = f"avatar_{user.id}_{int(time.time())}.{file_extension}"
            file_path = os.path.join(avatar_dir, filename)

            # 保存文件
            try:
                with open(file_path, 'wb+') as destination:
                    for chunk in avatar_file.chunks():
                        destination.write(chunk)
            except Exception as e:
                logger.error(f'保存文件失败: {str(e)}')
                return JsonResponse({
                    'code': 500,
                    'msg': f'保存文件失败: {str(e)}',
                    'data': None
                })

            # 更新用户头像URL
            avatar_url = f"{settings.MEDIA_URL}avatars/{filename}"

            # 保存到用户信息
            profile_obj, created = UserProfile.objects.get_or_create(user=user)
            profile_obj.avatar_url = avatar_url
            profile_obj.save()

            return JsonResponse({
                'code': 200,
                'msg': '上传成功',
                'data': {
                    'avatar_url': avatar_url
                }
            })

        except Exception as e:
            logger.error(f'头像上传失败: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'上传失败: {str(e)}',
                'data': None
            })

    # 确保所有路径都有返回
    return JsonResponse({
        'code': 400,
        'msg': '请使用POST请求',
        'data': None
    })