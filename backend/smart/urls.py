# smart/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # 基础接口
    path('welcome/', views.welcome, name='welcome_api'),
    path('test/', views.test_api, name='test_api'),
    path('login/', views.simple_login, name='simple_login'),

    # 欢迎页图片接口
    path('welcome/images/', views.get_welcome_images, name='get_welcome_images'),
    path('welcome/<str:image_name>/', views.get_default_welcome, name='get_default_welcome'),
]