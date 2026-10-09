# 🐼 Eloise's HSK APP (HSK 4 & 5 在线机考模拟与词汇学习平台)

> **专为 Eloise 打造的 HSK 4 级与 5 级全功能在线备考平台。**  
> 还原官方真题机考 (CBT) 与雅思双栏模考体验，深度集成全题型韩文解析对照、1000 核心词汇记忆库与 1 对 1 AI 辅导导师。

---

## 🌟 核心特色 (Core Features)

### 1. 📚 完整官方真题题库 (Official Exam Papers)
- **真题收录**：精选 5 套官方权威真题（4 套 HSK 4 级：`H41111`、`H41332`、`H41553D`、`样卷`；1 套 HSK 5 级：`H51553`），共计 **470 道全真试题**。
- **全套配套资源**：原声听力音频（支持 0.8x / 1.0x / 1.2x 变速与进度拖动）、24 幅高清书写配图。
- **全题型支持**：听力判断/选择、阅读选词填空/单选、书写连词成句/看图写词/短文写作。

### 2. 🖥️ 双模考布局系统 (Dual Exam Layout)
- **HSK 官方机考 (CBT) 模式**：仿真真实考试网考界面，顶部时间倒计时、底部全题号跳转答题卡、题型分布清晰直观。
- **雅思 (IELTS) 双栏分屏模式**：左侧材料与音频、右侧答题区域，可随时在右上角一键切换。
- **移动端全面适配**：响应式布局，手机端抽屉式答题卡，滑动答题与触摸优化。

### 3. 🇰🇷 深度韩文适配与语言切换 (Korean Localization)
- 所有题目均配备高水准**韩文翻译与详细解析**。
- 支持三种对照模式随时切换：
  - 🇰🇷 **한국어** (韩文专属解析)
  - 🌐 **双语 (한중)** (中文 + 韩文对照)
  - 🇨🇳 **中文** (纯中文浸润解析)

### 4. 🗂️ 1000 核心词汇背诵系统 (`/words`)
- **词汇量**：涵盖 HSK 核心高频词汇（词号 1001 ~ 2000），包含拼音、词性、韩文释义。
- **卡片翻转记忆 (Flashcards)**：点击翻转查看韩文释义与词性，记录掌握与标记复习。
- **真实发音 TTS**：原声中文语音朗读。
- **4 选 1 快速测验**：实时检验词汇掌握度，自动统计得分与错题。
- **词性与关键词快速检索**：支持名词、动词、形容词分类及汉字/拼音实时搜索。

### 5. 🤖 1 对 1 智能 AI 导师 (`AiTutorModal`)
- **多模型支持**：支持 DeepSeek、OpenAI、Gemini、通义千问等主流 API。
- **智能离线兜底**：无需 API Key 即可使用内置离线规则解析引擎，随时随地解答语法与考点疑难。
- **全场景伴学**：做题时一键召唤 AI 针对当前题目进行深度剖析与语法纠错，背单词时一键讲解例句与用法。

### 6. 📝 智能评分与错题本 (`/mistakes` & `/result`)
- **标准评分**：按官方标准满分 300 分、及格线 180 分生成诊断报告与各模块正确率雷达。
- **错题自动归集**：交卷后错题自动进入错题本，支持按题型筛选、韩文复习，支持一键导出 Markdown 笔记。

---

## 🛠️ 技术栈 (Tech Stack)

- **框架**：[Next.js 14 (App Router)](https://nextjs.org/)
- **语言**：[TypeScript](https://www.typescriptlang.org/)
- **样式**：[Tailwind CSS](https://tailwindcss.com/)
- **图标**：[Lucide React](https://lucide.dev/)
- **数学与排版**：KaTeX

---

## 🚀 本地运行 (Local Development)

```bash
# 1. 克隆代码仓库
git clone https://github.com/Shawntan91/eloises-hsk-app.git
cd eloises-hsk-app

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 生产环境构建与启动
npm run build
npm run start
```
在浏览器中打开 `http://localhost:3000` 即可开始使用。

---

## ☁️ 一键发布与部署 (Deployment)

推荐部署在 **[Vercel](https://vercel.com)**：
1. 登录 Vercel 并点击 **Add New... -> Project**。
2. 导入 GitHub 仓库 `Shawntan91/eloises-hsk-app`。
3. 框架选择 **Next.js**，点击 **Deploy** 即可在 1 分钟内完成自动化部署上线！

---

## 📄 License
MIT License. Created with ❤️ for Eloise.
