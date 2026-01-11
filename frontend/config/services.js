// miniprogram/config/services.js
 
/**
 * 服务列表配置
 * 统一抽成标准：快递40%、代课/刷课/外卖10%、代写20%、代跑20%
 * 加价抢单部分不抽成，全部给骑手
 */
export const serviceList = [
  // 快递服务类别（按尺寸标准规范）
  { 
    id: 1, 
    name: '小件快递', 
    iconPath: '/images/express-icon.png', 
    bgClass: 'bg-green',
    price: '2.5元/个',
    commission: 1.5,  
    commissionRate: 0.4,  
    platformFee: 1,  
    sizeSpec: {
      standard: '15*15*15cm以下',
      description: '长宽高均不超过15厘米的小件包裹'
    },
    description: '小件快递服务，2.5元一个',
    pagePath: '/pages/fetch-express/fetch-express'
  },
  { 
    id: 2, 
    name: '中件快递', 
    iconPath: '/images/express-icon.png', 
    bgClass: 'bg-blue',
    price: '4元/个',
    commission: 2.4,
    commissionRate: 0.4,
    platformFee: 1.6,
    sizeSpec: {
      standard: '30*30*30cm以下',
      description: '长宽高均不超过30厘米的中件包裹'
    },
    description: '中件快递服务，4元一个',
    pagePath: '/pages/fetch-express/fetch-express'
  },
  { 
    id: 3, 
    name: '大件快递', 
    iconPath: '/images/express-icon.png', 
    bgClass: 'bg-orange',
    price: '5元/个',
    commission: 3,
    commissionRate: 0.4,
    platformFee: 2,
    sizeSpec: {
      standard: '45*45*45cm以下',
      description: '体积不超过45×45×45立方厘米的大件包裹'
    },
    description: '大件快递服务，5元一个',
    pagePath: '/pages/fetch-express/fetch-express'
  },
  { 
    id: 4, 
    name: '特大件1', 
    iconPath: '/images/express-icon.png', 
    bgClass: 'bg-red',
    price: '按重量计算',
    commissionRate: 0.4,
    weightPricing: {
      enabled: true,
      unitPrice: 10,  // 10元/kg
      description: '按重量计费，10元/公斤'
    },
    sizeSpec: {
      standard: '45cm以上',
      description: '单边长度超过45厘米，按重量计算'
    },
    description: '特大件快递服务1，45cm以上按重量计算',
    pagePath: '/pages/fetch-express/fetch-express'
  },
  { 
    id: 5, 
    name: '特大件2', 
    iconPath: '/images/express-icon.png', 
    bgClass: 'bg-purple',
    price: '按重量计算',
    commissionRate: 0.4,
    weightPricing: {
      enabled: true,
      unitPrice: 15,  // 15元/kg
      description: '按重量计费，15元/公斤'
    },
    sizeSpec: {
      standard: '60cm以上',
      description: '单边长度超过60厘米，按重量计算'
    },
    description: '特大件快递服务2，60cm以上按重量计算',
    pagePath: '/pages/fetch-express/fetch-express'
  },
  
  // 代课服务（详细配置）
  { 
    id: 6, 
    name: '代课服务', 
    iconPath: '/images/class-icon.png', 
    bgClass: 'bg-yellow',
    basePrice: 25,
    price: '25元/节起',
    options: {
      base: { name: '代课', price: 25 },
      exam: { name: '含考试', price: 10 },
      homework: { name: '含作业', price: 8 },
      discussion: { name: '含讨论', price: 5 }
    },
    commissionRate: 0.1,
    description: '代课服务25元/节，考试+10元，作业+8元，讨论+5元，抽成10%',
    pagePath: '/pages/substitute-class/substitute-class'
  },
  
  // 刷课服务（详细配置）
  { 
    id: 7, 
    name: '刷课服务', 
    iconPath: '/images/study-icon.png', 
    bgClass: 'bg-green',
    basePrice: 3,
    price: '3元/科起',
    options: {
      base: { name: '刷课', price: 3 },
      exam: { name: '考试', price: 10 },
      homework: { name: '作业', price: 8 },
      discussion: { name: '讨论', price: 5 }
    },
    commissionRate: 0.1,
    description: '刷课服务3元/科，考试10元，作业8元，讨论5元，抽成10%',
    pagePath: '/pages/course-brush/course-brush'
  },
  
  // 代写服务
  { 
    id: 8, 
    name: '代写服务', 
    iconPath: '/images/zhidao-icon.png', 
    bgClass: 'bg-purple',
    price: '100元/次',
    commission: 80,  // 100*0.8
    commissionRate: 0.2,
    platformFee: 20,  // 100*0.2
    description: '代写服务，100元一次，抽成20%',
    pagePath: '/pages/other-services/other-services'
  },
  
  // 代跑服务
  { 
    id: 9, 
    name: '代跑服务', 
    iconPath: '/images/zhidao-icon.png', 
    bgClass: 'bg-blue',
    price: '1.8元/公里',
    commission: 1.44,
    commissionRate: 0.2,
    platformFee: 0.36,
    description: '代跑服务，1.8元每公里，抽成20%',
    pagePath: '/pages/other-services/other-services'
  },
  
  // 外卖代取
  { 
    id: 10, 
    name: '外卖代取', 
    iconPath: '/images/takeout-icon.png', 
    bgClass: 'bg-teal',
    price: '2.5元/个',
    commission: 2.25,
    commissionRate: 0.1,
    platformFee: 0.25,
    description: '外卖代取服务，2.5元一个，抽成10%',
    pagePath: '/pages/takeout-fetch/takeout-fetch'
  },
  
  // 超市代买
  { 
    id: 11, 
    name: '超市代买', 
    iconPath: '/images/supermarket-icon.png', 
    bgClass: 'bg-cyan',
    price: '按快递标准',
    description: '超市代买服务，收费标准按照代取快递标准计算，抽成40%',
    pagePath: '/pages/supermarket/supermarket',
    commissionRate: 0.4
  }
];
 
/**
 * 加价抢单配置
 * 加价部分不抽成，全部给骑手
 */
export const surgePricingConfig = {
  enabled: true,
  commissionRate: 0,  // 加价部分0抽成
  description: '加价抢单部分全部归骑手，平台不抽成'
};
 
/**
 * 计算抽成的工具函数
 */
export const calculateCommission = (price, commissionRate, surgePrice = 0) => {
  const baseCommission = price * commissionRate;
  const surgeCommission = surgePrice * surgePricingConfig.commissionRate;
  return {
    totalCommission: baseCommission + surgeCommission,
    baseCommission,
    surgeCommission,
    riderEarnings: price - baseCommission + surgePrice
  };
};
 
/**
 * 页面路径配置
 */
export const pagePaths = {
  customerService: '/pages/customer-service/customer-service',
};