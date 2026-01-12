import os
import warnings
import logging
from pathlib import Path
from dotenv import load_dotenv
from rest_framework import authentication, exceptions
from rest_framework.permissions import BasePermission

# 加载环境变量
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SECURITY WARNING: keep the secret key used in production secret!
# 强制从环境变量获取SECRET_KEY，生产环境必须设置
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY环境变量未设置！请在.env文件中配置。")

# SECURITY WARNING: don't run with debug turned on in production!
# 强制从环境变量获取DEBUG，生产环境必须设置为False
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 't')

# 生产环境强制检查DEBUG状态
if DEBUG:
    warnings.warn(
        "DEBUG模式已开启！请确保在生产环境中设置DEBUG=False",
        RuntimeWarning
    )

# 强制检查ALLOWED_HOSTS
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ['']:
    if DEBUG:
        ALLOWED_HOSTS = ['127.0.0.1', 'localhost']
        warnings.warn(
            "ALLOWED_HOSTS未设置，使用默认值。生产环境必须配置ALLOWED_HOSTS！",
            RuntimeWarning
        )
    else:
        raise ValueError("ALLOWED_HOSTS环境变量未设置！请在.env文件中配置。")

# Application definition
INSTALLED_APPS = [
    'simpleui',
    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',  # 添加token认证应用
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'smart',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'smart_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'smart_backend.wsgi.application'

# Database
DB_ENGINE = os.environ.get('DB_ENGINE', 'django.db.backends.sqlite3')

if DB_ENGINE == 'django.db.backends.postgresql':
    # PostgreSQL配置
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'universal_proxy'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {
                'sslmode': os.environ.get('DB_SSL_MODE', 'prefer'),
            },
            'CONN_MAX_AGE': 600,  # 连接池
            'ATOMIC_REQUESTS': True,  # 自动事务
        }
    }
elif DB_ENGINE == 'django.db.backends.mysql':
    # MySQL配置
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.environ.get('DB_NAME', 'universal_proxy'),
            'USER': os.environ.get('DB_USER', 'root'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            },
            'CONN_MAX_AGE': 600,
            'ATOMIC_REQUESTS': True,
        }
    }
else:
    # SQLite（开发环境）
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,  # 最小密码长度设置为8
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'zh-hans'
TIME_ZONE = 'Asia/Shanghai'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
# CORS配置从环境变量读取
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1', 't')
CORS_ALLOW_CREDENTIALS = True

# 从环境变量读取CORS允许的源
cors_allowed_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if cors_allowed_origins:
    CORS_ALLOWED_ORIGINS = cors_allowed_origins.split(',')
else:
    CORS_ALLOWED_ORIGINS = []

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# 从环境变量读取CSRF可信源，如果没有则使用默认值
csrf_origins = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if csrf_origins:
    CSRF_TRUSTED_ORIGINS = csrf_origins.split(',')
else:
    CSRF_TRUSTED_ORIGINS = []


# 自定义权限类
class IsAdminOrReadOnly(BasePermission):
    """
    自定义权限：管理员可以读写，其他用户只读
    """

    def has_permission(self, request, view):
        # 允许GET、HEAD、OPTIONS请求
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        # 其他请求需要管理员权限
        return request.user and request.user.is_staff


class IsAuthenticatedOrReadOnlyForSafeMethods(BasePermission):
    """
    自定义权限：安全方法（GET、HEAD、OPTIONS）允许所有人访问，
    其他方法需要认证
    """

    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return request.user and request.user.is_authenticated


# 自定义认证类 - 检查token
class TokenAuthentication(authentication.BaseAuthentication):
    """
    自定义Token认证类
    从请求头或查询参数中获取token并验证
    """

    def authenticate(self, request):
        # 从Authorization header获取token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        # 从查询参数获取token（兼容旧版本）
        token_param = request.GET.get('token', '')

        token = None

        # 优先从Authorization header获取
        if auth_header.startswith('Token '):
            token = auth_header[6:].strip()
        elif auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
        elif token_param:
            token = token_param.strip()

        if not token:
            # 如果没有token，尝试从cookie获取
            token = request.COOKIES.get('auth_token')

        if not token:
            # 如果没有提供token，尝试使用session认证
            if request.user and request.user.is_authenticated:
                return request.user, None
            return None

        # 这里应该验证token的有效性
        # 简化版本：只检查token格式
        if not isinstance(token, str) or len(token) < 10:
            raise exceptions.AuthenticationFailed('无效的token格式')

        # TODO: 实际应该查询数据库验证token
        # 示例：使用DRF的Token认证
        try:
            # 在try块内部导入Token，确保作用域正确
            from rest_framework.authtoken.models import Token
            token_obj = Token.objects.select_related('user').get(key=token)
            user = token_obj.user

            # 检查用户是否活跃
            if not user.is_active:
                raise exceptions.AuthenticationFailed('用户账户已禁用')

            return user, token_obj
        except Token.DoesNotExist:
            # 如果使用自定义用户模型
            try:
                from django.contrib.auth import get_user_model
                _ = get_user_model()  # 重命名为下划线，避免未使用变量警告
                # 这里可以添加自定义的token验证逻辑
                # 例如：验证JWT token或其他自定义token
                raise exceptions.AuthenticationFailed('无效的token')
            except Exception:
                raise exceptions.AuthenticationFailed('无效的token')

        return None  # 如果所有验证都失败


# Django REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'smart_backend.settings.TokenAuthentication',  # 使用自定义Token认证
        'rest_framework.authentication.SessionAuthentication',  # 保留Session认证用于admin
        'rest_framework.authentication.BasicAuthentication',  # 保留Basic认证用于测试
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',  # 默认要求认证，但允许读取
        # 'smart_backend.settings.IsAuthenticatedOrReadOnlyForSafeMethods',  # 可选：使用自定义权限
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',  # 匿名用户每天100次
        'user': '1000/day'  # 认证用户每天1000次
    },
    'DEFAULT_SCHEMA_CLASS': 'rest_framework.schemas.coreapi.AutoSchema',
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
    'DATE_FORMAT': '%Y-%m-%d',
    'TIME_FORMAT': '%H:%M:%S',
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
}

# 安全设置 - 针对API的限制
if not DEBUG:
    # 生产环境：禁用浏览API和Session认证
    REST_FRAMEWORK.update({
        'DEFAULT_AUTHENTICATION_CLASSES': [
            'smart_backend.settings.TokenAuthentication',  # 仅使用Token认证
        ],
        'DEFAULT_RENDERER_CLASSES': [
            'rest_framework.renderers.JSONRenderer',  # 仅返回JSON
        ],
    })

# SimpleUI settings
SIMPLEUI_HOME_INFO = False
SIMPLEUI_ANALYSIS = False
SIMPLEUI_HOME_TITLE = '智能后台管理'
SIMPLEUI_HOME_ICON = 'fa fa-home'
# 从环境变量读取SimpleUI主题
SIMPLEUI_DEFAULT_THEME = os.environ.get('SIMPLEUI_DEFAULT_THEME', 'admin.lte.css')

# 微信小程序配置 - 必须从环境变量获取
WECHAT_MINIPROGRAM_APPID = os.environ.get('WECHAT_MINIPROGRAM_APPID')
WECHAT_MINIPROGRAM_APPSECRET = os.environ.get('WECHAT_MINIPROGRAM_APPSECRET')

if not DEBUG and (not WECHAT_MINIPROGRAM_APPID or not WECHAT_MINIPROGRAM_APPSECRET):
    raise ValueError("微信小程序配置未设置！请在.env文件中配置WECHAT_MINIPROGRAM_APPID和WECHAT_MINIPROGRAM_APPSECRET。")

WECHAT_MINIPROGRAM = {
    'APPID': WECHAT_MINIPROGRAM_APPID or '',
    'APPSECRET': WECHAT_MINIPROGRAM_APPSECRET or '',
}

# 微信支付配置 - 必须从环境变量获取
WECHAT_PAY_APPID = os.environ.get('WECHAT_PAY_APPID')
WECHAT_PAY_MCHID = os.environ.get('WECHAT_PAY_MCHID')
WECHAT_PAY_API_V3_KEY = os.environ.get('WECHAT_PAY_API_V3_KEY')
WECHAT_PAY_NOTIFY_URL = os.environ.get('WECHAT_PAY_NOTIFY_URL')
WECHAT_PAY_SERIAL_NO = os.environ.get('WECHAT_PAY_SERIAL_NO')
WECHAT_PAY_PRIVATE_KEY = os.environ.get('WECHAT_PAY_PRIVATE_KEY')
WECHAT_PAY_APIV3_KEY = os.environ.get('WECHAT_PAY_APIV3_KEY')

if not DEBUG and (not WECHAT_PAY_APPID or not WECHAT_PAY_MCHID or not WECHAT_PAY_API_V3_KEY):
    raise ValueError("微信支付配置不完整！请在.env文件中配置必要的微信支付参数。")

WECHAT_PAY_CONFIG = {
    'APPID': WECHAT_PAY_APPID or '',
    'MCHID': WECHAT_PAY_MCHID or '',
    'API_V3_KEY': WECHAT_PAY_API_V3_KEY or '',
    'NOTIFY_URL': WECHAT_PAY_NOTIFY_URL or 'https://your-domain.com/api/payment/notify/',
    'SERIAL_NO': WECHAT_PAY_SERIAL_NO or '',
    'PRIVATE_KEY': WECHAT_PAY_PRIVATE_KEY or '',
    'APIV3_KEY': WECHAT_PAY_APIV3_KEY or '',
    'BASE_URL': 'https://api.mch.weixin.qq.com',
}

# Security settings for production
if not DEBUG:
    # 生产环境安全检查
    required_production_settings = [
        ('SECRET_KEY', SECRET_KEY),
        ('ALLOWED_HOSTS', ALLOWED_HOSTS),
        ('WECHAT_MINIPROGRAM_APPID', WECHAT_MINIPROGRAM_APPID),
        ('WECHAT_MINIPROGRAM_APPSECRET', WECHAT_MINIPROGRAM_APPSECRET),
    ]

    for setting_name, setting_value in required_production_settings:
        if not setting_value:
            raise ValueError(f"生产环境必须设置{setting_name}！请在.env文件中配置。")

    # HTTPS settings
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True').lower() in ('true', '1', 't')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Other security settings
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

    # 设置安全代理
    USE_X_FORWARDED_HOST = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # 会话安全设置
    SESSION_COOKIE_AGE = int(os.environ.get('SESSION_COOKIE_AGE', '1209600'))  # 2周，单位秒
    SESSION_EXPIRE_AT_BROWSER_CLOSE = os.environ.get('SESSION_EXPIRE_AT_BROWSER_CLOSE', 'False').lower() in ('true',
                                                                                                             '1', 't')
else:
    # 开发环境设置
    # 仅在开发时启用更宽松的CORS设置
    if not CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080']

    if not CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080']

    # 开发环境：启用API浏览器和Session认证
    REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'].append('rest_framework.authentication.SessionAuthentication')
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'].append('rest_framework.renderers.BrowsableAPIRenderer')

# 首先创建logs目录
logs_dir = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)

# 日志配置
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'api': {
            'format': '{asctime} {levelname} {message} - User: {user} - IP: {ip}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/django.log'),
            'formatter': 'verbose',
        },
        'api_file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/api.log'),
            'formatter': 'api',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': True,
        },
        'api': {
            'handlers': ['console', 'api_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'rest_framework': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# 缓存配置
CACHES = {
    'default': {
        'BACKEND': os.environ.get('CACHE_BACKEND', 'django.core.cache.backends.locmem.LocMemCache'),
        'LOCATION': os.environ.get('CACHE_LOCATION', 'unique-snowflake'),
        'TIMEOUT': int(os.environ.get('CACHE_TIMEOUT', '300')),
    }
}

# 邮件配置
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'webmaster@localhost')

# API速率限制配置（生产环境更严格）
if not DEBUG:
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
        'anon': '50/day',  # 匿名用户每天50次
        'user': '500/day'  # 认证用户每天500次
    }