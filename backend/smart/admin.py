from django.contrib import admin
from .models import Welcome


@admin.register(Welcome)
class WelcomeAdmin(admin.ModelAdmin):
    list_display = ['id', 'img_preview', 'order', 'create_time', 'is_delete']
    list_display_links = ['id', 'img_preview']
    list_editable = ['order', 'is_delete']
    list_filter = ['is_delete', 'create_time']
    search_fields = ['order']
    ordering = ['-order']
    date_hierarchy = 'create_time'
    readonly_fields = ['create_time', 'img_preview']

    # 添加页面显示的字段
    fields = ['img', 'order', 'is_delete', 'create_time']

    def img_preview(self, obj):
        if obj.img:
            return f'<img src="{obj.img.url}" width="100" height="50" style="object-fit: cover;" />'
        return "无图片"

    img_preview.short_description = '图片预览'
    img_preview.allow_tags = True

    # 重写保存方法，确保创建时间正确
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)