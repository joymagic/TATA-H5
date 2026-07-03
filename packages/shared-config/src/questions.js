export const QUIZ_WEIGHTS = [1, 2, 2, 2, 1];

export const OPTION_SCORES = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
};

export const QUESTIONS = [
  {
    no: 1,
    title: "宅家休息，你的据点是？",
    weight: 1,
    options: [
      { key: "A", text: "茶室/客厅喝茶聊天" },
      { key: "B", text: "书房看书休息" },
      { key: "C", text: "卧室躺平睡大觉" },
      { key: "D", text: "电竞房通宵开黑" },
    ],
  },
  {
    no: 2,
    title: "哪种噪音会直接炸掉你的情绪？",
    weight: 2,
    options: [
      { key: "A", text: "家里电视声、闲聊声" },
      { key: "B", text: "杂音打断阅读 / 办公思路" },
      { key: "C", text: "窗外车流、客厅人声吵到失眠" },
      { key: "D", text: "外界噪音干扰游戏直播收音" },
    ],
  },
  {
    no: 3,
    title: "你心中理想居家安静氛围？",
    weight: 2,
    options: [
      { key: "A", text: "有点人声也没关系，松弛自在" },
      { key: "B", text: "没有多余杂音，沉浸式独处" },
      { key: "C", text: "静谧无声，深度睡眠" },
      { key: "D", text: "完全隔绝外界，专属私人安静空间" },
    ],
  },
  {
    no: 4,
    title: "独处充电，你偏爱哪种环境？",
    weight: 2,
    options: [
      { key: "A", text: "轻松舒适，不压抑" },
      { key: "B", text: "隔绝杂音，沉浸式放空" },
      { key: "C", text: "静谧无声，安心休息" },
      { key: "D", text: "肆意放纵，不被打扰" },
    ],
  },
  {
    no: 5,
    title: "空闲时间最喜欢干嘛？",
    weight: 1,
    options: [
      { key: "A", text: "约朋友在家小聚下午茶" },
      { key: "B", text: "阅读、学习、创作" },
      { key: "C", text: "早睡补觉、放空冥想" },
      { key: "D", text: "打游戏、看电影" },
    ],
  },
];
