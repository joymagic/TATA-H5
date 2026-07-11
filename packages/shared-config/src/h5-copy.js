export const H5_COPY = {
  loading: {
    brand: "TATA木门",
  },
  home: {
    titleLines: ["测测你的宅家人格", "静化到哪一步了"],
    startButton: "开始测试 →",
  },
  rules: {
    title: "活动规则",
    items: [
      { label: "活动时间", text: "2026.07.23 - 2026.08.31" },
      { label: "参与方式", text: "完成 5 道静音人格测试并提交客资后，可参与抽奖。" },
      { label: "抽奖规则", text: "每人限抽奖 1 次。" },
      {
        label: "奖券使用",
        text: "到店下单签约后出示中奖券截图核销，请妥善保存，活动到期后自动失效。",
      },
    ],
  },
  resultLoading: {
    titleLines: ["正在生成你的", "静音人格"],
    error: "结果生成失败，请重试",
    retry: "重新生成",
  },
  result: {
    cta: "即刻参与抽奖",
    shareButtons: ["保存本地", "朋友圈", "微信"],
  },
  poster: {
    bottomLines: ["我也去测测→", "扫码生成我的静音人格海报"],
    qrLabel: "二维码",
  },
  share: {
    title: "我正在玩TATA的静音人格测试，你也来试试吧",
    description: "原来我已经“静”化到……",
  },
  lead: {
    title: "获取专属静音方案",
    description:
      "提交信息后，我们的品牌顾问将与您联系，为您提供适合不同空间的专属静音方案。",
    fields: {
      name: {
        label: "姓名",
        placeholder: "请填写您的姓名",
      },
      phone: {
        label: "手机号",
        placeholder: "请填写手机号码",
      },
      city: {
        label: "城市",
        placeholder: "请选择城市",
      },
    },
    privacy:
      "我已阅读并同意《隐私政策》，并授权TATA木门处理我的个人信息，用于提供定制化服务及后续联系。",
    submit: "提交并开始抽奖",
    validation: {
      name: "请填写姓名",
      phone: "请填写正确的手机号码",
      city: "请选择城市",
      privacy: "请阅读并同意《隐私政策》",
      submitFailed: "提交失败，请稍后重试",
    },
  },
  lottery: {
    button: "点击抽奖",
    limitTip: "每人限抽奖 1 次",
  },
  lotteryResult: {
    title: "开始抽奖",
    description: "点击转盘即可抽取专属奖券",
    resultLabel: "恭喜您，抽中幸运好礼",
    couponTip:
      "到店下单签约后出示中奖券截图核销，请妥善保存，活动到期后自动失效",
    backHome: "返回首页",
  },
  system: {
    devEnv: "DEV ENV",
    shareInWechat: "请在微信内打开后使用分享功能",
    posterReady: "海报已生成，请长按图片保存",
    posterFailed: "海报生成失败，请稍后重试",
    drawFailed: "抽奖失败，请稍后重试",
    drawLeadRequired: "请先完成信息填写",
    drawInactive: "活动不在有效期内",
  },
};
