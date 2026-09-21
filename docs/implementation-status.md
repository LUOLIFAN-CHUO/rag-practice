# 实施状态

## Frontend Demo

- 状态：已完成
- 内容：实现静态简历页面与 RAG 问答助手交互 Demo。
- 数据：使用前端本地 Mock 数据，不连接真实后端。
- 已覆盖：推荐问题、自由提问、加载状态、来源展示、无答案处理、响应式布局。
- 语言：产品界面和 Mock 回答统一使用日语。
- 暂未实现：前端真实 API 接入、会话存储和反馈收集。

## Design Documents

- 状态：已完成
- 产品设计：`docs/product-design.md`
- 技术方案：`docs/technical-design.md`
- 开发计划：`docs/implementation-plan.md`
- 下一 Task：Task 7，前端接入真实 API。

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

## Task 4：接入 Bedrock 检索与生成

- 状态：已完成
- RAG 调用：Lambda 使用 Knowledge Base `XSMLSB5QPI` 调用 `RetrieveAndGenerate`，生成模型为 Amazon Nova Lite。
- 生成约束：使用固定日语提示，要求只依据检索资料回答，资料不足时返回固定拒答。
- 引用处理：将 Bedrock 引用映射为公开的 `title` 和 `section`，完成去重且不返回内部 S3 URI。
- 异常处理：超时、限流、配额和依赖服务异常统一映射为安全的 `503` 响应，其他内部异常不泄露细节。
- 权限：Lambda 角色仅可检索指定 Knowledge Base，并调用指定的 Nova Lite 模型。
- 自动测试：28 个 pytest 测试通过，覆盖成功、无引用、固定拒答、超时和服务异常等场景。
- AWS 验证：日语、中文和英文问题均通过真实 Lambda 调用返回 `200` 和日语回答，来源与知识文档一致。
- 范围确认：Lambda 可独立完成真实 RAG 请求，尚未创建 API Gateway 或接入公开前端。

## Task 5：创建公开 API

- 状态：已完成
- HTTP API：创建 API Gateway HTTP API，仅公开 `POST /ask`，地址为 `https://db895lxek2.execute-api.ap-northeast-1.amazonaws.com/ask`。
- Lambda 集成：使用 payload format 2.0，集成超时为 29 秒，Lambda 超时为 28 秒，并使用限定到该 API 路由的调用权限。
- CORS：精确允许正式 CloudFront Origin、`http://localhost:8000` 和 `http://127.0.0.1:8000`，不使用通配符。
- 限流：路由默认限制为每秒 1 个请求、突发 2 个请求；并发测试可稳定触发安全的 `429`。
- 并发限制：当前账户的区域 Lambda 总并发额度为 10，AWS 要求全部保持未预留，无法设置函数级 reserved concurrency；当前由账户总额度和 API 路由限流共同限制。
- API 验证：合法问题返回 `200`、日语回答和公开来源；非法输入返回 `400`；未允许 Origin 不返回有效 CORS 授权头。
- 安全验证：`429` 和后端错误响应不包含堆栈、凭证或 AWS 内部资源信息。
- Terraform 验证：`fmt -check`、`validate` 和部署后无变更 `plan` 通过。
- 范围确认：尚未修改前端 Mock，也未执行 Task 6 的完整质量评估。

## Task 6：执行 RAG 质量评估与调整

- 状态：已完成
- 评估工具：新增可重复运行的 API 评估脚本，逐条记录 HTTP、日语、来源、必要事实、拒答和延迟。
- 评估范围：运行 `evals/questions.json` 的 26 条日语、中文、英文、范围外和 Prompt Injection 问题。
- 调整内容：检索结果数从 4 调整为 6；补强日语生成提示和回答前完整性检查；将安全拒答变体统一为固定文案并移除无关引用。
- 知识调整：仅强化已有的志望职种、AWS Japan 实习和 Cloud Resume Challenge 的检索表述，没有增加新经历；同步任务 `PHZHV6GND2` 成功更新 3 份文档，失败 0。
- 最终结果：严格通过 22/26（84.6%）；HTTP、日语、预期来源、拒答与 Prompt Injection 均为 26/26。
- 延迟：平均 1,155 ms，P50 1,012 ms，P95 1,953 ms，最大 2,204 ms。
- 已知限制：Nova Lite 偶尔会在已检索并正确引用资料时省略一个相关细节；最终轮有 4 条必要事实完整性失败，但没有无依据生成或错误来源。
- 自动测试：35 个 pytest 测试通过，覆盖后端契约、Bedrock 适配、拒答归一化和评估判定逻辑。
- 范围确认：未引入重排序、Agent、模型训练或更大的生成模型，尚未修改前端 Mock。
