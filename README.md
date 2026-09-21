# Cloud Resume RAG Frontend

这是 Cloud Resume Challenge 的日语 RAG 问答前端。页面通过 AWS API Gateway 的 `/ask` 接口调用后端，并展示回答和公开引用来源。问题与回答不会由应用主动保存。

界面、推荐问题、回答和错误提示统一使用日语。

## API 配置

API 地址和超时时间位于 `config.js`：

```javascript
globalThis.APP_CONFIG = Object.freeze({
  RAG_API_URL: "https://example.execute-api.ap-northeast-1.amazonaws.com/ask",
  RAG_REQUEST_TIMEOUT_MS: 30000,
});
```

部署到其他环境时，只需要替换 `RAG_API_URL`。后端需要允许对应前端 Origin 的 CORS 请求。

## 本地运行

在项目目录执行：

```powershell
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

由于页面使用 ES Module，请通过 HTTP 服务器访问，不要直接双击打开 `index.html`。

## 使用流程

- 点击推荐问题查看真实 RAG 回答和引用来源。
- 输入任意日语问题并发送。
- 输入知识库范围外的问题，查看无答案处理。
- 窄屏下通过右下角的 `AI に質問` 按钮打开问答面板。

## 本地检查

```powershell
npm run check
npm test
```
