# Resume AI Chatbot（RAG）
DEMO：https://dyp8879eswsdu.cloudfront.net/


WEB履歴書 に追加する、日本語対応の履歴書 AI チャットボットです。

訪問者が候補者について質問すると、履歴書の知識ベースから関連情報を検索し、Amazon Bedrock を使って根拠のある回答を生成します。回答には公開可能な参照元を表示し、知識ベースにない情報は推測しません。

## ユーザーフロー

```text
質問を入力
    ↓
API に送信
    ↓
履歴書資料を検索
    ↓
日本語の回答と参照元を表示
```

## システム構成

```text
Cloud Resume Frontend
        ↓
API Gateway HTTP API
        ↓
AWS Lambda
        ↓
Amazon Bedrock Knowledge Base
        ↓
S3 Documents + S3 Vectors
```

## チャットボットの機能

- 検索結果に基づく日本語回答
- 中国語・英語の質問にも日本語で回答
- 回答の参照元を公開 metadata として表示
- スキル、プロジェクト、経験、勤務可能時間への対応
- 知識ベース外の質問に対する安全な拒答
- Cloud Resume フロントエンドの AI チャットウィンドウ
- API Gateway の CORS とレート制限
- 複数の情報を含む回答は、見出しと箇条書きで表示
- よくある質問のショートカットを表示

## このリポジトリの構成

```text
backend/          AWS Lambda の RAG バックエンド
knowledge/        履歴書の検索対象ドキュメント
infrastructure/   Terraform による AWS インフラ定義
evals/             RAG 回答品質の評価スクリプトと質問セット
frontend-tests/    フロントエンド API クライアントのテスト
api-client.js      フロントエンドから API を呼び出すクライアント
rag-widget.js      AI チャットウィンドウの Web Component
```

## ローカルで試す

リポジトリのルートで HTTP サーバーを起動します。

```powershell
python -m http.server 8000
```

ブラウザで次の URL を開きます。

```text
http://127.0.0.1:8000
```

`index.html` を直接開くのではなく、HTTP サーバー経由でアクセスしてください。

## API

```http
POST https://db895lxek2.execute-api.ap-northeast-1.amazonaws.com/ask
Content-Type: application/json
```

リクエスト例：

```json
{
  "question": "曜日ごとの勤務可能時間を教えてください。"
}
```

回答例：

```json
{
  "answer": "月曜日はリモートワークであれば終日勤務可能です。",
  "sources": [
    {
      "title": "勤務可能時間",
      "section": "availability"
    }
  ]
}
```

## テスト

バックエンドのテストを実行します。

```powershell
python -m pytest backend/tests -p no:cacheprovider
```

フロントエンドのテストを実行します。

```powershell
npm test
```

## 知識ベースの更新

履歴書に関する情報は `knowledge/` に Markdown で追加します。新しいファイルを追加・変更した後、S3 への反映と Bedrock Knowledge Base の ingestion を実行します。

```powershell
cd infrastructure
terraform apply

$knowledgeBaseId = terraform output -raw knowledge_base_id
$dataSourceId = terraform output -raw data_source_id

aws bedrock-agent start-ingestion-job `
  --region ap-northeast-1 `
  --knowledge-base-id $knowledgeBaseId `
  --data-source-id $dataSourceId
```

## AWS インフラ

AWS の認証情報を設定した上で、Terraform を実行します。

```powershell
cd infrastructure
terraform init
terraform fmt -check
terraform validate
terraform plan -out=deployment.tfplan
terraform apply deployment.tfplan
```

## セキュリティと回答ルール

- AWS のアクセスキーや Terraform の state ファイルを Git にコミットしない
- Lambda は指定された Knowledge Base と生成モデルだけを利用する
- API のレスポンスには内部 S3 URI や検索本文を含めない
- ユーザーの質問と回答はアプリケーションから保存しない
- Knowledge Base に存在しない情報を推測して回答しない

## 関連ドキュメント

- [`docs/product-design.md`](docs/product-design.md)：プロダクト設計
- [`docs/technical-design.md`](docs/technical-design.md)：技術設計
- [`docs/implementation-plan.md`](docs/implementation-plan.md)：実装計画
- [`docs/implementation-status.md`](docs/implementation-status.md)：実装状況
