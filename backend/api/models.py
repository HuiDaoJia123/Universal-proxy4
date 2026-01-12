# backend/api/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid


class UserProfile(models.Model):
    """用户资料扩展"""
    GENDER_CHOICES = [
        ('male', '男'),
        ('female', '女'),
        ('unknown', '未知'),
    ]

    LOGIN_TYPE_CHOICES = [
        ('wechat', '微信登录'),
        ('phone', '手机号登录'),
        ('account', '账号登录'),
        ('quick', '快速登录'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name='用户')

    # 微信相关字段
    openid = models.CharField(max_length=100, unique=True, null=True, blank=True, verbose_name='微信OpenID')
    wechat_nickname = models.CharField(max_length=100, blank=True, verbose_name='微信昵称')
    wechat_avatar = models.URLField(max_length=500, blank=True, verbose_name='微信头像')
    wechat_unionid = models.CharField(max_length=100, unique=True, null=True, blank=True, verbose_name='微信UnionID')
    login_type = models.CharField(max_length=10, choices=LOGIN_TYPE_CHOICES, default='wechat', verbose_name='登录方式')

    # 用户基本信息
    phone = models.CharField(max_length=11, verbose_name='绑定手机号', blank=True, default='')
    real_name = models.CharField(max_length=50, verbose_name='真实姓名')
    student_id = models.CharField(max_length=20, verbose_name='学号')

    # 个人资料
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='unknown', verbose_name='性别')
    school = models.CharField(max_length=100, blank=True, null=True, verbose_name='学校')
    college = models.CharField(max_length=100, blank=True, null=True, verbose_name='学院')
    major = models.CharField(max_length=100, blank=True, null=True, verbose_name='专业')

    # 状态信息
    is_rider = models.BooleanField(default=False, verbose_name='是否是骑手')
    is_online = models.BooleanField(default=False, verbose_name='是否在线')
    is_verified = models.BooleanField(default=False, verbose_name='是否实名认证')
    credit_score = models.IntegerField(default=100, verbose_name='诚信度分数')

    # 黑名单相关
    is_blacklisted = models.BooleanField(default=False, verbose_name='是否在黑名单')
    blacklist_reason = models.TextField(blank=True, verbose_name='黑名单原因')
    blacklist_until = models.DateTimeField(null=True, blank=True, verbose_name='黑名单到期时间')

    # 登录统计
    last_login_time = models.DateTimeField(auto_now=True, verbose_name='最后登录时间')
    last_logout_time = models.DateTimeField(null=True, blank=True, verbose_name='最后退出时间')
    login_count = models.IntegerField(default=0, verbose_name='登录次数')

    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    # 头像
    avatar_url = models.URLField(max_length=500, blank=True, verbose_name='头像URL')

    class Meta:
        verbose_name = '用户资料'
        verbose_name_plural = '用户资料管理'
        indexes = [
            models.Index(fields=['openid']),
            models.Index(fields=['phone']),
            models.Index(fields=['student_id']),
            models.Index(fields=['is_online']),
            models.Index(fields=['is_rider']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.real_name or '未认证'}"

    def is_active_user(self):
        """判断用户是否活跃"""
        if self.is_blacklisted:
            return False
        if self.blacklist_until and self.blacklist_until > timezone.now():
            return False
        return True

    def update_login_info(self):
        """更新登录信息"""
        self.login_count += 1
        self.last_login_time = timezone.now()
        self.is_online = True
        self.save()


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

    def is_active(self):
        """判断记录是否有效"""
        if self.status != 'active':
            return False
        if self.expiry_date and self.expiry_date < timezone.now():
            return False
        return True


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
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '用户钱包'
        verbose_name_plural = '用户钱包管理'

    def __str__(self):
        return f"{self.user.username} - 余额: {self.balance}"

    def available_balance(self):
        """可用余额"""
        return self.balance - self.frozen_balance


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

    # 新增字段
    metadata = models.JSONField(default=dict, blank=True, verbose_name='元数据')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')

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

    # 新增字段
    metadata = models.JSONField(default=dict, blank=True, verbose_name='元数据')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='阅读时间')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '用户通知'
        verbose_name_plural = '用户通知管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"

    def mark_as_read(self):
        """标记为已读"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class Conversation(models.Model):
    """会话"""
    participants = models.ManyToManyField(User, verbose_name='参与者')
    last_message = models.TextField(blank=True, verbose_name='最后一条消息')
    last_message_time = models.DateTimeField(auto_now=True, verbose_name='最后消息时间')

    # 新增字段
    unread_count = models.IntegerField(default=0, verbose_name='未读消息数')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '会话'
        verbose_name_plural = '会话管理'
        ordering = ['-last_message_time']

    def __str__(self):
        participants_str = ', '.join([user.username for user in self.participants.all()])
        return f"{participants_str} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    def update_last_message(self, message, sender):
        """更新最后一条消息"""
        self.last_message = message[:100]  # 只保存前100个字符
        self.last_message_time = timezone.now()
        self.unread_count += 1
        self.save()


class Message(models.Model):
    """消息"""
    MESSAGE_TYPES = [
        ('text', '文本'),
        ('image', '图片'),
        ('file', '文件'),
        ('location', '位置'),
        ('system', '系统消息'),
    ]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, verbose_name='会话')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='发送者')
    content = models.TextField(verbose_name='内容')
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text', verbose_name='消息类型')
    is_read = models.BooleanField(default=False, verbose_name='是否已读')

    # 新增字段
    metadata = models.JSONField(default=dict, blank=True, verbose_name='元数据')

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

    PAYMENT_STATUS_CHOICES = [
        ('pending', '待支付'),
        ('paid', '已支付'),
        ('refunded', '已退款'),
        ('cancelled', '已取消'),
    ]

    order_no = models.CharField(
        max_length=50,
        unique=True,
        default=uuid.uuid4,
        verbose_name='订单编号')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders', verbose_name='用户')
    rider = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='rider_orders', verbose_name='骑手')
    category = models.ForeignKey(OrderCategory, on_delete=models.SET_NULL, null=True, verbose_name='订单分类')
    title = models.CharField(max_length=200, verbose_name='订单标题')
    description = models.TextField(verbose_name='订单描述')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='价格')

    # 状态字段
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='状态')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending',
                                      verbose_name='支付状态')

    # 位置信息
    pickup_location = models.CharField(max_length=200, blank=True, verbose_name='取件地点')
    delivery_location = models.CharField(max_length=200, blank=True, verbose_name='送达地点')

    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name='接单时间')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name='取消时间')

    class Meta:
        verbose_name = '订单'
        verbose_name_plural = '订单'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['rider', 'status']),
        ]

    def __str__(self):
        return f"{self.order_no} - {self.title}"

    def can_be_accepted(self):
        """判断订单是否可以被接单"""
        return self.status == 'pending' and self.payment_status == 'paid'

    def complete_order(self):
        """完成订单"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()


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
    ANNOUNCEMENT_TYPES = [
        ('system', '系统公告'),
        ('activity', '活动公告'),
        ('update', '更新公告'),
        ('important', '重要通知'),
        ('general', '一般通知'),
    ]

    title = models.CharField(max_length=200, verbose_name='公告标题')
    content = models.TextField(verbose_name='公告内容')
    announcement_type = models.CharField(max_length=20, choices=ANNOUNCEMENT_TYPES, default='system',
                                         verbose_name='公告类型')

    # 新增字段
    cover_image = models.URLField(max_length=500, blank=True, null=True, verbose_name='封面图片')

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

    def is_currently_active(self):
        """判断公告当前是否生效"""
        if not self.is_active:
            return False
        now = timezone.now()
        if self.start_time and self.start_time > now:
            return False
        if self.end_time and self.end_time < now:
            return False
        return True


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

    def mark_as_resolved(self, reply_content):
        """标记为已解决"""
        self.status = 'resolved'
        self.reply = reply_content
        self.save()


# 微信会话模型
class WechatSession(models.Model):
    """微信会话存储"""
    openid = models.CharField(max_length=100, unique=True, verbose_name='微信OpenID')
    session_key = models.CharField(max_length=100, verbose_name='会话密钥')
    unionid = models.CharField(max_length=100, blank=True, null=True, verbose_name='微信UnionID')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    expires_at = models.DateTimeField(verbose_name='过期时间')

    class Meta:
        verbose_name = '微信会话'
        verbose_name_plural = '微信会话管理'
        indexes = [
            models.Index(fields=['openid']),
        ]

    def __str__(self):
        return f"{self.openid}"

    def is_valid(self):
        """判断会话是否有效"""
        return self.expires_at > timezone.now()


# 地址模型
class Address(models.Model):
    """用户地址"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses', verbose_name='用户')
    name = models.CharField(max_length=50, verbose_name='收货人姓名')
    phone = models.CharField(max_length=11, verbose_name='联系电话')
    address = models.CharField(max_length=200, verbose_name='详细地址')
    is_default = models.BooleanField(default=False, verbose_name='是否默认地址')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '用户地址'
        verbose_name_plural = '用户地址管理'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.name} - {self.address}"

    def save(self, *args, **kwargs):
        """保存时，如果是默认地址，取消其他地址的默认状态"""
        if self.is_default:
            # 获取所有当前用户的地址
            Address.objects.filter(user=self.user).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


# 订单评价模型
class OrderReview(models.Model):
    """订单评价"""
    RATING_CHOICES = [
        (1, '1星'),
        (2, '2星'),
        (3, '3星'),
        (4, '4星'),
        (5, '5星'),
    ]

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='review', verbose_name='订单')
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='评价用户')
    rider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_reviews',
                              verbose_name='被评价骑手')
    rating = models.IntegerField(choices=RATING_CHOICES, verbose_name='评分')
    comment = models.TextField(blank=True, verbose_name='评价内容')
    is_anonymous = models.BooleanField(default=False, verbose_name='是否匿名')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='评价时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '订单评价'
        verbose_name_plural = '订单评价管理'

    def __str__(self):
        return f"{self.order.order_no} - {self.rating}星"