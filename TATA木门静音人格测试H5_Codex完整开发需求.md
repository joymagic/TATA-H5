# TATA木门「静音人格测试」H5 + Admin 完整开发需求

> 用途：直接交给 Codex 进行项目搭建、开发、测试与腾讯云轻量应用服务器部署。  
> 原则：需求文档中的截图只用于说明链路、功能和信息结构；最终 UI 必须跟随 TATA 木门本次电竞联名 KV，以及已确认的红黑电竞视觉方向。  
> 所有 H5 用户可见文案和按钮文案必须严格使用本文件中的正式文案；不得自行润色、缩写或补写。
> 文档中标注为“系统异常兜底文案”或“待活动方确认”的内容不属于已确认活动文案；上线前必须由产品方确认。

---

## 1. 项目目标

开发一套完整的活动系统，包括：

1. 移动端 H5：完成静音人格测试、结果展示、分享、客资收集、抽奖及抽奖结果展示。
2. Admin 管理后台：分角色登录、活动数据看板、用户数据看板、数据导出。
3. 后端 API：完成测试结果计算、客资保存、抽奖券发放、权限控制和数据统计。
4. 开发环境与测试环境严格隔离：代码、数据库、Redis、券码池、账号、日志、部署目录、域名全部分开。
5. 部署至腾讯云轻量应用服务器，使用 Docker Compose + Nginx。

---

## 2. 整体链路

```text
Loading
  ↓
Home 首页
  ↓
5 道人格测试题
  ↓
结果计算 Loading
  ↓
人格结果页
  ├─ 主要引导：填写客资
  ├─ 保存本地
  ├─ 朋友圈
  └─ 微信
  ↓
填写客资
  ↓
参与抽奖
  ↓
抽奖结果展示
  ↓
返回首页
```

规则：

- 人格结果页是测试结果展示与客资转化页面。
- 用户得到人格结果后即可使用“保存本地 / 朋友圈 / 微信”三个分享功能，分享不依赖客资提交。
- 用户点击结果页主按钮后进入客资页。
- 客资提交成功后进入抽奖页面。
- 抽奖结果页是完整业务链路的终点，只保留返回首页操作。
- 返回首页仅清除当前浏览器流程状态，不删除服务端已经保存的测试、客资和抽奖数据。
- 是否允许再次测试、是否允许再次提交客资、是否允许再次抽奖，应由活动配置控制。

---

## 3. UI 设计规范

### 3.1 总体方向

关键词：

- TATA 品牌红
- 红黑电竞
- 霓虹科技
- 现代时尚潮酷
- 海报感
- 强对比
- 移动端沉浸体验

不得做成普通问卷或普通表单套红色皮肤。

### 3.2 色彩

建议基础色：

- 品牌红：`#FF1E2D`
- 深黑：`#0D0D0F`
- 深灰：`#1A1A1E`
- 白色：`#FFFFFF`
- 辅助冷色仅少量使用，用于形成红蓝霓虹对比，不得抢占品牌红主色。

### 3.3 视觉元素

可使用：

- 红色霓虹光效
- 斜切边框
- 几何框体
- 半透明深色面板
- 红色扫描线
- 声波
- 粒子
- 网格
- 烟雾
- 能量条
- 门的轮廓
- 轻微故障艺术效果

限制：

- 不使用大面积白色圆角卡片。
- 不照搬需求截图中的绿色视觉。
- 不直接套用通用电竞模板。
- 不把桌面电竞官网压缩成手机页面。
- 不牺牲阅读性和点击区域。
- H5 需优先适配 375px、390px、430px 宽度，并兼容微信内置浏览器和 Safari。

### 3.4 按钮

主按钮：

- 红色渐变底
- 斜切或切角边框
- 轻微外发光
- 点击时压缩或闪光反馈
- 按钮文案只能使用本文件规定的正式文案

次按钮：

- 黑底红边
- 线性图标
- 选中或点击后红色点亮

### 3.5 动效

统一使用四类动效：

1. 扫描：Loading、计算、输入框焦点、结果揭晓。
2. 点亮：选项选中、按钮点击、人格出现。
3. 切换：横向滑动、斜切遮罩、红色闪光。
4. 粒子与光晕：只用于氛围增强，不遮挡文字和按钮。

页面动画需控制性能，抽奖动画建议 2–3 秒。

---


## 3.6 已提供项目素材（必须优先使用）

以下素材已经放入项目文件夹，Codex 开发时必须先扫描、确认并建立素材清单，不得重复生成同类占位素材，也不得擅自删除、改名或覆盖原文件。

### 3.6.1 已有素材目录与文件

```text
静音仓产品/
静音日icon.png
logo.png
最终生成海报图参考.png
TATA木门静音人格测试H5_Codex完整开发需求.md
```

### 3.6.2 素材用途说明

#### `静音仓产品/`

用途：

- 存放本次活动涉及的静音产品图、门体图、产品细节图或其他品牌产品素材。
- H5 首页、人格结果页、结果海报、客资页、抽奖页如需出现产品或门体，应优先从此目录中选择素材。
- 四种人格场景中的门体和产品展示，应优先使用该目录内的真实产品素材，不得使用无关品牌或通用门体素材替代。

开发要求：

- 开发前先递归扫描该目录。
- 输出完整文件清单、尺寸、格式、透明背景情况和建议用途。
- 不确认具体用途的素材先保留，不得删除。
- 如需压缩或转换格式，应保留原文件，并输出 Web 使用版本。
- 建议将 Web 优化后的文件放入：

```text
apps/h5/public/assets/products/
```

#### `静音日icon.png`

用途：

- 作为活动相关的静音日标识、装饰图形或页面视觉元素。
- 可用于 Home、结果页、分享海报或活动信息区域。
- 具体出现位置需结合最终 UI 设计，不得随意拉伸、变形或改变比例。

开发要求：

- 保留透明背景。
- 不擅自修改图形内容。
- 如需生成多尺寸版本，应保留源文件。
- 建议映射路径：

```text
apps/h5/public/assets/brand/silent-day-icon.png
```

#### `logo.png`

用途：

- TATA 木门品牌 Logo。
- 用于 Loading、Home、人格结果页、结果海报、抽奖结果页，以及必要的 Admin 登录页品牌区域。

开发要求：

- 保持原始比例。
- 不描边、不加阴影、不变形、不修改品牌颜色。
- 不与复杂背景直接混合导致识别不清。
- 建议映射路径：

```text
apps/h5/public/assets/brand/tata-logo.png
apps/admin/public/assets/brand/tata-logo.png
```

#### `最终生成海报图参考.png`

用途：

- 仅作为“最终人格结果海报”的版式、构图、信息层级和视觉风格参考。
- 重点参考：
  - 手机竖版比例
  - 人格等级和人格称号的主视觉层级
  - 家居场景与门体的结合方式
  - 品牌 Logo 的位置
  - 文案信息区
  - 二维码区域
  - 红黑电竞氛围
- 该文件不是直接交付图，也不是需要原样复制的静态页面。

开发要求：

- 结果海报需按四种人格分别生成。
- 海报文案必须使用本文件中已确认的正式文案。
- 海报中的二维码需根据实际活动链接动态生成。
- 海报合成需支持 Canvas 或等效方案。
- 如参考图中的内容与本需求文档冲突，以本需求文档的正式文案和业务规则为准。
- 建议保留参考文件在：

```text
docs/design-reference/最终生成海报图参考.png
```

#### `TATA木门静音人格测试H5_Codex完整开发需求.md`

用途：

- 本项目的开发需求主文档。
- Codex 开始开发前必须完整阅读。
- 后续开发中的页面、文案、规则、权限和环境隔离均以此文件为准。

规则：

- 不得在未确认的情况下覆盖本文件。
- 如开发过程中产生补充说明，应写入 `docs/` 下的新文档，或提交明确的变更记录。
- 如设计稿、截图或代码与本文件冲突，应先停止并列出冲突项，不得自行选择。

### 3.6.3 素材接入原则

1. 先盘点，再开发。
2. 先使用已有素材，再考虑补充素材。
3. 所有素材使用相对路径，不在代码中写本机绝对路径。
4. 原始素材与 Web 优化素材分开保存。
5. 文件名如需统一为英文，仅复制生成新文件，不修改或删除原文件。
6. 所有图片需检查：
   - 尺寸
   - 格式
   - 透明背景
   - 文件体积
   - 是否适合移动端
   - 是否存在版权或品牌使用限制
7. H5 首屏素材需要预加载或按需加载。
8. 大图需要生成 WebP/AVIF 等优化版本，同时保留 PNG/JPG 回退。
9. 结果海报使用的图片必须解决 Canvas 跨域问题，优先使用同域静态资源。
10. Codex 需要生成素材映射文件，例如：

```text
packages/shared-config/src/assets.ts
```

建议结构：

```ts
export const assets = {
  logo: "/assets/brand/tata-logo.png",
  silentDayIcon: "/assets/brand/silent-day-icon.png",
  posterReference: "/assets/reference/final-poster-reference.png",
  products: {
    // 扫描“静音仓产品”目录后补充
  },
};
```

### 3.6.4 Codex 开发前必须输出的素材检查结果

在进入 UI 开发前，Codex 必须先输出：

```text
1. 已扫描到的素材文件清单
2. 每个素材的尺寸、格式和文件大小
3. 每个素材建议使用的页面
4. 需要压缩或格式转换的素材
5. 缺失但开发必需的素材
6. 素材命名和目录整理建议
7. 是否存在重复素材或不可用素材
```

未经素材盘点，不直接使用临时占位图完成最终 UI。


## 4. H5 页面与正式文案

### 4.1 Loading 页面

页面作用：

- 加载核心图片、字体、音效和页面配置。
- 建立品牌电竞氛围。
- 加载完成后自动进入 Home。

正式可见元素：

- `TATA木门`
- 加载百分比，例如：`68%`

说明：

- 需求文档未明确其他 Loading 文案，不得自行添加营销口号。
- 可以用门的轮廓、声波、红色扫描线表现加载，但不增加未经确认的正文。

---

### 4.2 Home 首页

正式主标题：

```text
测测你的宅家人格
静化到哪一步了
```

正式按钮：

```text
开始测试 →
```

页面规则：

- 首页以移动端 KV 为核心。
- 顶部展示 TATA 木门 Logo。
- 可以保留音乐开关。
- 需求文档截图中的链路和位置只作参考，最终布局跟随红黑电竞视觉。
- 除上述已确认文案外，不自行增加参与人数、活动说明、营销副标题等内容；如后续补充，放入配置文件。

---

### 4.3 测试页

#### 4.3.1 页面通用元素

- 顶部返回按钮
- 题目进度：`01 / 05` 至 `05 / 05`
- 进度能量条
- 题目
- 四个选项
- 操作按钮

#### 4.3.2 操作规则

- 每题只能选择一个选项。
- 未选择时不可进入下一题。
- 原始需求未明确题目页是否使用显式“下一题”按钮，也未提供对应正式按钮文案。
- 默认推荐：用户点击选项后自动进入下一题；第 5 题选择完成后进入结果计算 Loading。
- 如最终确认使用显式按钮，必须由产品方补充正式文案，Codex 不得自行使用“下一题”或“查看结果”作为上线文案。
- 可允许用户返回上一题修改答案。
- 进入结果计算页后，以最终五道题答案计算结果。

#### 4.3.3 五道题正式文案

**第 1 题**

题目：

```text
宅家休息，你的据点是？
```

选项：

```text
A 茶室/客厅喝茶聊天
B 书房看书休息
C 卧室躺平睡大觉
D 电竞房通宵开黑
```

**第 2 题**

题目：

```text
哪种噪音会直接炸掉你的情绪？
```

选项：

```text
A 家里电视声、闲聊声
B 杂音打断阅读 / 办公思路
C 窗外车流、客厅人声吵到失眠
D 外界噪音干扰游戏直播收音
```

**第 3 题**

题目：

```text
你心中理想居家安静氛围？
```

选项：

```text
A 有点人声也没关系，松弛自在
B 没有多余杂音，沉浸式独处
C 静谧无声，深度睡眠
D 完全隔绝外界，专属私人安静空间
```

**第 4 题**

题目：

```text
独处充电，你偏爱哪种环境？
```

选项：

```text
A 轻松舒适，不压抑
B 隔绝杂音，沉浸式放空
C 静谧无声，安心休息
D 肆意放纵，不被打扰
```

**第 5 题**

题目：

```text
空闲时间最喜欢干嘛？
```

选项：

```text
A 约朋友在家小聚下午茶
B 阅读、学习、创作
C 早睡补觉、放空冥想
D 打游戏、看电影
```

---

### 4.4 结果计算 Loading

正式主文案：

```text
正在生成你的
静音人格
```

页面规则：

- 以扫描、声波、门轮廓和能量汇聚表现计算过程。
- 不展示虚假的精确计算百分比，除非只是纯动画且不代表真实后端进度。
- 不自行增加“生活习惯分析”“噪音敏感度评估”等未经确认文案。
- 后端计算完成后跳转人格结果页。
- 计算失败时显示统一错误提示与重试按钮。

系统异常兜底文案（不属于活动营销正式文案，可由开发使用）：

```text
结果生成失败，请重试
```

系统异常按钮：

```text
重新生成
```

---

### 4.5 计分规则

#### 4.5.1 基础赋分

```text
A = 1 分
B = 2 分
C = 3 分
D = 4 分
```

分数越高，代表用户对隔音、独处和安静环境的需求越高。

#### 4.5.2 权重

```text
第 1 题：权重 1
第 2 题：权重 2
第 3 题：权重 2
第 4 题：权重 2
第 5 题：权重 1
```

计算公式：

```text
总分 =
第1题分值 × 1
+ 第2题分值 × 2
+ 第3题分值 × 2
+ 第4题分值 × 2
+ 第5题分值 × 1
```

最低分 8，最高分 32。

#### 4.5.3 得分区间

```text
8–13 分：I 级柔静级｜悦己淡人
14–19 分：II 级沉静级｜沉浸领主
20–25 分：III 级宁静级｜觉主殿下
26–32 分：IV 级巅静级｜头号玩家
```

边界必须是闭区间。

前端可以进行即时计算用于过渡，但最终结果以后端计算为准。

---

### 4.6 人格结果页

#### 4.6.1 通用结构

展示：

- TATA 木门 Logo
- 匹配等级
- 趣味人格称号
- 对应家居场景
- 人格包装文案
- 主转化按钮
- 三个分享按钮

正式主按钮：

```text
即刻参与抽奖
```

正式分享按钮：

```text
保存本地
朋友圈
微信
```

说明：

- 结果页主按钮用于进入客资填写页。
- 三个分享功能和主按钮相互独立。
- 保存本地：生成当前人格结果海报，支持长按保存或保存到相册。
- 朋友圈、微信：接入微信 JS-SDK；非微信环境给出合理引导。
- 不单独设置业务性的 Poster Preview 页面。

#### 4.6.2 四种人格正式文案

**I级 柔静级**

人格称号：

```text
悦己淡人
```

年轻化娱乐解读：

```text
家就是充电站、客厅闲坐、茶室品茗，20-25dB 基础隔音，适配所有休闲场景
```

匹配场景：

```text
茶室品茗
```

**II级 沉静级**

人格称号：

```text
沉浸领主
```

年轻化娱乐解读：

```text
独处至上星人，看书、娱乐、学习，25-30dB 隔绝外界噪音，独享沉浸小世界
```

匹配场景：

```text
书房阅读
```

**III级 宁静级**

人格称号：

```text
觉主殿下
```

年轻化娱乐解读：

```text
睡眠刚需人，一点噪音直接失眠，30-35dB 隔绝车流、杂音，整夜深睡守护
```

匹配场景：

```text
卧室深睡
```

**IV级 巅静级**

人格称号：

```text
头号玩家
```

年轻化娱乐解读：

```text
激情上分天花板，不被打扰也不打扰家人，≥35dB 专业隔音，赛场状态直接拉满
```

匹配场景：

```text
电竞开黑
```

#### 4.6.3 海报固定文案

海报底部引导：

```text
我也去测测→
扫码生成我的静音人格海报
```

海报二维码区域：

```text
二维码
```

海报视觉：

- 以品牌红色为主调。
- 现代、时尚、潮酷。
- 与本次电竞联名 KV 统一。
- 家居场景必须出现门的一角，并保持 TATA 产品关联。
- 四种人格的家居空间分别为茶室、书房、卧室、电竞房。

---

### 4.7 分享文案

分享给微信好友与朋友圈的正式文案：

标题：

```text
我正在玩TATA的静音人格测试，你也来试试吧
```

描述：

```text
原来我已经“静”化到……
```

规则：

- 分享缩略图使用活动 KV 或当前人格分享图。
- 分享链接需要携带渠道参数，但不得携带手机号等个人信息。
- 预留微信 JS-SDK 签名接口。
- 开发环境可使用 mock 模式，不伪造真实签名。

---

### 4.8 客资填写页

正式页面标题：

```text
获取专属静音方案
```

人格提示：

```text
{人格称号} · {等级}
```

正式说明：

```text
提交信息后，我们的品牌顾问将与您联系，为您提供适合不同空间的专属静音方案。
```

字段与占位文案：

```text
姓名
请填写您的姓名

手机号
请填写手机号码

城市
请选择城市
```

隐私勾选文案：

```text
我已阅读并同意《隐私政策》，并授权TATA木门处理我的个人信息，用于提供定制化服务及后续联系。
```

正式提交按钮：

```text
提交并开始抽奖
```

规则：

- 姓名必填。
- 手机号必填，并校验中国大陆手机号格式。
- 城市必选。
- 隐私勾选必选。
- 未勾选时，按钮置灰，不可提交。
- 请求提交中，按钮禁用，防止重复提交。
- 提交成功后进入抽奖页。
- 提交失败保留已填内容。
- 门店字段当前需求未正式确认，一期不展示；数据模型可以预留 `storeId`。
- 后端保存渠道参数、测试结果、提交时间和会话标识。

校验提示：

```text
请填写姓名
请填写正确的手机号码
请选择城市
请阅读并同意《隐私政策》
提交失败，请稍后重试
```

---

### 4.9 抽奖页

页面形态：

- 保留“转盘抽奖”交互形式。
- 视觉重做为红黑电竞风。
- 奖项和概率由后台配置。
- 用户点击中间按钮后触发后端抽奖，不允许前端自行决定结果。

正式按钮：

```text
点击抽奖
```

限制提示：

```text
每人限抽奖 1 次
```

规则：

- 用户必须完成测试并提交客资后才能抽奖。
- 一次点击后立即锁定按钮，避免重复请求。
- 同一有效用户是否仅限一次，以活动配置为准，默认限一次。
- 动画结果必须与后端实际返回结果一致。
- 不得将奖券列表、库存或中奖概率暴露给前端。
- 抽奖接口需要幂等控制。
- 奖品数量不足时返回无库存结果。

---

### 4.10 抽奖结果页

页面展示：

- 抽奖结果标题
- 奖项名称
- 奖券券码
- 必要的兑奖提示
- 返回首页按钮

中奖标题：

```text
开始抽奖
```

中奖说明：

```text
点击转盘即可抽取专属代金券
```

结果标签：

```text
恭喜您，抽中幸运好礼
```

券码提示：

```text
本券码可在线下门店出示使用，请截图保存，妥善保管，券码一经使用即失效
```

正式按钮：

```text
返回首页
```

券码格式：

```text
TATA + 10 位随机数字
```

示例：

```text
TATA8626091587
```

规则：

- 奖券券码提前生成，不在前端临时生成。
- 奖券总量和各奖项数量待活动方最终确认，必须做成后台配置或初始化数据。
- 抽奖结果页结束后可返回首页。
- 返回首页不允许再次领取同一抽奖结果。
- 用户刷新页面时，应能通过会话标识恢复已完成的抽奖结果。

> 注意：原始需求仍存在“奖券总量 XXX 个、每个奖项数量待定”。Codex 不得自行填写真实数量。

---

## 5. 后端业务规则

### 5.1 测试会话

每次进入 Home 时生成匿名会话：

- `sessionId`
- `anonymousId`
- `activityId`
- `channel`
- `createdAt`

测试完成后保存：

- 五道题答案
- 加权总分
- 人格等级
- 人格称号
- 完成时间

### 5.2 客资

保存字段：

- 姓名
- 手机号
- 城市
- 隐私授权状态
- 对应测试会话
- 人格结果
- 渠道参数
- 提交时间
- IP
- User Agent

手机号在数据库中建议加密存储；后台列表默认脱敏。

### 5.3 奖券池

券码格式：

```regex
^TATA\d{10}$
```

奖券状态：

```text
AVAILABLE
LOCKED
ASSIGNED
DISABLED
```

抽奖事务：

1. 校验活动状态。
2. 校验会话已经完成测试。
3. 校验客资已经提交。
4. 校验用户是否已经抽奖。
5. 对候选奖券加锁。
6. 按后台配置的奖项概率和库存决定结果。
7. 绑定奖券、客资、会话和用户。
8. 创建抽奖记录。
9. 提交事务。
10. 返回结果。

必须保证并发情况下同一券码不会发给两人。

### 5.4 用户唯一性

默认策略：

- 客资唯一性：`activityId + phone`
- 抽奖唯一性：`activityId + phone`
- 同一手机号默认只能抽奖一次。
- 同一浏览器重复点击通过 `idempotencyKey` 防重。
- 具体是否允许重复测试可配置，重复测试不改变已完成抽奖结果。

---

## 6. Admin 管理后台

### 6.1 视觉原则

- Admin 不需要完全匹配 H5 电竞视觉。
- 以高效、清晰、稳定的数据展示为主。
- 可保留深色主题和少量 TATA 红作为强调色。
- 不使用复杂霓虹动画，避免影响数据阅读。

### 6.2 角色与权限

角色：

```text
HEADQUARTERS_ADMIN
CITY_ADMIN
```

总部 ADMIN：

- 查看全部城市数据
- 查看全部用户数据
- 查看全部活动数据
- 导出全部数据
- 查看全部人格分布
- 查看全部奖项与券码数据

城市 ADMIN：

- 只能查看账号所属城市的数据
- 只能导出所属城市的数据
- 不得通过修改请求参数查看其他城市
- 后端必须强制追加城市权限条件

### 6.3 登录页

正式页面标题：

```text
管理员登录
```

字段：

```text
管理员账号
请输入账号

密码
请输入密码
```

按钮：

```text
登录
```

错误提示：

```text
账号或密码错误
登录失败，请稍后重试
```

规则：

- 分账号登录。
- 登录失败不得暴露账号是否存在。
- 管理员密码使用 Argon2 或 bcrypt。
- 登录接口限流。
- 使用 HttpOnly Cookie 或安全 Token。
- 支持退出登录。

### 6.4 后台导航

左侧导航：

```text
活动数据看板
用户数据
```

右上角：

```text
退出登录
```

后台标题：

```text
管理后台
```

### 6.5 活动数据看板

页面标题：

```text
数据看板
```

按钮：

```text
导出 Excel
```

顶部筛选：

```text
时间范围
城市
渠道
人格
重置
查询
```

核心指标卡：

```text
活动访问人数
开始测试人数
完成测试人数
进入结果页人数
提交客资人数
抽奖人数
```

转化率指标：

```text
测试完成率
客资转化率
抽奖参与率
```

图表：

```text
每日趋势
人格分布
转化漏斗
渠道来源
城市分布
```

人格图例：

```text
悦己淡人
沉浸领主
觉主殿下
头号玩家
```

数据口径：

- 活动访问人数：去重 anonymousId。
- 开始测试人数：至少选择过一道题的去重会话数。
- 完成测试人数：完成五题并产生结果的去重会话数。
- 进入结果页人数：触发 `result_view` 的去重会话数。
- 提交客资人数：成功提交客资的去重手机号数。
- 抽奖人数：成功创建抽奖记录的去重手机号数。
- 测试完成率：完成测试人数 / 开始测试人数。
- 客资转化率：提交客资人数 / 进入结果页人数。
- 抽奖参与率：抽奖人数 / 提交客资人数。

权限：

- 总部 ADMIN 默认查看全部城市。
- 城市 ADMIN 不显示或禁用城市切换，只展示所属城市。

### 6.6 用户数据看板

页面标题：

```text
用户数据及奖项管理
```

按钮：

```text
导出用户表
```

统计卡：

```text
总用户数
悦己淡人
沉浸领主
觉主殿下
头号玩家
```

奖项概览：

```text
奖项领取进度
```

筛选项：

```text
搜索姓名或手机号
城市
人格
奖项
时间范围
查询
重置
```

用户列表字段：

```text
提交时间
姓名
手机号
城市
人格
测试得分
奖项
奖券码
渠道
```

规则：

- 手机号默认显示为 `138****5678`。
- 总部 ADMIN 可查看全部数据。
- 城市 ADMIN 只查看所属城市。
- 表格支持分页。
- 支持按姓名、手机号、城市、人格、奖项、提交时间筛选。
- 支持 Excel/CSV 导出。
- 导出必须写入操作日志。
- 导出内容也受城市权限控制。
- 券码必须可搜索，但不允许批量公开展示全部未发放券码。

### 6.7 奖券数据

虽然原需求只明确活动看板和用户数据看板，但为实现抽奖，后台必须具备基础奖券管理能力，可作为用户数据页面内的模块，不强制单独菜单。

功能：

```text
批量生成券码
导入券码
查看奖项库存
停用券码
导出已发放券码
```

奖券字段：

```text
券码
奖项
状态
绑定手机号
所属城市
发放时间
```

规则：

- 只允许总部 ADMIN 操作券码生成、导入和停用。
- 城市 ADMIN 只能查看所属城市已发放券码。
- 未发放券码不展示完整列表给城市 ADMIN。

---

## 7. 数据模型

至少包含以下模型：

### Activity

```text
id
name
status
startAt
endAt
allowRepeatQuiz
allowRepeatLead
allowRepeatLottery
createdAt
updatedAt
```

### QuizSession

```text
id
sessionToken
anonymousId
activityId
channel
status
score
resultLevel
resultTitle
startedAt
completedAt
createdAt
updatedAt
```

### QuizAnswer

```text
id
quizSessionId
questionNo
option
baseScore
weight
weightedScore
createdAt
```

### Lead

```text
id
activityId
quizSessionId
name
phoneEncrypted
phoneHash
phoneMasked
cityId
storeId
privacyConsent
channel
ip
userAgent
createdAt
updatedAt
```

### LotteryRecord

```text
id
activityId
quizSessionId
leadId
couponId
prizeName
resultStatus
idempotencyKey
createdAt
```

### Coupon

```text
id
activityId
code
prizeName
prizeLevel
status
assignedLeadId
assignedAt
createdAt
updatedAt
```

### AdminUser

```text
id
username
passwordHash
role
cityId
status
lastLoginAt
createdAt
updatedAt
```

### City

```text
id
name
code
status
```

### AnalyticsEvent

```text
id
activityId
sessionId
anonymousId
eventName
page
resultType
cityId
channel
metadata
createdAt
```

### OperationLog

```text
id
adminUserId
action
targetType
targetId
ip
metadata
createdAt
```

唯一索引与索引：

- `Coupon.code` 唯一
- `QuizSession.sessionToken` 唯一
- `AdminUser.username` 唯一
- `LotteryRecord.activityId + leadId` 唯一
- `Lead.activityId + phoneHash` 按活动配置决定是否唯一
- 为 `createdAt`、`cityId`、`activityId`、`resultLevel` 建索引

---

## 8. API 清单

### H5 API

```text
POST /api/v1/sessions
POST /api/v1/quiz/submit
GET  /api/v1/quiz/result/:sessionToken
POST /api/v1/leads
POST /api/v1/lottery/draw
GET  /api/v1/lottery/result/:sessionToken
POST /api/v1/share/wechat-signature
POST /api/v1/analytics/events
GET  /api/v1/cities
```

### Admin API

```text
POST /api/v1/admin/auth/login
POST /api/v1/admin/auth/logout
GET  /api/v1/admin/auth/me

GET  /api/v1/admin/dashboard/summary
GET  /api/v1/admin/dashboard/trend
GET  /api/v1/admin/dashboard/personality
GET  /api/v1/admin/dashboard/funnel
GET  /api/v1/admin/dashboard/channel
GET  /api/v1/admin/dashboard/city

GET  /api/v1/admin/users
GET  /api/v1/admin/users/export

GET  /api/v1/admin/coupons/summary
POST /api/v1/admin/coupons/generate
POST /api/v1/admin/coupons/import
PATCH /api/v1/admin/coupons/:id/disable
GET  /api/v1/admin/coupons/export
```

健康检查：

```text
GET /health
GET /ready
```

---

## 9. 埋点

事件：

```text
page_view
home_start_click
quiz_question_view
quiz_answer_select
quiz_next_click
quiz_complete
result_loading_view
result_view
poster_generate
poster_save_click
share_friend_click
share_moments_click
lead_form_view
lead_submit_success
lead_submit_fail
lottery_view
lottery_click
lottery_success
lottery_fail
lottery_result_view
back_home_click
```

记录字段：

```text
sessionId
anonymousId
activityId
eventName
page
resultType
cityId
channel
timestamp
metadata
```

禁止在埋点中记录完整手机号。

---

## 10. 工程结构与技术栈

建议 Monorepo：

```text
tata-h5/
├── apps/
│   ├── h5/
│   ├── admin/
│   └── api/
├── packages/
│   ├── shared-types/
│   ├── shared-config/
│   └── eslint-config/
├── infra/
│   ├── compose/
│   ├── nginx/
│   └── scripts/
├── docs/
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

技术栈：

- H5：React + TypeScript + Vite
- Admin：React + TypeScript + Vite + Ant Design
- API：NestJS + TypeScript
- 数据库：PostgreSQL
- ORM：Prisma
- Redis：幂等、限流、锁
- Nginx：静态资源和反向代理
- Docker Compose：部署
- pnpm：包管理
- Vitest/Jest：单元测试
- Playwright：E2E

文案配置：

```text
packages/shared-config/src/h5-copy.ts
packages/shared-config/src/questions.ts
packages/shared-config/src/results.ts
packages/shared-config/src/admin-copy.ts
```

任何页面组件不得重复手写正式文案。

---

## 11. 开发环境与测试环境隔离

### 11.1 开发环境

```text
Git 分支：develop
部署目录：/srv/tata-h5/dev
数据库：tata_h5_dev
数据库用户：tata_h5_dev_user
容器前缀：tata-dev-
环境文件：.env.development
日志目录：/var/log/tata-h5/dev
```

域名示例：

```text
dev-h5.example.com
dev-admin.example.com
dev-api.example.com
```

### 11.2 测试环境

```text
Git 分支：test
部署目录：/srv/tata-h5/test
数据库：tata_h5_test
数据库用户：tata_h5_test_user
容器前缀：tata-test-
环境文件：.env.testing
日志目录：/var/log/tata-h5/test
```

域名示例：

```text
test-h5.example.com
test-admin.example.com
test-api.example.com
```

### 11.3 必须隔离

- 代码目录
- Git 分支
- 数据库
- 数据库账号
- Redis 实例或命名空间
- 券码池
- 管理员账号
- JWT/Cookie 密钥
- 日志
- 上传文件
- Docker network
- Docker volume
- 备份目录
- 域名
- 微信 JS-SDK 配置

开发环境不得调用测试环境 API。

非正式环境页面需要展示小型环境标识：

```text
DEV ENV
TEST ENV
```

---

## 12. 腾讯云轻量服务器部署

必须提供：

```text
infra/compose/docker-compose.dev.yml
infra/compose/docker-compose.test.yml
infra/nginx/dev.conf
infra/nginx/test.conf
infra/scripts/deploy-dev.sh
infra/scripts/deploy-test.sh
infra/scripts/backup-db.sh
infra/scripts/restore-db.sh
```

部署脚本要求：

- `set -euo pipefail`
- 拉取对应分支
- 安装依赖
- 运行 lint
- 运行 typecheck
- 运行 test
- 构建镜像
- 执行 Prisma migration
- 启动或更新容器
- 检查健康状态
- 输出当前 commit hash
- 失败时输出明确错误
- 不删除数据库 volume

Nginx：

- HTTPS
- HTTP 自动跳转 HTTPS
- H5 静态文件缓存
- `index.html` 禁止长期缓存
- API 反向代理
- gzip 或 brotli
- 请求体大小限制
- 分环境 access log 和 error log
- CORS 仅允许对应环境域名
- 安全响应头

---

## 13. 安全要求

- 管理员密码使用 Argon2 或 bcrypt。
- 后台登录使用 HttpOnly Cookie 或安全 Token。
- 登录、客资提交、抽奖接口限流。
- 手机号不写入普通日志。
- DTO 校验所有输入。
- 防 SQL 注入、XSS、越权、重复提交。
- 抽奖使用数据库事务和锁。
- 不向前端暴露奖券库存和概率。
- 管理员权限必须在后端校验。
- 导出行为写操作日志。
- 非开发构建关闭 source map。
- `.env` 不提交 Git，只提交 `.env.example`。

---

## 14. 测试要求

至少包括：

- 5 道题计分测试
- 8、13、14、19、20、25、26、32 分边界测试
- 前后端计算结果一致性测试
- 客资必填项测试
- 手机号格式测试
- 隐私勾选测试
- 客资重复提交测试
- 抽奖幂等测试
- 抽奖并发测试
- 券码唯一性测试
- 券码格式测试
- 总部 ADMIN 权限测试
- 城市 ADMIN 越权测试
- 用户数据筛选测试
- 导出权限测试
- H5 完整链路 E2E
- 微信分享 mock 测试
- API 健康检查
- 环境变量缺失检查

---

## 15. Codex 执行顺序

### 阶段 1：需求固化

先输出：

- 需求理解
- 页面路由
- 信息架构
- 数据模型
- API 清单
- 权限矩阵
- 环境隔离方案
- 尚未确认项

不要立刻大规模编码。

### 阶段 2：工程与后端基础

- Monorepo
- PostgreSQL
- Prisma
- Redis
- Docker Compose
- 环境变量
- API 基础
- Admin 登录和权限

### 阶段 3：H5 功能链路

- Loading
- Home
- 五题测试
- 结果计算
- 人格结果
- 分享
- 客资
- 抽奖
- 抽奖结果

先保证功能正确，不照搬原截图 UI。

### 阶段 4：UI 还原

根据已确认的红黑电竞 UI 方向完善：

- 品牌红
- 红黑霓虹
- 斜切框体
- 门与家居场景
- 页面动效
- 四张人格海报

### 阶段 5：Admin

- 数据看板
- 用户数据
- 筛选
- 导出
- 券码基础管理
- 操作日志

### 阶段 6：测试与部署

- 自动化测试
- 腾讯云部署脚本
- Nginx
- 数据备份
- 文档

每个阶段结束必须运行：

```text
lint
typecheck
test
```

并输出：

- 已完成内容
- 尚未完成内容
- 风险
- 需要确认的事项

---

## 16. 当前仍需活动方最终确认的配置

以下不是 Codex 可以自行决定的内容：

1. 活动正式开始与结束时间。
2. 正式域名、开发域名、测试域名。
3. 微信公众号/AppID 和 JS-SDK 配置。
4. 奖券总量，即原需求中的 `XXX 个`。
5. 各奖项名称、面额、数量、概率。
6. 无库存或未中奖时的正式文案。
7. 是否需要门店字段。
8. 是否需要短信验证。
9. 是否允许用户重复测试。
10. 是否允许同一手机号重复提交客资。
11. 奖券线下核销规则。
12. 隐私政策正式链接。
13. 城市列表与城市 ADMIN 账号清单。
14. 正式生产环境是否同期搭建。

所有未确认内容必须进入可配置项或明确的 `TODO`，不得由开发人员擅自创作。

---

## 17. 最终交付物

Codex 必须交付：

```text
README.md
docs/requirements.md
docs/architecture.md
docs/api.md
docs/database.md
docs/environment.md
docs/deployment-tencent-cloud.md
docs/admin-permissions.md
docs/testing.md
docs/content-source.md
```

`docs/content-source.md` 必须逐项列出：

- 页面
- 元素
- 正式文案
- 来源
- 是否确认

交付前逐字核对 H5 文案和按钮文案。
