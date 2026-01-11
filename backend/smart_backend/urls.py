from django.contrib import admin
from django.urls import path, include
from django.views.static import serve
from django.conf import settings
from django.views.generic import TemplateView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('smart/', include('smart.urls')),
    path('api/', include('api.urls')),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('media/<path:path>', serve, {'document_root': settings.MEDIA_ROOT}),
]

