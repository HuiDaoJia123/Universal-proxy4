# backend/api/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db.models import Q , Sum
from datetime import datetime, timedelta
from .decorators import api_login_required
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
    """登录接口 - 使用正确的微信登录流程"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            login_type = data.get('login_type', 'normal')

            if login_type == 'wechat':
                # 微信一键登录
                wx_code = data.get('code')  # wx.login() 获取的code
                phone_code = data.get('phone_code')  # 手机号授权码
                user_info = data.get('userInfo', {})

                # 开发环境：模拟登录
                dev_phone = data.get('dev_phone')
                if dev_phone:
                    logger.info(f'开发环境模拟登录，手机号: {dev_phone}')

                    # 模拟 openid
                    mock_openid = f"dev_openid_{dev_phone}_{int(time.time())}"

                    try:
                        profile_obj = UserProfile.objects.get(openid=mock_openid)
                        user = profile_obj.user
                        logger.info(f'用户已存在: {user.id}')
                    except UserProfile.DoesNotExist:
                        user = User.objects.create_user(
                            username=f"dev_{dev_phone}",
                            password=None
                        )
                        profile_obj = UserProfile.objects.create(
                            user=user,
                            openid=mock_openid,  # 保存 openid
                            phone=dev_phone,
                            real_name=user_info.get('nickName', '开发用户'),
                            avatar_url=user_info.get('avatarUrl', '/media/default-avatar.png')
                        )
                        logger.info(f'创建新用户: {user.id}')

                    token_str = f"{user.id}_{int(time.time())}_{mock_openid}"
                    token = hashlib.md5(token_str.encode()).hexdigest()

                    return JsonResponse({
                        'code': 200,
                        'msg': '登录成功',
                        'data': {
                            'user': {
                                'id': user.id,
                                'username': user.username,
                                'nickname': profile_obj.real_name,
                                'phone': profile_obj.phone or '',
                                'avatar_url': profile_obj.avatar_url,
                                'country_code': '86'
                            },
                            'token': token,
                            'openid': mock_openid
                        }
                    })

                # 真机环境：使用微信 code 换取 openid
                if not wx_code:
                    return JsonResponse({
                        'code': 400,
                        'msg': '缺少微信登录凭证',
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

                # 1. 使用 wx.code 换取 openid（这才是正确的微信登录）
                jscode2session_url = f"https://api.weixin.qq.com/sns/jscode2session?appid={appid}&secret={appsecret}&js_code={wx_code}&grant_type=authorization_code"

                try:
                    code_response = requests.get(jscode2session_url, timeout=10)
                    code_data = code_response.json()

                    if 'errcode' in code_data:
                        logger.error(f"获取openid失败: {code_data}")
                        return JsonResponse({
                            'code': 500,
                            'msg': f'获取openid失败: {code_data.get("errmsg")}',
                            'data': None
                        })

                    openid = code_data.get('openid')
                    session_key = code_data.get('session_key')

                    if not openid:
                        logger.error('无法获取openid')
                        return JsonResponse({
                            'code': 500,
                            'msg': '无法获取openid',
                            'data': None
                        })

                    logger.info(f'获取openid成功: {openid[:10]}...')

                except Exception as e:
                    logger.error(f"请求微信接口失败: {str(e)}")
                    return JsonResponse({
                        'code': 500,
                        'msg': f'请求微信接口失败: {str(e)}',
                        'data': None
                    })

                # 2. 获取手机号（如果需要）
                pure_phone = ''
                country_code = '86'

                if phone_code:
                    # 获取 access_token
                    token_url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={appsecret}"
                    token_response = requests.get(token_url, timeout=10)
                    token_data = token_response.json()

                    if 'errcode' not in token_data:
                        access_token = token_data.get('access_token')

                        # 使用 access_token 获取手机号
                        phone_url = f"https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token={access_token}"
                        phone_response = requests.post(phone_url, json={'code': phone_code}, timeout=10)
                        phone_data = phone_response.json()

                        if phone_data.get('errcode') == 0:
                            phone_info = phone_data.get('phone_info', {})
                            pure_phone = phone_info.get('purePhoneNumber', '')
                            country_code = phone_info.get('countryCode', '86')
                            logger.info(f'获取手机号成功: {pure_phone}')

                # 3. 使用 openid 查找或创建用户
                try:
                    profile_obj = UserProfile.objects.get(openid=openid)
                    user = profile_obj.user

                    # 更新手机号（如果之前没有绑定）
                    if pure_phone and not profile_obj.phone:
                        profile_obj.phone = pure_phone
                        profile_obj.save()

                    logger.info(f'用户已存在，登录: {user.id}')
                except UserProfile.DoesNotExist:
                    # 创建新用户（使用 openid 作为唯一标识）
                    user = User.objects.create_user(
                        username=f"wx_{openid[:10]}",
                        password=None
                    )
                    logger.info(f'创建新User: {user.id}')

                    profile_obj = UserProfile.objects.create(
                        user=user,
                        openid=openid,  # 保存 openid
                        phone=pure_phone,
                        real_name=user_info.get('nickName', '微信用户'),
                        avatar_url=user_info.get('avatarUrl', '/media/default-avatar.png')
                    )
                    logger.info(f'创建新UserProfile: {profile_obj.id}')

                # 4. 生成 token
                token_str = f"{user.id}_{int(time.time())}_{openid}"
                token = hashlib.md5(token_str.encode()).hexdigest()

                return JsonResponse({
                    'code': 200,
                    'msg': '登录成功',
                    'data': {
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'nickname': profile_obj.real_name,
                            'phone': profile_obj.phone or '',
                            'avatar_url': profile_obj.avatar_url,
                            'country_code': country_code
                        },
                        'token': token,
                        'openid': openid
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
@api_login_required
def get_user_info(request):
    """获取用户信息 - 需要登录"""
    user_id = request.GET.get('user_id') or request.GET.get('userId')

    if request.method == 'GET':
        try:
            if not user_id:
                # 如果未提供user_id，则返回当前登录用户的信息
                user = request.user
            else:
                # 获取指定用户信息（需要权限检查）
                user = User.objects.get(id=user_id)

                # 检查权限：只能查看自己的信息或管理员可以查看所有
                if user.id != request.user.id and not request.user.is_staff:
                    return JsonResponse({
                        'code': 403,
                        'msg': '权限不足',
                        'data': None
                    }, status=403)

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
                        '%Y-%m-%d %H:%M:%S') if profile.last_login_time else '',
                    'avatar_url': profile.avatar_url,
                    'gender': profile.gender,
                    'school': profile.school,
                    'college': profile.college,
                    'major': profile.major
                })

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': user_data
            })

        except User.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '用户不存在',
                'data': None
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
@api_login_required
def update_user_info(request, user_id=None):
    """更新用户信息 - 需要登录"""
    if request.method == 'PUT':
        try:
            # 确保只能更新自己的信息，除非是管理员
            if user_id:
                target_user = User.objects.get(id=user_id)
                if target_user.id != request.user.id and not request.user.is_staff:
                    return JsonResponse({
                        'code': 403,
                        'msg': '权限不足',
                        'data': None
                    }, status=403)
                user = target_user
            else:
                user = request.user

            # 获取用户资料
            profile_obj, created = UserProfile.objects.get_or_create(user=user)

            # 解析请求数据
            data = json.loads(request.body)

            # 更新用户信息
            if 'avatar_url' in data:
                profile_obj.avatar_url = data.get('avatar_url')
            if 'real_name' in data:
                profile_obj.real_name = data.get('real_name')
            if 'phone' in data:
                profile_obj.phone = data.get('phone')
            if 'student_id' in data:
                profile_obj.student_id = data.get('student_id')
            if 'gender' in data:
                profile_obj.gender = data.get('gender')
            if 'school' in data:
                profile_obj.school = data.get('school', '')
            if 'college' in data:
                profile_obj.college = data.get('college', '')
            if 'major' in data:
                profile_obj.major = data.get('major', '')

            # 保存
            profile_obj.save()

            logger.info(f'用户信息更新成功: user_id={user.id}')

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
        except json.JSONDecodeError:
            return JsonResponse({
                'code': 400,
                'msg': '请求数据格式错误',
                'data': None
            })
        except Exception as e:
            logger.error(f'更新用户信息失败: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'更新失败: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '请使用PUT请求',
        'data': None
    })


@csrf_exempt
@api_login_required
@require_http_methods(["GET", "POST"])
def blacklist_users(request):
    """黑名单用户管理 - 需要管理员权限"""
    # 检查管理员权限
    if not request.user.is_staff:
        return JsonResponse({
            'code': 403,
            'msg': '权限不足',
            'data': None
        }, status=403)

    if request.method == 'GET':
        try:
            blacklisted_profiles = UserProfile.objects.filter(is_blacklisted=True)
            users_data = []

            for profile in blacklisted_profiles:
                users_data.append({
                    'id': profile.user.id,
                    'username': profile.user.username,
                    'real_name': profile.real_name,
                    'phone': profile.phone,
                    'reason': profile.blacklist_reason,
                    'blacklist_until': profile.blacklist_until.strftime(
                        '%Y-%m-%d %H:%M:%S') if profile.blacklist_until else None,
                    'added_at': profile.blacklisted_at.strftime('%Y-%m-%d %H:%M:%S') if profile.blacklisted_at else None
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
            days = data.get('days', 30)  # 默认封禁30天

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
            profile.blacklist_until = timezone.now() + timedelta(days=days)
            profile.blacklisted_at = timezone.now()
            profile.save()

            BlacklistRecord.objects.create(
                user=user,
                reason=reason,
                operator=request.user,
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
@api_login_required
@require_http_methods(["GET", "POST"])
def audit_applications(request):
    """审核申请管理 - 需要管理员权限"""
    # 检查管理员权限
    if not request.user.is_staff:
        return JsonResponse({
            'code': 403,
            'msg': '权限不足',
            'data': None
        }, status=403)

    if request.method == 'GET':
        try:
            status = request.GET.get('status', 'pending')
            if status == 'all':
                applications = AuditApplication.objects.all().order_by('-created_at')
            else:
                applications = AuditApplication.objects.filter(status=status).order_by('-created_at')

            applications_data = []

            for app in applications:
                applications_data.append({
                    'id': app.id,
                    'user_id': app.user.id,
                    'username': app.user.username,
                    'real_name': app.user.userprofile.real_name if hasattr(app.user, 'userprofile') else '',
                    'audit_type': app.audit_type,
                    'audit_type_display': app.get_audit_type_display(),
                    'application_data': app.application_data,
                    'status': app.status,
                    'status_display': app.get_status_display(),
                    'reject_reason': app.reject_reason,
                    'created_at': app.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'reviewed_at': app.reviewed_at.strftime('%Y-%m-%d %H:%M:%S') if app.reviewed_at else None,
                    'reviewer': app.reviewer.username if app.reviewer else None
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

            # 检查是否已有相同类型的待审核申请
            existing_application = AuditApplication.objects.filter(
                user=user,
                audit_type=audit_type,
                status='pending'
            ).first()

            if existing_application:
                return JsonResponse({
                    'code': 400,
                    'msg': '您已提交过该类型的申请，请等待审核结果',
                    'data': None
                })

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
@api_login_required
@require_http_methods(["POST"])
def approve_application(request, application_id):
    """审核通过 - 需要管理员权限"""
    # 检查管理员权限
    if not request.user.is_staff:
        return JsonResponse({
            'code': 403,
            'msg': '权限不足',
            'data': None
        }, status=403)

    try:
        application = AuditApplication.objects.get(id=application_id)

        if application.status != 'pending':
            return JsonResponse({
                'code': 400,
                'msg': '该申请已被处理',
                'data': None
            })

        application.status = 'approved'
        application.reviewed_at = timezone.now()
        application.reviewer = request.user
        application.save()

        # 根据审核类型执行相应操作
        if application.audit_type == 'real_name':
            # 实名认证通过
            profile, created = UserProfile.objects.get_or_create(user=application.user)
            profile.is_verified = True
            profile.save()

            # 发送通知给用户
            Notification.objects.create(
                user=application.user,
                notification_type='system',
                title='实名认证通过',
                content='您的实名认证申请已通过审核。'
            )
        elif application.audit_type == 'rider':
            # 骑手认证通过
            profile, created = UserProfile.objects.get_or_create(user=application.user)
            profile.is_rider = True
            profile.save()

            # 发送通知给用户
            Notification.objects.create(
                user=application.user,
                notification_type='system',
                title='骑手认证通过',
                content='恭喜！您的骑手认证申请已通过审核，现在可以接单了。'
            )

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
@api_login_required
@require_http_methods(["POST"])
def reject_application(request, application_id):
    """审核拒绝 - 需要管理员权限"""
    # 检查管理员权限
    if not request.user.is_staff:
        return JsonResponse({
            'code': 403,
            'msg': '权限不足',
            'data': None
        }, status=403)

    try:
        data = json.loads(request.body)
        reject_reason = data.get('reject_reason', '审核不通过')

        application = AuditApplication.objects.get(id=application_id)

        if application.status != 'pending':
            return JsonResponse({
                'code': 400,
                'msg': '该申请已被处理',
                'data': None
            })

        application.status = 'rejected'
        application.reject_reason = reject_reason
        application.reviewed_at = timezone.now()
        application.reviewer = request.user
        application.save()

        # 发送拒绝通知给用户
        Notification.objects.create(
            user=application.user,
            notification_type='system',
            title='申请未通过',
            content=f'您的{application.get_audit_type_display()}申请未通过审核。原因：{reject_reason}'
        )

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
@api_login_required
@require_http_methods(["GET", "POST"])
def rider_settings(request):
    """骑手自动接单设置 - 需要登录"""
    # 检查用户是否是骑手
    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_rider:
            return JsonResponse({
                'code': 403,
                'msg': '您还不是骑手，请先申请骑手认证',
                'data': None
            }, status=403)
    except UserProfile.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户资料不存在',
            'data': None
        })

    rider_setting, created = RiderSettings.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # 检查是否选择了多个分类
            category_ids = data.get('categories', [])
            if len(category_ids) > 1:
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

            # 更新分类
            rider_setting.categories.clear()
            if category_ids:
                categories = OrderCategory.objects.filter(id__in=category_ids)
                rider_setting.categories.set(categories)

            rider_setting.save()

            response = {
                'code': 200,
                'msg': '设置保存成功',
                'warning': warning_msg,
                'data': {
                    'auto_grab_enabled': rider_setting.auto_grab_enabled,
                    'max_orders': rider_setting.max_orders_per_hour,
                    'categories': list(rider_setting.categories.values('id', 'name', 'code'))
                }
            }

        except Exception as e:
            logger.error(f'保存骑手设置失败: {str(e)}')
            response = {'code': 500, 'msg': f'保存失败: {str(e)}'}
    else:
        # GET请求，返回当前设置
        response = {
            'code': 200,
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
        'code': 200,
        'msg': '成功',
        'data': list(categories)
    })


# 自动接单接口
@csrf_exempt
@api_login_required
@require_http_methods(["POST"])
def auto_grab_order(request):
    """骑手自动接单 - 需要登录"""
    # 检查用户是否是骑手
    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_rider:
            return JsonResponse({
                'code': 403,
                'msg': '您还不是骑手，请先申请骑手认证',
                'data': None
            }, status=403)
    except UserProfile.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户资料不存在',
            'data': None
        })

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

            # 发送通知给下单用户
            Notification.objects.create(
                user=order_to_grab.customer,
                notification_type='order',
                title='订单已被接单',
                content=f'您的订单{order_to_grab.order_no}已被骑手接单，骑手将很快与您联系。'
            )

        return JsonResponse({
            'code': 200,
            'msg': '接单成功',
            'data': {
                'order_id': order_to_grab.id,
                'order_no': order_to_grab.order_no,
                'category': order_to_grab.category.name,
                'price': float(order_to_grab.price),
                'customer': {
                    'id': order_to_grab.customer.id,
                    'username': order_to_grab.customer.username,
                    'phone': order_to_grab.customer.userprofile.phone if hasattr(order_to_grab.customer,
                                                                                 'userprofile') else ''
                }
            }
        })

    except RiderSettings.DoesNotExist:
        return JsonResponse({'code': 404, 'msg': '请先配置骑手设置'})
    except Exception as e:
        logger.error(f'自动接单失败: {str(e)}')
        return JsonResponse({'code': 500, 'msg': f'接单失败: {str(e)}'})


# 获取骑手接单统计
@csrf_exempt
@api_login_required
def rider_grab_stats(request):
    """获取骑手接单统计 - 需要登录"""
    # 检查用户是否是骑手
    try:
        profile = UserProfile.objects.get(user=request.user)
        if not profile.is_rider:
            return JsonResponse({
                'code': 403,
                'msg': '您还不是骑手，请先申请骑手认证',
                'data': None
            }, status=403)
    except UserProfile.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户资料不存在',
            'data': None
        })

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

    # 今日总接单数
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_grabs = RiderGrabRecord.objects.filter(
        user=request.user,
        grabbed_at__gte=today_start
    ).count()

    return JsonResponse({
        'code': 200,
        'msg': '成功',
        'data': {
            'total_grabs': total_grabs,
            'incomplete_count': incomplete_count,
            'today_grabs': today_grabs,
            'can_grab': incomplete_count < 20,
            'max_orders': 20
        }
    })


@csrf_exempt
@api_login_required
def user_profile_detail(request, user_id=None):
    """用户资料 - 需要登录"""
    if request.method == 'GET':
        try:
            # 如果未指定user_id，则返回当前用户信息
            if not user_id:
                target_user = request.user
            else:
                target_user = User.objects.get(id=user_id)

                # 检查权限：只能查看自己的信息或管理员可以查看所有
                if target_user.id != request.user.id and not request.user.is_staff:
                    return JsonResponse({
                        'code': 403,
                        'msg': '权限不足',
                        'data': None
                    }, status=403)

            # 获取客户端信息用于日志记录
            meta = request.META
            ip_address = meta.get('REMOTE_ADDR', 'unknown')
            user_agent = meta.get('HTTP_USER_AGENT', 'unknown')

            # 记录访问日志
            logger.info(f"User profile access - User: {target_user.username}, IP: {ip_address}")

            profile_obj, created = UserProfile.objects.get_or_create(user=target_user)

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': {
                    'id': target_user.id,
                    'username': target_user.username,
                    'email': target_user.email,
                    'phone': profile_obj.phone,
                    'real_name': profile_obj.real_name,
                    'student_id': profile_obj.student_id,
                    'is_verified': profile_obj.is_verified,
                    'credit_score': profile_obj.credit_score,
                    'is_blacklisted': profile_obj.is_blacklisted,
                    'blacklist_reason': profile_obj.blacklist_reason,
                    'blacklist_until': profile_obj.blacklist_until.strftime(
                        '%Y-%m-%d %H:%M:%S') if profile_obj.blacklist_until else None,
                    'avatar_url': profile_obj.avatar_url,
                    'gender': profile_obj.gender,
                    'school': profile_obj.school,
                    'college': profile_obj.college,
                    'major': profile_obj.major,
                    'is_rider': profile_obj.is_rider,
                    'created_at': target_user.date_joined.strftime('%Y-%m-%d %H:%M:%S'),
                    'last_login': profile_obj.last_login_time.strftime(
                        '%Y-%m-%d %H:%M:%S') if profile_obj.last_login_time else None
                }
            })
        except User.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '用户不存在',
                'data': None
            })
        except Exception as e:
            logger.error(f'获取用户资料失败: {str(e)}')
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
@api_login_required
def submit_real_name_auth(request):
    """提交实名认证 - 需要登录"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            real_name = data.get('real_name')
            student_id = data.get('student_id')
            id_card_front = data.get('id_card_front', '')
            id_card_back = data.get('id_card_back', '')

            if not all([real_name, student_id]):
                return JsonResponse({
                    'code': 400,
                    'msg': '缺少必填字段',
                    'data': None
                })

            user = request.user
            profile_obj, created = UserProfile.objects.get_or_create(user=user)

            # 检查是否已通过实名认证
            if profile_obj.is_verified:
                return JsonResponse({
                    'code': 400,
                    'msg': '您已完成实名认证',
                    'data': None
                })

            # 检查是否已有待审核的实名认证申请
            pending_application = AuditApplication.objects.filter(
                user=user,
                audit_type='real_name',
                status='pending'
            ).first()

            if pending_application:
                return JsonResponse({
                    'code': 400,
                    'msg': '您已提交过实名认证申请，请等待审核结果',
                    'data': None
                })

            # 更新用户资料（不立即生效，等待审核）
            profile_obj.real_name = real_name
            profile_obj.student_id = student_id
            profile_obj.save()

            # 创建审核申请
            application = AuditApplication.objects.create(
                user=user,
                audit_type='real_name',
                application_data={
                    'real_name': real_name,
                    'student_id': student_id,
                    'id_card_front': id_card_front,
                    'id_card_back': id_card_back
                }
            )

            # 发送通知给管理员
            admin_users = User.objects.filter(is_staff=True)
            for admin in admin_users:
                Notification.objects.create(
                    user=admin,
                    notification_type='system',
                    title='新的实名认证申请',
                    content=f'用户{user.username}提交了实名认证申请，请及时审核。'
                )

            return JsonResponse({
                'code': 200,
                'msg': '实名认证申请已提交，请等待审核',
                'data': {
                    'application_id': application.id
                }
            })
        except json.JSONDecodeError:
            return JsonResponse({
                'code': 400,
                'msg': '请求数据格式错误',
                'data': None
            })
        except Exception as e:
            logger.error(f'提交实名认证失败: {str(e)}')
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
@api_login_required
def bind_phone(request):
    """绑定手机号 - 需要登录"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            phone = data.get('phone', '')
            verify_code = data.get('verify_code', '')

            if not phone:
                return JsonResponse({
                    'code': 400,
                    'msg': '请填写手机号',
                    'data': None
                })

            # 在实际项目中，这里需要验证短信验证码
            # if not verify_phone_code(phone, verify_code):
            #     return JsonResponse({
            #         'code': 400,
            #         'msg': '验证码错误',
            #         'data': None
            #     })

            user = request.user
            profile_obj, created = UserProfile.objects.get_or_create(user=user)

            # 检查手机号是否已被其他用户绑定
            if UserProfile.objects.filter(phone=phone).exclude(user=user).exists():
                return JsonResponse({
                    'code': 400,
                    'msg': '该手机号已被其他用户绑定',
                    'data': None
                })

            profile_obj.phone = phone
            profile_obj.save()

            return JsonResponse({
                'code': 200,
                'msg': '手机号绑定成功',
                'data': None
            })
        except json.JSONDecodeError:
            return JsonResponse({
                'code': 400,
                'msg': '请求数据格式错误',
                'data': None
            })
        except Exception as e:
            logger.error(f'绑定手机号失败: {str(e)}')
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
@api_login_required
def wallet_info(request):
    """获取钱包信息 - 需要登录"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        user = request.user

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
                'total_expenditure': str(wallet.total_expenditure),
                'created_at': wallet.created_at.strftime('%Y-%m-%d %H:%M:%S') if wallet.created_at else None
            }
        })

    except Exception as e:
        logger.error(f'获取钱包信息失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@api_login_required
def wallet_withdraw(request):
    """提现申请 - 需要登录"""
    if request.method != 'POST':
        return JsonResponse({
            'code': 400,
            'msg': '请使用POST请求',
            'data': None
        })

    try:
        data = json.loads(request.body)
        amount = data.get('amount')
        withdraw_type = data.get('withdraw_type', 'wechat')
        account_info = data.get('account_info', {})

        if not amount:
            return JsonResponse({
                'code': 400,
                'msg': '请输入提现金额',
                'data': None
            })

        try:
            amount_float = float(amount)
            if amount_float <= 0:
                return JsonResponse({
                    'code': 400,
                    'msg': '提现金额必须大于0',
                    'data': None
                })
        except ValueError:
            return JsonResponse({
                'code': 400,
                'msg': '金额格式错误',
                'data': None
            })

        user = request.user
        wallet = Wallet.objects.get(user=user)

        # 检查余额
        if wallet.balance < amount_float:
            return JsonResponse({
                'code': 400,
                'msg': '余额不足',
                'data': None
            })

        # 检查最小提现金额（示例：10元）
        if amount_float < 10:
            return JsonResponse({
                'code': 400,
                'msg': '最小提现金额为10元',
                'data': None
            })

        # 创建提现交易记录
        transaction = Transaction.objects.create(
            wallet=wallet,
            transaction_type='withdraw',
            amount=amount_float,
            description=f'{withdraw_type}提现申请',
            status='pending',
            metadata={
                'withdraw_type': withdraw_type,
                'account_info': account_info
            }
        )

        # 冻结相应金额
        wallet.balance -= amount_float
        wallet.frozen_balance += amount_float
        wallet.save()

        # 发送通知给管理员
        admin_users = User.objects.filter(is_staff=True)
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                notification_type='system',
                title='新的提现申请',
                content=f'用户{user.username}申请提现{amount_float}元，请及时处理。'
            )

        return JsonResponse({
            'code': 200,
            'msg': '提现申请已提交，等待审核',
            'data': {
                'transaction_id': transaction.id,
                'amount': str(amount_float),
                'status': 'pending'
            }
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
    except Exception as e:
        logger.error(f'提现申请失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@api_login_required
def wallet_transactions(request):
    """获取交易记录 - 需要登录"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        user = request.user

        # 分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        transaction_type = request.GET.get('type', '')

        # 获取交易记录
        wallet = Wallet.objects.get(user=user)
        transactions_qs = Transaction.objects.filter(wallet=wallet)

        # 按类型筛选
        if transaction_type:
            transactions_qs = transactions_qs.filter(transaction_type=transaction_type)

        # 排序和分页
        total = transactions_qs.count()
        transactions_qs = transactions_qs.order_by('-created_at')
        offset = (page - 1) * page_size
        transactions = transactions_qs[offset:offset + page_size]

        transactions_data = []
        for trans in transactions:
            transactions_data.append({
                'id': trans.id,
                'transaction_type': trans.transaction_type,
                'transaction_type_display': trans.get_transaction_type_display(),
                'amount': str(trans.amount),
                'status': trans.status,
                'status_display': trans.get_status_display(),
                'description': trans.description,
                'metadata': trans.metadata,
                'created_at': trans.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'completed_at': trans.completed_at.strftime('%Y-%m-%d %H:%M:%S') if trans.completed_at else None
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': {
                'transactions': transactions_data,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        })

    except Wallet.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '钱包不存在',
            'data': None
        })
    except Exception as e:
        logger.error(f'获取交易记录失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


# ===== 通知相关API =====

@csrf_exempt
@api_login_required
def notification_list(request):
    """获取用户通知列表 - 需要登录"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        user = request.user

        # 分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        unread_only = request.GET.get('unread_only', 'false').lower() == 'true'
        notification_type = request.GET.get('type', '')

        # 获取通知列表
        notification_qs = Notification.objects.filter(user=user)

        # 筛选
        if unread_only:
            notification_qs = notification_qs.filter(is_read=False)
        if notification_type:
            notification_qs = notification_qs.filter(notification_type=notification_type)

        # 排序和分页
        total = notification_qs.count()
        notification_qs = notification_qs.order_by('-created_at')
        offset = (page - 1) * page_size
        notifications = notification_qs[offset:offset + page_size]

        notifications_data = []
        for notif in notifications:
            notifications_data.append({
                'id': notif.id,
                'notification_type': notif.notification_type,
                'notification_type_display': notif.get_notification_type_display(),
                'title': notif.title,
                'content': notif.content,
                'is_read': notif.is_read,
                'metadata': notif.metadata,
                'created_at': notif.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'read_at': notif.read_at.strftime('%Y-%m-%d %H:%M:%S') if notif.read_at else None
            })

        # 获取未读通知数量
        unread_count = Notification.objects.filter(user=user, is_read=False).count()

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': {
                'notifications': notifications_data,
                'total': total,
                'unread_count': unread_count,
                'page': page,
                'page_size': page_size
            }
        })

    except Exception as e:
        logger.error(f'获取通知列表失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@api_login_required
def notification_mark_read(request, notification_id=None):
    """标记通知为已读 - 需要登录"""
    if request.method == 'POST':
        try:
            if notification_id:
                # 标记单个通知为已读
                notification = Notification.objects.get(id=notification_id, user=request.user)
                notification.is_read = True
                notification.read_at = timezone.now()
                notification.save()
                message = '标记成功'
            else:
                # 标记所有通知为已读
                Notification.objects.filter(user=request.user, is_read=False).update(
                    is_read=True,
                    read_at=timezone.now()
                )
                message = '全部标记为已读成功'

            return JsonResponse({
                'code': 200,
                'msg': message,
                'data': None
            })

        except Notification.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'msg': '通知不存在',
                'data': None
            })
        except Exception as e:
            logger.error(f'标记通知失败: {str(e)}')
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


# ===== 消息相关API =====

@csrf_exempt
@api_login_required
def conversation_list(request):
    """获取用户会话列表 - 需要登录"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        user = request.user

        # 获取用户参与的所有会话
        conversation_qs = Conversation.objects.filter(participants=user).order_by('-last_message_time')

        conversations_data = []
        for conv in conversation_qs:
            # 获取会话中的其他参与者
            other_participants = conv.participants.exclude(id=user.id)
            participants_data = []

            for participant in other_participants:
                try:
                    profile = UserProfile.objects.get(user=participant)
                    participants_data.append({
                        'id': participant.id,
                        'username': participant.username,
                        'real_name': profile.real_name,
                        'avatar_url': profile.avatar_url,
                        'is_online': profile.is_online
                    })
                except UserProfile.DoesNotExist:
                    participants_data.append({
                        'id': participant.id,
                        'username': participant.username,
                        'real_name': '',
                        'avatar_url': '',
                        'is_online': False
                    })

            conversations_data.append({
                'id': conv.id,
                'participants': participants_data,
                'last_message': conv.last_message,
                'last_message_time': conv.last_message_time.strftime(
                    '%Y-%m-%d %H:%M:%S') if conv.last_message_time else None,
                'unread_count': conv.unread_count,
                'created_at': conv.created_at.strftime('%Y-%m-%d %H:%M:%S') if conv.created_at else None
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': conversations_data
        })

    except Exception as e:
        logger.error(f'获取会话列表失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@api_login_required
def message_list(request, conversation_id):
    """获取会话中的消息列表 - 需要登录"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        # 检查用户是否在会话中
        conversation = Conversation.objects.get(id=conversation_id)
        if request.user not in conversation.participants.all():
            return JsonResponse({
                'code': 403,
                'msg': '无权访问该会话',
                'data': None
            }, status=403)

        # 分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 50))

        # 获取消息列表
        message_qs = Message.objects.filter(conversation=conversation)

        # 排序和分页
        total = message_qs.count()
        message_qs = message_qs.order_by('-created_at')
        offset = (page - 1) * page_size
        messages = message_qs[offset:offset + page_size]

        messages_data = []
        for msg in messages:
            # 标记自己发送的消息为已读
            if msg.sender != request.user and not msg.is_read:
                msg.is_read = True
                msg.save()

            messages_data.append({
                'id': msg.id,
                'sender_id': msg.sender.id,
                'sender_name': msg.sender.username,
                'sender_avatar': msg.sender.userprofile.avatar_url if hasattr(msg.sender, 'userprofile') else '',
                'content': msg.content,
                'message_type': msg.message_type,
                'is_read': msg.is_read,
                'metadata': msg.metadata,
                'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        # 反转列表，使最新的消息在最后
        messages_data.reverse()

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': {
                'messages': messages_data,
                'total': total,
                'page': page,
                'page_size': page_size,
                'conversation_id': conversation_id
            }
        })

    except Conversation.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '会话不存在',
            'data': None
        })
    except Exception as e:
        logger.error(f'获取消息列表失败: {str(e)}')
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
        # 分页参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        announcement_type = request.GET.get('type', '')

        # 只获取生效中的公告
        announcements_qs = Announcement.objects.filter(is_active=True)

        # 按类型筛选
        if announcement_type:
            announcements_qs = announcements_qs.filter(announcement_type=announcement_type)

        # 排序和分页
        total = announcements_qs.count()
        announcements_qs = announcements_qs.order_by('-priority', '-created_at')
        offset = (page - 1) * page_size
        announcements = announcements_qs[offset:offset + page_size]

        announcements_data = []
        for announcement in announcements:
            announcements_data.append({
                'id': announcement.id,
                'announcement_type': announcement.announcement_type,
                'announcement_type_display': announcement.get_announcement_type_display(),
                'title': announcement.title,
                'content': announcement.content,
                'priority': announcement.priority,
                'cover_image': announcement.cover_image,
                'is_active': announcement.is_active,
                'created_at': announcement.created_at.strftime('%Y-%m-%d %H:%M'),
                'updated_at': announcement.updated_at.strftime('%Y-%m-%d %H:%M') if announcement.updated_at else None,
            })

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': {
                'announcements': announcements_data,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        })
    except Exception as e:
        logger.error(f'获取公告列表失败: {str(e)}')
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
        # 获取指定类型且生效中的公告，按优先级和创建时间排序
        announcements = Announcement.objects.filter(
            announcement_type=announcement_type,
            is_active=True
        ).order_by('-priority', '-created_at')

        if announcements.exists():
            announcement = announcements.first()
            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': {
                    'id': announcement.id,
                    'announcement_type': announcement.announcement_type,
                    'announcement_type_display': announcement.get_announcement_type_display(),
                    'title': announcement.title,
                    'content': announcement.content,
                    'priority': announcement.priority,
                    'cover_image': announcement.cover_image,
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
        logger.error(f'获取公告失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}',
            'data': None
        })


@csrf_exempt
@api_login_required
@require_http_methods(["GET", "POST"])
def user_feedback(request):
    """用户反馈管理 - 需要登录"""
    if request.method == 'GET':
        try:
            user = request.user
            is_admin = user.is_staff

            # 管理员查看所有反馈，普通用户只能查看自己的反馈
            if is_admin:
                feedbacks_qs = UserFeedback.objects.all()
            else:
                feedbacks_qs = UserFeedback.objects.filter(user=user)

            # 分页参数
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))
            status = request.GET.get('status', '')
            feedback_type = request.GET.get('type', '')

            # 筛选
            if status:
                feedbacks_qs = feedbacks_qs.filter(status=status)
            if feedback_type:
                feedbacks_qs = feedbacks_qs.filter(feedback_type=feedback_type)

            # 排序和分页
            total = feedbacks_qs.count()
            feedbacks_qs = feedbacks_qs.order_by('-created_at')
            offset = (page - 1) * page_size
            feedbacks = feedbacks_qs[offset:offset + page_size]

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
                    'updated_at': feedback.updated_at.strftime('%Y-%m-%d %H:%M') if feedback.updated_at else None,
                })

            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': {
                    'feedbacks': feedbacks_data,
                    'total': total,
                    'page': page,
                    'page_size': page_size,
                    'is_admin': is_admin
                }
            })
        except Exception as e:
            logger.error(f'获取反馈列表失败: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'获取失败: {str(e)}',
                'data': []
            })

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)

            user = request.user

            # 检查是否短时间内提交过多反馈（防止刷屏）
            one_hour_ago = timezone.now() - timedelta(hours=1)
            recent_feedbacks = UserFeedback.objects.filter(
                user=user,
                created_at__gte=one_hour_ago
            ).count()

            if recent_feedbacks >= 5:
                return JsonResponse({
                    'code': 400,
                    'msg': '提交过于频繁，请稍后再试',
                    'data': None
                })

            feedback = UserFeedback.objects.create(
                user=user,
                feedback_type=data.get('feedback_type', 'other'),
                title=data.get('title'),
                content=data.get('content'),
                contact=data.get('contact', '')
            )

            # 发送通知给管理员
            admin_users = User.objects.filter(is_staff=True)
            for admin in admin_users:
                Notification.objects.create(
                    user=admin,
                    notification_type='system',
                    title='新的用户反馈',
                    content=f'用户{user.username}提交了反馈：{feedback.title}，请及时处理。'
                )

            return JsonResponse({
                'code': 200,
                'msg': '提交成功',
                'data': {'feedback_id': feedback.id}
            })
        except Exception as e:
            logger.error(f'提交反馈失败: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'提交失败: {str(e)}',
                'data': None
            })

    return JsonResponse({
        'code': 400,
        'msg': '不支持的请求方法',
        'data': None
    })


@csrf_exempt
@api_login_required
@require_http_methods(["GET", "PUT", "DELETE"])
def feedback_detail(request, feedback_id):
    """反馈详情管理 - 需要登录"""
    try:
        feedback = UserFeedback.objects.get(id=feedback_id)

        # 权限检查：用户只能查看和修改自己的反馈，管理员可以处理所有反馈
        user = request.user
        is_admin = user.is_staff

        if feedback.user != user and not is_admin:
            return JsonResponse({
                'code': 403,
                'msg': '无权访问该反馈',
                'data': None
            }, status=403)

        if request.method == 'GET':
            return JsonResponse({
                'code': 200,
                'msg': '获取成功',
                'data': {
                    'id': feedback.id,
                    'user_id': feedback.user.id if feedback.user else None,
                    'username': feedback.user.username if feedback.user else '匿名',
                    'user_avatar': feedback.user.userprofile.avatar_url if feedback.user and hasattr(feedback.user,
                                                                                                     'userprofile') else '',
                    'feedback_type': feedback.feedback_type,
                    'feedback_type_display': feedback.get_feedback_type_display(),
                    'title': feedback.title,
                    'content': feedback.content,
                    'contact': feedback.contact,
                    'status': feedback.status,
                    'status_display': feedback.get_status_display(),
                    'reply': feedback.reply,
                    'admin_reply': feedback.admin_reply,
                    'created_at': feedback.created_at.strftime('%Y-%m-%d %H:%M'),
                    'updated_at': feedback.updated_at.strftime('%Y-%m-%d %H:%M') if feedback.updated_at else None,
                    'is_owner': feedback.user == user,
                    'can_reply': is_admin
                }
            })

        elif request.method == 'PUT':
            data = json.loads(request.body)

            if is_admin:
                # 管理员可以更新状态和回复
                if 'status' in data:
                    feedback.status = data['status']
                if 'admin_reply' in data:
                    feedback.admin_reply = data['admin_reply']

                    # 如果管理员回复了，则标记为已处理
                    if data['admin_reply']:
                        feedback.status = 'processed'

                    # 发送通知给反馈提交者
                    if feedback.user:
                        Notification.objects.create(
                            user=feedback.user,
                            notification_type='system',
                            title='反馈已回复',
                            content=f'您的反馈"{feedback.title}"已收到回复：{data["admin_reply"]}'
                        )
            else:
                # 普通用户只能更新自己的反馈内容
                if feedback.user != user:
                    return JsonResponse({
                        'code': 403,
                        'msg': '无权修改该反馈',
                        'data': None
                    }, status=403)

                if 'content' in data:
                    feedback.content = data['content']
                if 'contact' in data:
                    feedback.contact = data['contact']

            feedback.save()

            return JsonResponse({
                'code': 200,
                'msg': '更新成功',
                'data': None
            })

        elif request.method == 'DELETE':
            # 只有管理员或反馈所有者可以删除
            if not is_admin and feedback.user != user:
                return JsonResponse({
                    'code': 403,
                    'msg': '无权删除该反馈',
                    'data': None
                }, status=403)

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
    except json.JSONDecodeError:
        return JsonResponse({
            'code': 400,
            'msg': '请求数据格式错误',
            'data': None
        })
    except Exception as e:
        logger.error(f'处理反馈失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'操作失败: {str(e)}',
            'data': None
        })


@csrf_exempt
@api_login_required
def user_logout(request):
    """用户退出登录 - 需要登录"""
    if request.method == 'POST':
        try:
            user = request.user

            # 记录退出登录日志
            try:
                profile = UserProfile.objects.get(user=user)
                profile.last_logout_time = timezone.now()
                profile.save()
                logger.info(f'用户退出登录: {user.username}')
            except UserProfile.DoesNotExist:
                pass

            # 在实际项目中，这里可能还需要：
            # 1. 使token失效
            # 2. 清除session
            # 3. 记录操作日志

            return JsonResponse({
                'code': 200,
                'msg': '退出成功',
                'data': None
            })
        except Exception as e:
            logger.error(f'退出登录失败: {str(e)}')
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
@api_login_required
def user_login_log(request):
    """记录用户访问日志 - 需要登录"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            action = data.get('action', 'visit')
            page = data.get('page', '')

            user = request.user

            try:
                profile = UserProfile.objects.get(user=user)
                # 更新最后访问时间
                profile.last_login_time = timezone.now()
                profile.save()

                logger.info(f'用户访问日志 - 用户: {user.username}, 操作: {action}, 页面: {page}')

            except UserProfile.DoesNotExist:
                logger.warning(f'用户资料不存在: {user.id}')

            return JsonResponse({
                'code': 200,
                'msg': '记录成功',
                'data': None
            })
        except Exception as e:
            logger.error(f'记录访问日志失败: {str(e)}')
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
@api_login_required
def get_user_list(request):
    """获取用户列表（管理员） - 需要管理员权限"""
    # 检查管理员权限
    if not request.user.is_staff:
        return JsonResponse({
            'code': 403,
            'msg': '权限不足',
            'data': None
        }, status=403)

    if request.method == 'GET':
        try:
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            search = request.GET.get('search', '')
            user_type = request.GET.get('type', '')
            is_verified = request.GET.get('is_verified', '')
            is_blacklisted = request.GET.get('is_blacklisted', '')

            # 构建查询
            query = UserProfile.objects.select_related('user').all()

            if search:
                query = query.filter(
                    Q(user__username__icontains=search) |
                    Q(phone__icontains=search) |
                    Q(real_name__icontains=search) |
                    Q(student_id__icontains=search)
                )

            if user_type == 'rider':
                query = query.filter(is_rider=True)
            elif user_type == 'customer':
                query = query.filter(is_rider=False)

            if is_verified == 'true':
                query = query.filter(is_verified=True)
            elif is_verified == 'false':
                query = query.filter(is_verified=False)

            if is_blacklisted == 'true':
                query = query.filter(is_blacklisted=True)
            elif is_blacklisted == 'false':
                query = query.filter(is_blacklisted=False)

            # 分页
            total = query.count()
            offset = (page - 1) * page_size
            user_list = query[offset:offset + page_size]

            # 构建返回数据
            users = []
            for profile in user_list:
                # 统计用户的订单数（作为示例）
                order_count = Order.objects.filter(customer=profile.user).count()
                rider_order_count = Order.objects.filter(rider=profile.user).count()

                users.append({
                    'id': profile.user.id,
                    'username': profile.user.username,
                    'nickname': profile.real_name,
                    'phone': profile.phone,
                    'student_id': profile.student_id,
                    'is_verified': profile.is_verified,
                    'credit_score': profile.credit_score,
                    'is_blacklisted': profile.is_blacklisted,
                    'is_rider': profile.is_rider,
                    'last_login': profile.last_login_time.strftime(
                        '%Y-%m-%d %H:%M:%S') if profile.last_login_time else '',
                    'created_at': profile.user.date_joined.strftime('%Y-%m-%d %H:%M:%S'),
                    'order_count': order_count,
                    'rider_order_count': rider_order_count
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
            logger.error(f'获取用户列表失败: {str(e)}')
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
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username', 'test_user')

            # 查找或创建测试用户
            user, created = User.objects.get_or_create(
                username=username,
                defaults={'password': 'test_password'}
            )

            # 获取或创建用户资料
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'real_name': '测试用户',
                    'phone': '13800138000'
                }
            )

            # 生成token
            token_str = f"{user.id}_{int(time.time())}_{username}"
            token = hashlib.md5(token_str.encode()).hexdigest()

            return JsonResponse({
                'code': 200,
                'msg': '登录成功（测试）',
                'data': {
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'nickname': profile.real_name,
                        'phone': profile.phone
                    },
                    'token': token
                }
            })
        except Exception as e:
            logger.error(f'简单登录失败: {str(e)}')
            return JsonResponse({
                'code': 500,
                'msg': f'登录失败: {str(e)}',
                'data': None
            })

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
@api_login_required
def upload_avatar(request):
    """上传用户头像 - 需要登录"""
    if request.method == 'POST':
        try:
            user = request.user
            avatar_file = request.FILES.get('avatar')

            if not avatar_file:
                return JsonResponse({
                    'code': 400,
                    'msg': '请选择要上传的头像文件',
                    'data': None
                })

            # 验证文件类型
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if avatar_file.content_type not in allowed_types:
                return JsonResponse({
                    'code': 400,
                    'msg': '只支持 JPG、PNG、GIF、WEBP 格式的图片',
                    'data': None
                })

            # 验证文件大小（最大 2MB）
            max_size = 2 * 1024 * 1024
            if avatar_file.size > max_size:
                return JsonResponse({
                    'code': 400,
                    'msg': '图片大小不能超过 2MB',
                    'data': None
                })

            # 创建存储目录
            avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
            os.makedirs(avatar_dir, exist_ok=True)

            # 生成文件名
            file_extension = avatar_file.name.split('.')[-1].lower()
            filename = f"avatar_{user.id}_{int(time.time())}.{file_extension}"
            file_path = os.path.join(avatar_dir, filename)

            # 保存文件
            try:
                with open(file_path, 'wb+') as destination:
                    for chunk in avatar_file.chunks():
                        destination.write(chunk)
            except Exception as e:
                logger.error(f'保存头像文件失败: {str(e)}')
                return JsonResponse({
                    'code': 500,
                    'msg': f'保存文件失败: {str(e)}',
                    'data': None
                })

            # 生成URL
            avatar_url = f"{settings.MEDIA_URL}avatars/{filename}"

            # 保存到用户信息
            profile_obj, created = UserProfile.objects.get_or_create(user=user)

            # 删除旧的头像文件（如果有）
            old_avatar_url = profile_obj.avatar_url
            if old_avatar_url and old_avatar_url.startswith(settings.MEDIA_URL):
                old_filename = old_avatar_url.replace(settings.MEDIA_URL, '')
                old_file_path = os.path.join(settings.MEDIA_ROOT, old_filename)
                if os.path.exists(old_file_path):
                    try:
                        os.remove(old_file_path)
                    except Exception as e:
                        logger.warning(f'删除旧头像文件失败: {str(e)}')

            profile_obj.avatar_url = avatar_url
            profile_obj.save()

            logger.info(f'用户头像上传成功: user_id={user.id}, avatar_url={avatar_url}')

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

    return JsonResponse({
        'code': 400,
        'msg': '请使用POST请求',
        'data': None
    })


# 发送消息接口
@csrf_exempt
@api_login_required
@require_http_methods(["POST"])
def send_message(request):
    """发送消息 - 需要登录"""
    try:
        data = json.loads(request.body)
        conversation_id = data.get('conversation_id')
        recipient_id = data.get('recipient_id')
        content = data.get('content', '')
        message_type = data.get('message_type', 'text')

        if not content:
            return JsonResponse({
                'code': 400,
                'msg': '消息内容不能为空',
                'data': None
            })

        sender = request.user

        if conversation_id:
            # 发送到现有会话
            conversation = Conversation.objects.get(id=conversation_id)
            if sender not in conversation.participants.all():
                return JsonResponse({
                    'code': 403,
                    'msg': '您不在该会话中',
                    'data': None
                }, status=403)
        else:
            # 创建新会话
            if not recipient_id:
                return JsonResponse({
                    'code': 400,
                    'msg': '缺少收件人ID',
                    'data': None
                })

            recipient = User.objects.get(id=recipient_id)

            # 查找是否已存在会话
            conversations = Conversation.objects.filter(participants=sender).filter(participants=recipient)
            if conversations.exists():
                conversation = conversations.first()
            else:
                # 创建新会话
                conversation = Conversation.objects.create()
                conversation.participants.add(sender, recipient)
                conversation.save()

        # 创建消息
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=content,
            message_type=message_type
        )

        # 更新会话的最后消息信息
        conversation.last_message = content[:100]  # 只保存前100个字符
        conversation.last_message_time = timezone.now()

        # 为所有参与者（除了发送者）增加未读计数
        for participant in conversation.participants.all():
            if participant != sender:
                conversation.unread_count += 1

        conversation.save()

        # 发送通知给其他参与者
        for participant in conversation.participants.all():
            if participant != sender:
                Notification.objects.create(
                    user=participant,
                    notification_type='message',
                    title='新消息',
                    content=f'{sender.username}给您发送了新消息'
                )

        return JsonResponse({
            'code': 200,
            'msg': '发送成功',
            'data': {
                'message_id': message.id,
                'conversation_id': conversation.id,
                'content': content,
                'created_at': message.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        })

    except Conversation.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '会话不存在',
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
        logger.error(f'发送消息失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'发送失败: {str(e)}',
            'data': None
        })


# 申请成为骑手
@csrf_exempt
@api_login_required
@require_http_methods(["POST"])
def apply_rider(request):
    """申请成为骑手 - 需要登录"""
    try:
        data = json.loads(request.body)

        user = request.user

        # 检查是否已经是骑手
        profile, created = UserProfile.objects.get_or_create(user=user)
        if profile.is_rider:
            return JsonResponse({
                'code': 400,
                'msg': '您已经是骑手了',
                'data': None
            })

        # 检查是否已经提交过骑手申请
        pending_application = AuditApplication.objects.filter(
            user=user,
            audit_type='rider',
            status='pending'
        ).first()

        if pending_application:
            return JsonResponse({
                'code': 400,
                'msg': '您已提交过骑手申请，请等待审核结果',
                'data': None
            })

        # 检查是否已通过实名认证
        if not profile.is_verified:
            return JsonResponse({
                'code': 400,
                'msg': '请先完成实名认证才能申请成为骑手',
                'data': None
            })

        # 创建骑手申请
        application = AuditApplication.objects.create(
            user=user,
            audit_type='rider',
            application_data={
                'real_name': profile.real_name,
                'student_id': profile.student_id,
                'phone': profile.phone,
                'apply_time': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        )

        # 发送通知给管理员
        admin_users = User.objects.filter(is_staff=True)
        for admin in admin_users:
            Notification.objects.create(
                user=admin,
                notification_type='system',
                title='新的骑手申请',
                content=f'用户{user.username}申请成为骑手，请及时审核。'
            )

        return JsonResponse({
            'code': 200,
            'msg': '骑手申请已提交，请等待审核',
            'data': {
                'application_id': application.id
            }
        })

    except json.JSONDecodeError:
        return JsonResponse({
            'code': 400,
            'msg': '请求数据格式错误',
            'data': None
        })
    except Exception as e:
        logger.error(f'申请成为骑手失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'申请失败: {str(e)}',
            'data': None
        })


# 获取系统统计数据（管理员）
@csrf_exempt
@api_login_required
def system_stats(request):
    """获取系统统计数据 - 需要管理员权限"""
    # 检查管理员权限
    if not request.user.is_staff:
        return JsonResponse({
            'code': 403,
            'msg': '权限不足',
            'data': None
        }, status=403)

    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        # 用户统计
        total_users = User.objects.count()
        verified_users = UserProfile.objects.filter(is_verified=True).count()
        riders = UserProfile.objects.filter(is_rider=True).count()
        blacklisted_users = UserProfile.objects.filter(is_blacklisted=True).count()

        # 今日新增用户
        today = timezone.now().date()
        today_users = User.objects.filter(date_joined__date=today).count()

        # 订单统计
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        completed_orders = Order.objects.filter(status='completed').count()

        # 今日订单统计
        today_orders = Order.objects.filter(created_at__date=today).count()
        today_completed_orders = Order.objects.filter(status='completed', completed_at__date=today).count()

        # 反馈统计
        pending_feedbacks = UserFeedback.objects.filter(status='pending').count()

        # 审核申请统计
        pending_applications = AuditApplication.objects.filter(status='pending').count()

        # 钱包统计
        total_balance = Wallet.objects.aggregate(total=Sum('balance'))['total'] or 0
        total_frozen = Wallet.objects.aggregate(total=Sum('frozen_balance'))['total'] or 0

        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'data': {
                'user_stats': {
                    'total': total_users,
                    'verified': verified_users,
                    'riders': riders,
                    'blacklisted': blacklisted_users,
                    'today_new': today_users
                },
                'order_stats': {
                    'total': total_orders,
                    'pending': pending_orders,
                    'completed': completed_orders,
                    'today_total': today_orders,
                    'today_completed': today_completed_orders
                },
                'system_stats': {
                    'pending_feedbacks': pending_feedbacks,
                    'pending_applications': pending_applications,
                    'total_balance': float(total_balance),
                    'total_frozen': float(total_frozen)
                }
            }
        })

    except Exception as e:
        logger.error(f'获取系统统计失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'获取失败: {str(e)}',
            'data': None
        })


# 清除黑名单
@csrf_exempt
@api_login_required
@require_http_methods(["POST"])
def remove_from_blacklist(request, user_id):
    """将用户从黑名单移除 - 需要管理员权限"""
    # 检查管理员权限
    if not request.user.is_staff:
        return JsonResponse({
            'code': 403,
            'msg': '权限不足',
            'data': None
        }, status=403)

    try:
        user = User.objects.get(id=user_id)
        profile = UserProfile.objects.get(user=user)

        if not profile.is_blacklisted:
            return JsonResponse({
                'code': 400,
                'msg': '用户不在黑名单中',
                'data': None
            })

        # 更新用户资料
        profile.is_blacklisted = False
        profile.blacklist_reason = ''
        profile.blacklist_until = None
        profile.save()

        # 更新黑名单记录
        blacklist_record = BlacklistRecord.objects.filter(
            user=user,
            status='active'
        ).first()

        if blacklist_record:
            blacklist_record.status = 'removed'
            blacklist_record.removed_at = timezone.now()
            blacklist_record.removed_by = request.user
            blacklist_record.save()

        # 发送通知给用户
        Notification.objects.create(
            user=user,
            notification_type='system',
            title='黑名单移除通知',
            content='您已被从黑名单中移除，现在可以正常使用平台功能了。'
        )

        return JsonResponse({
            'code': 200,
            'msg': '用户已从黑名单中移除',
            'data': None
        })

    except User.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户不存在',
            'data': None
        })
    except UserProfile.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户资料不存在',
            'data': None
        })
    except Exception as e:
        logger.error(f'移除黑名单失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'移除失败: {str(e)}',
            'data': None
        })


# 修改用户信用分
@csrf_exempt
@api_login_required
@require_http_methods(["POST"])
def update_credit_score(request, user_id):
    """修改用户信用分 - 需要管理员权限"""
    # 检查管理员权限
    if not request.user.is_staff:
        return JsonResponse({
            'code': 403,
            'msg': '权限不足',
            'data': None
        }, status=403)

    try:
        data = json.loads(request.body)
        score = data.get('score')
        reason = data.get('reason', '管理员调整')

        if score is None:
            return JsonResponse({
                'code': 400,
                'msg': '请输入信用分',
                'data': None
            })

        try:
            score_int = int(score)
            if score_int < 0 or score_int > 100:
                return JsonResponse({
                    'code': 400,
                    'msg': '信用分必须在0-100之间',
                    'data': None
                })
        except ValueError:
            return JsonResponse({
                'code': 400,
                'msg': '信用分必须是整数',
                'data': None
            })

        user = User.objects.get(id=user_id)
        profile = UserProfile.objects.get(user=user)

        # 保存旧信用分
        old_score = profile.credit_score

        # 更新信用分
        profile.credit_score = score_int
        profile.save()

        # 记录信用分变更
        # 这里可以创建一个CreditScoreChange模型来记录变更历史

        # 发送通知给用户
        if score_int > old_score:
            title = '信用分增加通知'
            content = f'您的信用分已从{old_score}分增加到{score_int}分。原因：{reason}'
        else:
            title = '信用分减少通知'
            content = f'您的信用分已从{old_score}分减少到{score_int}分。原因：{reason}'

        Notification.objects.create(
            user=user,
            notification_type='system',
            title=title,
            content=content
        )

        return JsonResponse({
            'code': 200,
            'msg': '信用分更新成功',
            'data': {
                'user_id': user.id,
                'username': user.username,
                'old_score': old_score,
                'new_score': score_int
            }
        })

    except User.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户不存在',
            'data': None
        })
    except UserProfile.DoesNotExist:
        return JsonResponse({
            'code': 404,
            'msg': '用户资料不存在',
            'data': None
        })
    except json.JSONDecodeError:
        return JsonResponse({
            'code': 400,
            'msg': '请求数据格式错误',
            'data': None
        })
    except Exception as e:
        logger.error(f'更新信用分失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'更新失败: {str(e)}',
            'data': None
        })


# 查询用户状态
@csrf_exempt
@api_login_required
def check_user_status(request):
    """查询用户状态 - 需要登录"""
    if request.method != 'GET':
        return JsonResponse({
            'code': 400,
            'msg': '请使用GET请求',
            'data': None
        })

    try:
        user = request.user
        profile, created = UserProfile.objects.get_or_create(user=user)

        # 检查是否有待处理的申请
        pending_applications = AuditApplication.objects.filter(
            user=user,
            status='pending'
        ).values('id', 'audit_type')

        # 检查钱包状态
        wallet, created = Wallet.objects.get_or_create(user=user)

        # 检查未读通知数量
        unread_notifications = Notification.objects.filter(user=user, is_read=False).count()

        # 检查未读消息数量
        user_conversations = Conversation.objects.filter(participants=user)
        total_unread_messages = 0
        for conv in user_conversations:
            # 统计当前用户在该会话中未读的消息（其他人发送的）
            total_unread_messages += Message.objects.filter(
                conversation=conv,
                is_read=False
            ).exclude(sender=user).count()  # 排除自己发送的消息

        return JsonResponse({
            'code': 200,
            'msg': '查询成功',
            'data': {
                'user_id': user.id,
                'username': user.username,
                'is_verified': profile.is_verified,
                'is_rider': profile.is_rider,
                'is_blacklisted': profile.is_blacklisted,
                'credit_score': profile.credit_score,
                'balance': float(wallet.balance),
                'pending_applications': list(pending_applications),
                'unread_notifications': unread_notifications,
                'unread_messages': total_unread_messages,
                'has_warnings': profile.is_blacklisted or profile.credit_score < 60
            }
        })

    except Exception as e:
        logger.error(f'查询用户状态失败: {str(e)}')
        return JsonResponse({
            'code': 500,
            'msg': f'查询失败: {str(e)}',
            'data': None
        })