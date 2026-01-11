from django.db import models


class Welcome(models.Model):
    """欢迎页图片模型"""
    img = models.ImageField(
        upload_to='welcome/',
        default='welcome/slash.png',
        verbose_name='欢迎图片'
    )
    title = models.CharField(max_length=100, verbose_name='标题', blank=True, null=True)
    description = models.TextField(verbose_name='描述', blank=True, null=True)
    order = models.IntegerField(verbose_name='排序', default=0)
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    create_time = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    is_delete = models.BooleanField(default=False, verbose_name='是否删除')

    class Meta:
        verbose_name = '欢迎页'
        verbose_name_plural = '欢迎页管理'
        ordering = ['-order', '-create_time']

    def __str__(self):
        return f"欢迎页 {self.order}"