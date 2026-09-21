# 简历 RAG 问答助手开发任务执行计划

## 1. 执行规则

- 严格按照 Task 编号顺序执行。
- 一次只执行一个 Task，不提前实现后续 Task。
- 开始前确认所有前置 Task 已完成。
- 每个 Task 都要进行对应验证，并更新 `docs/implementation-status.md`。
- 每个 Task 完成后创建一个独立 Git commit。
- 如果实现过程中需要改变产品需求或技术方案，先更新设计文档并与用户确认。

## 2. 当前基线

已完成内容：

- 产品设计文档。
- 技术方案文档。
- 日语静态前端 Demo。
- Mock 推荐问题、问答、引用、无答案和错误界面流程。

尚未实现内容：

- 真实知识文档和评估数据集。
- 后端 Lambda。
- Bedrock Knowledge Base 和向量检索。
- API Gateway。
- 前端真实 API 接入。
- 云端部署、监控和 CI/CD。

## 3. Task 总览

| Task | 名称 | 前置 Task | 主要结果 |
|---|---|---|---|
| 1 | 建立知识库内容与评估基线 | 无 | 日语知识文档和固定测试问题 |
| 2 | 建立后端项目骨架与 API 契约 | Task 1 | 可本地测试的 Lambda 处理框架 |
| 3 | 创建 RAG 基础设施 | Task 1 | S3、S3 Vectors、Knowledge Base 和 IAM |
| 4 | 接入 Bedrock 检索与生成 | Task 2、3 | 可调用真实 Knowledge Base 的 Lambda |
| 5 | 创建公开 API | Task 4 | 可从浏览器访问的 `/ask` 接口 |
| 6 | 执行 RAG 质量评估与调整 | Task 4、5 | 满足来源、日语和拒答要求 |
| 7 | 前端接入真实 API | Task 5、6 | 替换 Mock 的完整页面流程 |
| 8 | 增加监控、成本保护和 CI | Task 5、6 | 可观测、受限且可重复部署的服务 |
| 9 | 端到端验收与发布 | Task 7、8 | MVP 正式上线并完成验收 |

## 4. Task 1：建立知识库内容与评估基线

### 目标

将现有简历内容整理为适合检索的日语知识文档，并在接入模型前定义评估标准。

### 修改范围

- 创建 `knowledge/` 目录。
- 编写以下日语 Markdown 文档：
  - `profile.md`
  - `skills-and-education.md`
  - `internships.md`
  - `projects/cloud-resume-challenge.md`
- 为文档准备 `title`、`category` 和 `section` metadata。
- 创建 `evals/questions.json`。
- 准备约 20～30 个问题，包含日语、中文、英文和范围外问题。

### 验证

- 每个可回答问题都能在至少一份文档中找到明确依据。
- 每个问题都有预期来源或预期拒答标记。
- 知识文档不包含敏感数据和没有依据的新事实。
- 所有知识内容均使用日语。

### 完成标准

- 知识文档和评估数据通过人工检查。
- 更新实施状态。
- 创建 commit，例如：`docs: add RAG knowledge base content`。

## 5. Task 2：建立后端项目骨架与 API 契约

### 前置条件

Task 1 已完成。

### 目标

建立不依赖真实 AWS 调用的 Lambda 代码结构，并固定请求和响应格式。

### 修改范围

- 创建 `backend/src/` 和 `backend/tests/`。
- 实现 Lambda 入口和输入校验。
- 实现统一成功、无答案和错误响应。
- 定义 Bedrock 服务接口，使用 mock 替代真实调用。
- 添加开发测试依赖和运行说明。

### 验证

- 合法问题返回 `200` 和标准 JSON。
- 空问题、错误类型和超过 240 字符的问题返回 `400`。
- 后端返回值始终符合 API 契约。
- pytest 全部通过。

### 完成标准

- 本地单元测试通过。
- 尚不创建或调用真实 AWS 资源。
- 更新实施状态并创建独立 commit。

## 6. Task 3：创建 RAG 基础设施

### 前置条件

Task 1 已完成。

### 目标

使用 Terraform 创建知识库所需的 AWS 资源。

### 修改范围

- 创建 `infrastructure/` Terraform 配置。
- 配置 AWS Provider 和 `ap-northeast-1` 区域。
- 创建私有 S3 知识文档存储。
- 创建 S3 Vector Bucket 和索引。
- 创建 Bedrock Knowledge Base 和 S3 Data Source。
- 配置 Amazon Titan Text Embeddings V2（1024 维）。
- 创建 Knowledge Base 所需的最小权限 IAM Role。
- 添加 `.gitignore`，排除 Terraform state 和本地构建产物。

### 验证

- `terraform fmt -check` 通过。
- `terraform validate` 通过。
- `terraform plan` 只包含预期资源。
- 部署后知识文档能够上传并成功同步。

### 完成标准

- Knowledge Base 可在 AWS 控制台或 API 中完成一次测试检索。
- 不在仓库提交 state、凭证或构建产物。
- 更新实施状态并创建独立 commit。

## 7. Task 4：接入 Bedrock 检索与生成

### 前置条件

Task 2 和 Task 3 已完成。

### 目标

让 Lambda 调用真实的 Bedrock Knowledge Base，并返回日语答案和公开引用。

### 修改范围

- 实现 `RetrieveAndGenerate` 调用。
- 通过环境变量读取 Knowledge Base ID、模型 ARN和输入限制。
- 添加固定日语、基于资料回答和拒绝猜测的生成提示。
- 将 Bedrock 引用映射为前端 `sources`。
- 引用去重，不返回内部 S3 URI。
- 处理 Bedrock 超时、限流和服务异常。

### 验证

- mock 单元测试覆盖成功、无引用、超时和异常场景。
- 在 AWS 测试环境调用真实知识库成功。
- 中文和英文问题返回日语回答。
- 答案包含与检索结果一致的来源。

### 完成标准

- Lambda 可独立完成真实 RAG 请求。
- 尚不接入公开前端。
- 更新实施状态并创建独立 commit。

## 8. Task 5：创建公开 API

### 前置条件

Task 4 已完成。

### 目标

通过 API Gateway HTTP API 暴露安全、受限的 `/ask` 接口。

### 修改范围

- 使用 Terraform 创建 HTTP API、Stage、Route 和 Lambda Integration。
- 配置 `POST /ask`。
- 配置正式站点和本地开发地址的 CORS。
- 配置路由级速率和突发限流。
- 配置 Lambda 调用权限、超时和并发上限。
- 输出 API URL。

### 验证

- 合法请求成功返回答案和来源。
- 不允许的 Origin 不获得有效 CORS 响应。
- 非法输入返回 `400`。
- 高频请求能够触发 `429`。
- 后端异常不会暴露内部堆栈或 AWS 资源信息。

### 完成标准

- `/ask` 可以从允许的浏览器 Origin 调用。
- 更新实施状态并创建独立 commit。

## 9. Task 6：执行 RAG 质量评估与调整

### 前置条件

Task 4 和 Task 5 已完成。

### 目标

使用固定评估集验证真实检索和生成效果，并只调整影响 MVP 验收的参数。

### 修改范围

- 编写评估执行脚本或测试工具。
- 运行 `evals/questions.json` 中的问题。
- 记录预期来源命中、日语回答、拒答和延迟结果。
- 必要时调整知识文档、检索数量或生成提示。
- 不在本 Task 引入重排序、Agent 或模型训练。

### 验证

- 常见简历问题命中正确来源。
- 所有回答使用日语。
- 范围外问题不编造个人信息。
- Prompt Injection 类型问题不能改变回答范围。
- 记录仍未解决的已知限制。

### 完成标准

- 达到产品设计中的成功标准。
- 形成可重复运行的评估结果。
- 更新实施状态并创建独立 commit。

## 10. Task 7：前端接入真实 API

### 前置条件

Task 5 和 Task 6 已完成。

### 目标

将当前 Demo 的 Mock 数据替换为真实 `/ask` 调用。

### 修改范围

- 删除或隔离 `MOCK_RESPONSES`。
- 通过可配置的 API URL 调用后端。
- 映射 `answer` 和 `sources` 响应。
- 处理超时、`400`、`429` 和服务错误。
- 请求期间禁止重复提交。
- 保留现有日语界面和响应式布局。

### 验证

- 三个推荐问题可以获得真实回答。
- 自由输入可以获得真实回答。
- 来源标签正确显示。
- 错误和无答案提示使用日语。
- 后端不可用时，简历其余部分仍可使用。
- 桌面和移动端流程均正常。

### 完成标准

- 前端不再依赖 Mock 回答。
- 更新实施状态并创建独立 commit。

## 11. Task 8：增加监控、成本保护和 CI

### 前置条件

Task 5 和 Task 6 已完成。

### 目标

让服务具备基础可观测性、费用保护和可重复部署能力。

### 修改范围

- 添加结构化日志，不记录完整问题和回答。
- 创建 CloudWatch 错误和延迟告警。
- 配置费用告警或记录手动配置步骤。
- 添加 GitHub Actions：
  - pytest
  - JavaScript 语法检查
  - Terraform fmt/validate
- 在部署稳定后再加入自动部署和知识库同步。

### 验证

- 能通过 request ID 定位失败请求。
- CloudWatch 中可以看到请求量、错误和耗时。
- 日志不包含完整用户问题、回答和检索正文。
- CI 在错误代码或无效 Terraform 配置时失败。

### 完成标准

- 监控、告警和 CI 均可验证。
- 更新实施状态并创建独立 commit。

## 12. Task 9：端到端验收与发布

### 前置条件

Task 7 和 Task 8 已完成。

### 目标

将 MVP 集成到正式 Cloud Resume 网站并完成发布验收。

### 修改范围

- 将验证完成的前端组件合并到正式前端仓库。
- 部署前端并刷新 CloudFront。
- 使用正式域名运行端到端测试。
- 验证 CORS、限流、错误状态和移动端布局。
- 更新 README、架构图和实施状态。

### 验证

- 产品设计中的所有 MVP 成功标准均通过。
- 常见问题、无答案、跨语言提问和服务错误流程正常。
- 正式环境没有前端控制台错误。
- 不影响原访客计数和简历浏览功能。
- AWS 费用和日志处于预期范围。

### 完成标准

- 正式 URL 可使用真实 RAG 问答。
- 文档与实际架构一致。
- 更新实施状态并创建发布 commit。

## 13. MVP 后的候选任务

以下内容不属于上述 Task，必须单独评估：

- 回答有帮助／没有帮助反馈。
- 多轮会话。
- Bedrock Guardrails。
- 重排序模型。
- 职位描述匹配分析。
- 自动化知识库更新。
- 更换或对比生成模型。
