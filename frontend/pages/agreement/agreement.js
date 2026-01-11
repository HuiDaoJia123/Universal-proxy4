// pages/agreement/agreement.js
Page({
  data: {
    type: '', // 'privacy', 'user', 'student-auth'
    title: '',
    content: []
  },
 
  onLoad: function(options) {
    const type = options.type || 'privacy';
    this.setData({ type });
    this.loadAgreementContent(type);
  },
 
  loadAgreementContent: function(type) {
    const contents = {
      privacy: {
        title: '隐私政策',
        sections: [
          {
            title: '前言',
            text: '我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。我们致力于维持您对我们的信任，恪守以下原则，保护您的个人信息：权责一致原则、目的明确原则、选择同意原则、最小必要原则、确保安全原则、主体参与原则、公开透明原则等。'
          },
          {
            title: '我们如何收集和使用您的个人信息',
            text: '为提供校园生活服务，我们需要收集您的手机号码，具体用于：'
          },
          {
            title: '手机号码收集与使用',
            text: '1. 用户身份验证与登录\n2. 订单联系与通知服务\n3. 安全保障与风险防控\n4. 客服支持与问题反馈'
          },
          {
            title: '个人信息收集范围',
            text: '• 基本信息：昵称、头像、性别\n• 身份信息：真实姓名、学校名称、学号（实名认证时）\n• 联系方式：手机号码\n• 证件信息：学生证照片（实名认证时）'
          },
          {
            title: '信息使用目的',
            text: '我们收集您的个人信息主要用于：\n1. 提供校园生活服务功能\n2. 用户身份认证与权限管理\n3. 订单处理与服务交付\n4. 客服支持与用户体验优化\n5. 安全防护与欺诈检测'
          },
          {
            title: '信息保护措施',
            text: '1. 采用SSL加密传输\n2. 严格访问权限控制\n3. 定期安全审计与检测\n4. 数据备份与灾难恢复'
          },
          {
            title: '您的权利',
            text: '您有权访问、更正、删除您的个人信息，有权撤回同意授权，有权注销账户。'
          },
          {
            title: '联系我们',
            text: '如有任何疑问，请联系：privacy@campus-life.com'
          }
        ]
      },
      
      user: {
        title: '用户协议',
        sections: [
          {
            title: '服务说明',
            text: '本应用为校园生活服务平台，提供以下服务：\n1. 外卖代取服务\n2. 快递代收服务\n3. 学生证认证服务\n4. 其他校园生活服务'
          },
          {
            title: '用户义务',
            text: '1. 提供真实、准确的个人信息\n2. 遵守国家法律法规和平台规则\n3. 不得发布违法信息或进行欺诈行为\n4. 尊重其他用户和服务提供者'
          },
          {
            title: '知识产权',
            text: '本应用的所有内容均受知识产权法律保护。'
          },
          {
            title: '免责声明',
            text: '1. 本服务仅作为信息平台，不对服务提供者的行为承担责任\n2. 因不可抗力导致的服务中断，本应用不承担责任'
          },
          {
            title: '协议修改',
            text: '我们有权根据需要修改本协议，修改后会在应用内公示。'
          },
          {
            title: '争议解决',
            text: '如发生争议，双方应友好协商解决；协商不成的，可向本应用运营地人民法院起诉。'
          }
        ]
      },
      
      'student-auth': {
        title: '学生认证服务协议',
        sections: [
          {
            title: '认证目的',
            text: '学生认证旨在验证您的学生身份，以便为您提供学生专属服务和优惠。'
          },
          {
            title: '信息收集说明',
            text: '为完成学生认证，我们需要收集以下信息：\n1. 真实姓名：用于身份验证\n2. 学校名称：确认您的在校身份\n3. 学号：唯一身份标识\n4. 学生证照片：证明学生身份的有效凭证'
          },
          {
            title: '信息使用承诺',
            text: '1. 仅用于学生身份验证\n2. 严格保密，不向第三方泄露\n3. 认证完成后安全存储\n4. 仅在必要时用于客服支持'
          },
          {
            title: '认证流程',
            text: '1. 填写个人信息（姓名、学校、学号）\n2. 上传清晰的学生证照片\n3. 等待人工审核（1-3个工作日）\n4. 认证通过后享受学生特权'
          },
          {
            title: '认证标准',
            text: '1. 学生证必须包含姓名、学号、学校信息\n2. 照片必须清晰可辨认\n3. 学生证必须在有效期内'
          },
          {
            title: '隐私保护',
            text: '1. 采用加密技术保护传输安全\n2. 严格限制信息访问权限\n3. 定期进行安全审计'
          },
          {
            title: '违规处理',
            text: '如发现提供虚假信息，我们将：\n1. 取消学生认证资格\n2. 限制账户相关功能\n3. 保留追究法律责任的权利'
          },
          {
            title: '联系方式',
            text: '认证问题请联系：student-auth@campus-life.com'
          }
        ]
      }
    };
 
    const content = contents[type];
    if (content) {
      wx.setNavigationBarTitle({
        title: content.title
      });
      this.setData({
        title: content.title,
        content: content.sections
      });
    }
  }
});