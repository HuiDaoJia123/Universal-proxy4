# backend/api/models.py
from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.models import User
from django.utils import timezone

class UserProfile(models.Model):
    """用户资料扩展"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name='用户')
    phone = models.CharField(max_length=11, verbose_name='绑定手机号')
    real_name = models.CharField(max_length=50, verbose_name='真实姓名')
    student_id = models.CharField(max_length=20, verbose_name='学号')
    is_verified = models.BooleanField(default=False, verbose_name='是否实名认证')
    credit_score = models.IntegerField(default=100, verbose_name='诚信度分数')
    is_blacklisted = models.BooleanField(default=False, verbose_name='是否在黑名单')
    blacklist_reason = models.TextField(blank=True, verbose_name='黑名单原因')
    blacklist_until = models.DateTimeField(null=True, blank=True, verbose_name='黑名单到期时间')
    last_login_time = models.DateTimeField(auto_now=True, verbose_name='最后登录时间')
    last_logout_time = models.DateTimeField(null=True, blank=True, verbose_name='最后退出时间')
    login_count = models.IntegerField(default=0, verbose_name='登录次数')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    avatar_url = models.URLField(max_length=500, blank=True, verbose_name='头像URL')

    class Meta:
        verbose_name = '用户资料'
        verbose_name_plural = '用户资料管理'

    def __str__(self):
        return f"{self.user.username} - {self.real_name or '未认证'}"


class BlacklistRecord(models.Model):
    """黑名单记录"""
    STATUS_CHOICES = [
        ('active', '生效中'),
        ('expired', '已过期'),
        ('lifted', '已解除'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='用户')
    reason = models.CharField(max_length=200, verbose_name='拉黑原因')
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                 related_name='reported_cases', verbose_name='举报人')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active', verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    expiry_date = models.DateTimeField(null=True, blank=True, verbose_name='到期时间')

    class Meta:
        verbose_name = '黑名单记录'
        verbose_name_plural = '黑名单管理'

    def __str__(self):
        return f"{self.user.username} - {self.reason}"


class AuditApplication(models.Model):
    """审核申请"""
    AUDIT_TYPES = [
        ('rider', '骑手申请'),
        ('substitute', '代课申请'),
        ('brush_course', '刷课申请'),
        ('real_name', '实名认证'),
    ]

    STATUS_CHOICES = [
        ('pending', '待审核'),
        ('approved', '已通过'),
        ('rejected', '已拒绝'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='申请人')
    audit_type = models.CharField(max_length=20, choices=AUDIT_TYPES, verbose_name='审核类型')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', verbose_name='状态')
    application_data = models.JSONField(verbose_name='申请数据')
    reject_reason = models.TextField(blank=True, verbose_name='拒绝原因')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='申请时间')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='审核时间')
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                 related_name='reviewed_applications', verbose_name='审核人')

    class Meta:
        verbose_name = '审核申请'
        verbose_name_plural = '审核管理'

    def __str__(self):
        return f"{self.user.username} - {self.get_audit_type_display()}"


class Wallet(models.Model):
    """用户钱包"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name='用户')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='余额')
    frozen_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='冻结余额')
    total_income = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='总收入')
    total_expenditure = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name='总支出')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '用户钱包'
        verbose_name_plural = '用户钱包管理'

    def __str__(self):
        return f"{self.user.username} - 余额: {self.balance}"


class Transaction(models.Model):
    """交易记录"""
    TRANSACTION_TYPES = [
        ('income', '收入'),
        ('expenditure', '支出'),
        ('refund', '退款'),
        ('withdraw', '提现'),
    ]

    STATUS_CHOICES = [
        ('pending', '待处理'),
        ('completed', '已完成'),
        ('failed', '失败'),
        ('cancelled', '已取消'),
    ]

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, verbose_name='钱包')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, verbose_name='交易类型')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='金额')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='状态')
    description = models.CharField(max_length=200, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '交易记录'
        verbose_name_plural = '交易记录管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount}"


class Notification(models.Model):
    """用户通知"""
    NOTIFICATION_TYPES = [
        ('order', '订单通知'),
        ('payment', '支付通知'),
        ('system', '系统通知'),
        ('promotion', '推广通知'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='用户')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, verbose_name='通知类型')
    title = models.CharField(max_length=200, verbose_name='标题')
    content = models.TextField(verbose_name='内容')
    is_read = models.BooleanField(default=False, verbose_name='是否已读')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '用户通知'
        verbose_name_plural = '用户通知管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class Conversation(models.Model):
    """会话"""
    participants = models.ManyToManyField(User, verbose_name='参与者')
    last_message = models.TextField(blank=True, verbose_name='最后一条消息')
    last_message_time = models.DateTimeField(auto_now=True, verbose_name='最后消息时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '会话'
        verbose_name_plural = '会话管理'
        ordering = ['-last_message_time']

    def __str__(self):
        participants_str = ', '.join([user.username for user in self.participants.all()])
        return f"{participants_str} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class Message(models.Model):
    """消息"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, verbose_name='会话')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='发送者')
    content = models.TextField(verbose_name='内容')
    is_read = models.BooleanField(default=False, verbose_name='是否已读')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '消息'
        verbose_name_plural = '消息管理'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:20]}..."


# 订单分类模型
class OrderCategory(models.Model):
    """订单分类"""
    CATEGORY_CHOICES = [
        ('express', '代取快递'),
        ('takeout', '外卖配送'),
        ('supermarket', '超市代购'),
        ('substitute', '代课服务'),
        ('brush', '刷课服务'),
        ('other', '其他服务'),
    ]

    code = models.CharField(max_length=20, choices=CATEGORY_CHOICES, unique=True, verbose_name='分类代码')
    name = models.CharField(max_length=50, verbose_name='分类名称')
    description = models.TextField(blank=True, verbose_name='分类描述')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '订单分类'
        verbose_name_plural = '订单分类'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


# 订单模型
class Order(models.Model):
    """订单模型"""
    STATUS_CHOICES = [
        ('pending', '待接单'),
        ('accepted', '已接单'),
        ('processing', '进行中'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ]

    order_no = models.CharField(max_length=50, unique=True, verbose_name='订单编号')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', verbose_name='用户')
    rider = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='rider_orders', verbose_name='骑手')
    category = models.ForeignKey(OrderCategory, on_delete=models.SET_NULL, null=True, verbose_name='订单分类')
    title = models.CharField(max_length=200, verbose_name='订单标题')
    description = models.TextField(verbose_name='订单描述')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='价格')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name='接单时间')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')

    class Meta:
        verbose_name = '订单'
        verbose_name_plural = '订单'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_no} - {self.title}"


# 骑手设置模型
class RiderSettings(models.Model):
    """骑手设置"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='rider_settings', verbose_name='用户')
    auto_grab_enabled = models.BooleanField(default=False, verbose_name='是否启用自动接单')
    max_orders_per_hour = models.PositiveIntegerField(default=5, verbose_name='每小时最大接单数')
    max_orders_total = models.PositiveIntegerField(default=20, verbose_name='最大接单总数')
    categories = models.ManyToManyField(OrderCategory, blank=True, verbose_name='可接订单分类')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '骑手设置'
        verbose_name_plural = '骑手设置'

    def __str__(self):
        return f"{self.user.username} 的骑手设置"


# 骑手接单记录
class RiderGrabRecord(models.Model):
    """骑手接单记录"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grab_records', verbose_name='骑手')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='grab_records', verbose_name='订单')
    grabbed_at = models.DateTimeField(auto_now_add=True, verbose_name='接单时间')
    completed = models.BooleanField(default=False, verbose_name='是否完成')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')

    class Meta:
        verbose_name = '骑手接单记录'
        verbose_name_plural = '骑手接单记录'
        ordering = ['-grabbed_at']
        unique_together = ['user', 'order']  # 一个骑手只能接一个订单一次

    def __str__(self):
        return f"{self.user.username} 接了订单 {self.order.order_no}"

class Announcement(models.Model):
    """系统公告"""
    title = models.CharField(max_length=200, verbose_name='公告标题')
    content = models.TextField(verbose_name='公告内容')
    announcement_type = models.CharField(max_length=20, verbose_name='公告类型', default='system')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    start_time = models.DateTimeField(null=True, blank=True, verbose_name='开始时间')
    end_time = models.DateTimeField(null=True, blank=True, verbose_name='结束时间')
    priority = models.IntegerField(default=0, verbose_name='优先级')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '系统公告'
        verbose_name_plural = '系统公告管理'
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return self.title


class UserFeedback(models.Model):
    """用户反馈"""
    FEEDBACK_TYPES = [
        ('bug', '问题反馈'),
        ('suggestion', '功能建议'),
        ('complaint', '投诉建议'),
        ('other', '其他'),
    ]

    STATUS_CHOICES = [
        ('pending', '待处理'),
        ('processing', '处理中'),
        ('resolved', '已解决'),
        ('closed', '已关闭'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name='用户')
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPES, verbose_name='反馈类型')
    title = models.CharField(max_length=200, verbose_name='反馈标题')
    content = models.TextField(verbose_name='反馈内容')
    contact = models.CharField(max_length=50, blank=True, verbose_name='联系方式')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='状态')
    reply = models.TextField(blank=True, verbose_name='回复内容')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '用户反馈'
        verbose_name_plural = '用户反馈管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_feedback_type_display()} - {self.title}"



