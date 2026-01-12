# backend/api/urls.py
from django.urls import path
from . import views
from . import payment_views

urlpatterns = [
    # 用户管理
    path('user/logout/', views.user_logout),
    path('user/login-log/', views.user_login_log),
    path('user/list/', views.get_user_list),

    #头像图片上传
    path('upload/image/', views.upload_image),

    # 基础认证功能
    path('login/', views.login, name='api_login'),
    path('user-info/', views.get_user_info, name='get_user_info'),
    path('user/<int:user_id>/', views.user_profile_detail, name='user_profile'),
    path('auth/real-name/', views.submit_real_name_auth, name='submit_real_name_auth'),
    path('auth/bind-phone/', views.bind_phone, name='bind_phone'),

    # 黑名单功能
    path('blacklist/', views.blacklist_users, name='blacklist_users'),

    # 审核功能
    path('audit/', views.audit_applications, name='audit_applications'),
    path('audit/<int:application_id>/approve/', views.approve_application, name='approve_application'),
    path('audit/<int:application_id>/reject/', views.reject_application, name='reject_application'),

    # 钱包功能
    path('wallet/', views.wallet_info, name='wallet_info'),
    path('wallet/withdraw/', views.wallet_withdraw, name='wallet_withdraw'),
    path('wallet/transactions/', views.wallet_transactions, name='wallet_transactions'),

    # 通知功能
    path('notifications/', views.notification_list, name='notification_list'),
    path('notifications/<int:notification_id>/read/', views.notification_mark_read, name='notification_mark_read'),

    # 消息功能
    path('conversations/', views.conversation_list, name='conversation_list'),
    path('conversations/<int:conversation_id>/messages/', views.message_list, name='message_list'),

    # 公告功能
    path('announcements/', views.announcement_list, name='announcement_list'),
    path('announcements/<str:announcement_type>/', views.announcement_by_type, name='announcement_by_type'),

    # 用户反馈功能
    path('feedback/', views.user_feedback, name='user_feedback'),
    path('feedback/<int:feedback_id>/', views.feedback_detail, name='feedback_detail'),
    path('simple_login/', views.simple_login),
    path('rider/settings/', views.rider_settings, name='rider_settings'),
    path('rider/auto-grab/', views.auto_grab_order, name='auto_grab_order'),
    path('rider/stats/', views.rider_grab_stats, name='rider_grab_stats'),
    path('order-categories/', views.order_categories, name='order_categories'),

    # 支付相关
    path('payment/notify/', payment_views.payment_notify, name='payment_notify'),
]