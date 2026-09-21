# 实施状态

## Frontend Demo

- 状态：已完成
- 内容：实现静态简历页面与 RAG 问答助手交互 Demo。
- 数据：使用前端本地 Mock 数据，不连接真实后端。
- 已覆盖：推荐问题、自由提问、加载状态、来源展示、无答案处理、响应式布局。
- 语言：产品界面和 Mock 回答统一使用日语。
- 暂未实现：真实检索、模型调用、API、会话存储和反馈收集。

## Design Documents

- 状态：已完成
- 产品设计：`docs/product-design.md`
- 技术方案：`technical-design.md`
- 开发计划：`docs/implementation-plan.md`
- 下一 Task：Task 2，建立后端项目骨架与 API 契约。

## Task 1：建立知识库内容与评估基线

- 状态：已完成
- 知识文档：4 份日语 Markdown 文档。
- Metadata：4 份 Bedrock S3 Data Source sidecar 文件。
- 评估基线：26 条问题，覆盖日语、中文、英文、范围外问题和 Prompt Injection。
- 验证重点：预期来源、必要事实、固定日语回答和拒答行为。
