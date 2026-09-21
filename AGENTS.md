# AGENTS.md

## 1. 基本规则

- 使用中文与用户沟通。
- 开始工作前，先理解与当前任务相关的代码、配置和文档。
- 一次只执行一个明确的 Task，不要提前实现后续 Task。
- 不要擅自改变产品需求。
- 优先使用项目已有的技术、组件和依赖。
- 不要进行与当前 Task 无关的重构、优化或功能修改。
- 保持修改范围尽可能小。

## 2. 文档职责

项目中的主要文档：

- `docs/product-design.md`：产品目标、用户需求和功能。
- `technical-design.md`：技术架构、技术选型和实现方案。
- `docs/implementation-plan.md`：开发任务及执行顺序。
- `docs/implementation-status.md`：任务完成状态。

规则：

- 产品需求以 `docs/product-design.md` 为准。
- 技术实现以 `technical-design.md` 为主要参考。
- 开发顺序以 `implementation-plan.md` 为准。
- 不需要每次重新完整分析所有文档，只读取与当前 Task 相关的内容。

## 3. Task 执行

执行 Task 前：

1. 阅读 `AGENTS.md`。
2. 阅读当前 Task 相关的产品和技术设计。
3. 阅读当前 Task 相关的代码。
4. 确认前置 Task 是否已经完成。

然后：

1. 实现当前 Task。
2. 进行必要的测试和验证。
3. 检查修改是否超出 Task 范围。
4. 更新 `docs/implementation-status.md`。
5. 创建 Git commit。
6. 向用户简要报告结果。

不要一次实现多个 Task。

## 4. Git

- 每完成一个独立 Task，创建一个 Git commit。
- Commit message 使用英文。
- 优先使用 Conventional Commits：
  - `feat:` 新功能
  - `fix:` Bug 修复
  - `test:` 测试
  - `refactor:` 重构
  - `docs:` 文档
  - `ci:` CI/CD
  - `chore:` 工程维护
