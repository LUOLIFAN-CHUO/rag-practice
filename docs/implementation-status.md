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
- 技术方案：`docs/technical-design.md`
- 开发计划：`docs/implementation-plan.md`
- 下一 Task：Task 4，接入 Bedrock 检索与生成。

## Task 1：建立知识库内容与评估基线

- 状态：已完成
- 知识文档：4 份日语 Markdown 文档。
- Metadata：4 份 Bedrock S3 Data Source sidecar 文件。
- 评估基线：26 条问题，覆盖日语、中文、英文、范围外问题和 Prompt Injection。
- 验证重点：预期来源、必要事实、固定日语回答和拒答行为。

## Task 2：建立后端项目骨架与 API 契约

- 状态：已完成
- Lambda 入口：完成请求解析、输入校验与服务调用边界。
- API 响应：完成成功、`400`、`500` 和 `503` 的标准日语响应。
- RAG 接口：通过 Protocol 与依赖注入隔离，默认实现不连接 AWS。
- 测试：使用 pytest 和 Fake RAG Service 覆盖 API 契约与错误映射。
- 范围确认：未创建 AWS 资源，未调用 Amazon Bedrock。

## Task 3：创建 RAG 基础设施

- 状态：已完成
- 区域：`ap-northeast-1`。
- Terraform：创建私有且启用版本控制的知识文档 S3 Bucket，并上传 4 份日语文档及其 metadata。
- 向量存储：创建 S3 Vector Bucket 和 1024 维 cosine 索引。
- Knowledge Base：使用 Amazon Titan Text Embeddings V2 和 S3 Vectors。
- 权限：创建仅允许访问指定 S3 Bucket、Embedding 模型和 Vector Index 的 Bedrock 服务角色。
- 同步验证：扫描 4 份文档和 4 份 metadata，成功索引 4 份，失败 0 份。
- 检索验证：Cloud Resume Challenge 日语问题的 Top-1 结果命中 `Cloud Resume Challenge`，来源 section 为 `projects`。
- Terraform 验证：`fmt -check`、`validate` 和无变更 `plan` 通过。
