# RAG Backend

Amazon Bedrock Knowledge Bases の `RetrieveAndGenerate` を呼び出す AWS Lambda バックエンドです。質問、回答、引用本文は保存せず、公開レスポンスには metadata の `title` と `section` だけを返します。

## ローカルテスト

リポジトリのルートで次のコマンドを実行します。

```powershell
python -m pip install -r backend/requirements-dev.txt
python -m pytest backend/tests -p no:cacheprovider
```

## Lambda ハンドラー

```text
src.handler.lambda_handler
```

必要な環境変数：

- `KNOWLEDGE_BASE_ID`
- `GENERATION_MODEL_ARN`
- `MAX_QUESTION_LENGTH`
- `RETRIEVAL_RESULT_COUNT`

環境変数がないローカル環境では、デフォルトハンドラーは安全に `503 SERVICE_UNAVAILABLE` を返します。Terraform が Lambda のデプロイ時に実際の値を設定します。
