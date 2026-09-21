# Cloud Resume RAG Frontend Demo

这是一个使用本地 Mock 数据的静态前端 Demo，用于验证简历 RAG 问答助手的界面和操作流程。当前版本不会调用后端 API，也不会发送或保存用户输入。

## 本地运行

在项目目录执行：

```powershell
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

也可以直接使用浏览器打开 `index.html`。

## Demo 流程

- 点击推荐问题查看 Mock 回答和引用来源。
- 输入包含“技能”“AWS”“项目”“实习”“教育”或“目标”的问题查看不同回答。
- 输入知识库范围外的问题，查看无答案处理。
- 窄屏下通过右下角的 `Ask AI` 按钮打开问答面板。
