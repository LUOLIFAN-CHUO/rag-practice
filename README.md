# Resume AI Chatbot（RAG）

日本語 | [English](./README.en.md)

AWS 上の Cloud Resume に組み込む、日本語対応の RAG 型 AI アシスタントです。公開可能な履歴書ナレッジだけを検索し、Amazon Bedrock で根拠のある回答を生成します。ナレッジに存在しない情報は推測せず、回答には出典を付けます。

**Demo:** https://dyp8879eswsdu.cloudfront.net/

## システム全体像

[![AI-Powered Cloud Portfolio アーキテクチャ](docs/architecture/AI-Powered-Cloud-Portfolio.png)](docs/architecture/AI-Powered-Cloud-Portfolio.html)

画像をクリックすると、Archify で生成したインタラクティブ版を開けます。このリポジトリは図の RAG 経路を担当します。

```text
Portfolio UI
  → POST /ask
  → Amazon API Gateway
  → AWS Lambda (Python)
  → Amazon Bedrock Knowledge Bases
  → S3 Vectors + S3 documents
  → Amazon Nova Lite / Titan Text Embeddings V2
```

## 主な機能

- 中国語・英語の質問を含め、常に自然な日本語で回答
- `RetrieveAndGenerate` による検索・生成・出典取得
- 履歴書にない経験、スキル、個人情報を推測しない安全な回答制御
- 公開用 metadata から利用者向けの出典名を生成
- API Gateway の CORS、スロットリング、入力長制限
- 固定質問セットによる回答品質の評価
- Terraform による AWS リソース管理

## リポジトリ構成

```text
backend/          Lambda ハンドラーと Bedrock アダプター
knowledge/        検索対象の Markdown 文書と metadata
infrastructure/   API、Lambda、Knowledge Base、S3 の Terraform
evals/            評価質問、実行スクリプト、結果
frontend-tests/   ブラウザ側 API クライアントのテスト
api-client.js     POST /ask クライアント
rag-widget.js     AI チャット用 Web Component
```

## API

```http
POST https://db895lxek2.execute-api.ap-northeast-1.amazonaws.com/ask
Content-Type: application/json
```

```json
{
  "question": "AWS の経験について教えてください。"
}
```

成功時は `answer`、公開可能な `sources`、`requestId` を返します。MVP は単一ターンかつステートレスで、質問や回答を永続化しません。

## ローカル実行とテスト

```powershell
python -m http.server 8000
python -m pytest backend/tests -p no:cacheprovider
npm test
```

## セキュリティ方針

- AWS キー、Terraform state、Lambda ビルド成果物をコミットしない
- Lambda の IAM 権限を必要な Bedrock とログ操作に限定
- API レスポンスに内部 S3 URI や検索本文を含めない
- 完全な質問と生成回答をアプリケーションログへ保存しない
- ログイン、会話履歴、ユーザーファイルアップロードを MVP の対象外とする

## 関連リポジトリ

- [cloud-resume-frontend](https://github.com/LUOLIFAN-CHUO/cloud-resume-frontend) — 履歴書サイトと RAG ウィジェット
- [cloud-resume-backend](https://github.com/LUOLIFAN-CHUO/cloud-resume-backend) — 訪問者カウンター API

## アーキテクチャ成果物

- [インタラクティブ HTML](docs/architecture/AI-Powered-Cloud-Portfolio.html)
- [Archify ソース仕様](docs/architecture/AI-Powered-Cloud-Portfolio.architecture.json)
- [PNG プレビュー](docs/architecture/AI-Powered-Cloud-Portfolio.png)
