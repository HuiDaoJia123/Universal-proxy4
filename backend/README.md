# 部署说明
 
## 开发环境
1. 创建虚拟环境：`python -m venv venv`
2. 激活虚拟环境：`source venv/bin/activate`
3. 安装依赖：`pip install -r requirements.txt`
4. 运行迁移：`python manage.py migrate`
5. 启动服务：`python manage.py runserver`
 
## 生产环境
1. 上传代码到服务器
2. 安装依赖：`pip install -r requirements.txt`
3. 运行迁移：`python manage.py migrate`
4. 收集静态文件：`python manage.py collectstatic`
5. 使用Gunicorn启动：`gunicorn smart_backend.wsgi:application`