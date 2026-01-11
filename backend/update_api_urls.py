import os
 
# api/urls.py的完整内容
urls_content = """# api/urls.py
from django.urls import path
from . import views
 
urlpatterns = [
    path('login/', views.login, name='api_login'),
    path('blacklist/', views.blacklist_users, name='blacklist_users'),
    path('audit/', views.audit_applications, name='audit_applications'),
    path('audit/<int:application_id>/approve/', views.approve_application, name='approve_application'),
    path('audit/<int:application_id>/reject/', views.reject_application, name='reject_application'),
    path('user/<int:user_id>/profile/', views.user_profile, name='user_profile'),
    path('real-name-auth/', views.submit_real_name_auth, name='submit_real_name_auth'),
    path('bind-phone/', views.bind_phone, name='bind_phone'),
]
"""
 
# 写入文件
file_path = "backend/api/urls.py"
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(urls_content)
 
print("✓ api/urls.py已更新")
print("✓ 所有API路由已添加")
