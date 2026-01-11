from django.contrib import admin
from django.contrib.auth.models import User
from django.utils import timezone
from .models import UserProfile, BlacklistRecord, AuditApplication, Wallet, Transaction, Notification, Conversation, \
    Message


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'real_name', 'student_id', 'is_verified', 'credit_score', 'is_blacklisted',
                    'last_login_time', 'created_at')
    list_filter = ('is_verified', 'is_blacklisted', 'created_at')
    search_fields = ('user__username', 'real_name', 'student_id', 'phone')
    readonly_fields = ('created_at', 'updated_at', 'last_login_time', 'login_count')
    ordering = ('-created_at',)

    fieldsets = (
        ('基本信息', {
            'fields': ('user', 'phone', 'real_name', 'student_id')
        }),
        ('认证状态', {
            'fields': ('is_verified', 'credit_score')
        }),
        ('黑名单状态', {
            'fields': ('is_blacklisted', 'blacklist_reason', 'blacklist_until')
        }),
        ('登录信息', {
            'fields': ('last_login_time', 'last_logout_time', 'login_count')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(BlacklistRecord)
class BlacklistRecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'reason', 'status', 'created_at', 'expiry_date', 'reporter')
    list_filter = ('status', 'created_at', 'expiry_date')
    search_fields = ('user__username', 'reason')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)

    actions = ['lift_blacklist', 'mark_as_expired']

    def lift_blacklist(self, request, queryset):
        for record in queryset:
            record.status = 'lifted'
            record.save()
            # 同时更新用户资料
            profile = UserProfile.objects.filter(user=record.user).first()
            if profile:
                profile.is_blacklisted = False
                profile.save()
        self.message_user(request, f'已解除 {queryset.count()} 条黑名单记录')

    lift_blacklist.short_description = '解除选中黑名单'

    def mark_as_expired(self, request, queryset):
        queryset.update(status='expired')
        self.message_user(request, f'已标记 {queryset.count()} 条记录为过期')

    mark_as_expired.short_description = '标记为过期'

    fieldsets = (
        ('黑名单信息', {
            'fields': ('user', 'reason', 'status', 'reporter')
        }),
        ('时间设置', {
            'fields': ('created_at', 'expiry_date')
        }),
    )


@admin.register(AuditApplication)
class AuditApplicationAdmin(admin.ModelAdmin):
    list_display = ('user', 'audit_type', 'status', 'created_at', 'reviewed_at', 'reviewer')
    list_filter = ('audit_type', 'status', 'created_at', 'reviewed_at')
    search_fields = ('user__username', 'audit_type', 'reject_reason')
    readonly_fields = ('created_at', 'application_data')
    ordering = ('-created_at',)

    actions = ['approve_selected', 'reject_selected']

    def approve_selected(self, request, queryset):
        for application in queryset.filter(status='pending'):
            application.status = 'approved'
            application.reviewed_at = timezone.now()
            application.reviewer = request.user
            application.save()

            # 如果是实名认证，更新用户状态
            if application.audit_type == 'real_name':
                profile = UserProfile.objects.filter(user=application.user).first()
                if profile:
                    profile.is_verified = True
                    profile.save()

        self.message_user(request, f'已通过 {queryset.count()} 条审核申请')

    approve_selected.short_description = '通过选中申请'

    def reject_selected(self, request, queryset):
        for application in queryset.filter(status='pending'):
            application.status = 'rejected'
            application.reviewed_at = timezone.now()
            application.reviewer = request.user
            application.save()

        self.message_user(request, f'已拒绝 {queryset.count()} 条审核申请')

    reject_selected.short_description = '拒绝选中申请'

    fieldsets = (
        ('申请信息', {
            'fields': ('user', 'audit_type', 'status')
        }),
        ('申请数据', {
            'fields': ('application_data',),
            'classes': ('collapse',)
        }),
        ('审核信息', {
            'fields': ('reject_reason', 'reviewed_at', 'reviewer')
        }),
    )


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'frozen_balance', 'total_income', 'total_expenditure', 'updated_at')
    list_filter = ('updated_at',)
    search_fields = ('user__username',)
    readonly_fields = ('updated_at',)
    ordering = ('-updated_at',)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'transaction_type', 'amount', 'status', 'description', 'created_at')
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('description', 'wallet__user__username')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'title', 'content')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('get_participants', 'last_message', 'last_message_time', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('last_message',)
    readonly_fields = ('created_at',)
    ordering = ('-last_message_time',)

    def get_participants(self, obj):
        return ', '.join([user.username for user in obj.participants.all()])

    get_participants.short_description = '参与者'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'sender', 'content', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('sender__username', 'content')
    readonly_fields = ('created_at',)
    ordering = ('created_at',)


# 自定义User admin
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = '用户资料'


class UserAdmin(admin.ModelAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'is_staff', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'first_name', 'last_name', 'email')


# 重新注册User模型
admin.site.unregister(User)
admin.site.register(User, UserAdmin)