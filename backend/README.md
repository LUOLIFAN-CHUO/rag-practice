# RAG Backend

Task 2 で作成した AWS Lambda バックエンドのローカル実装です。現在は API 契約、入力検証、レスポンス形式、RAG サービス境界のみを実装しており、AWS や Amazon Bedrock には接続しません。

## ローカルテスト

リポジトリのルートで次のコマンドを実行します。

```powershell
python -m pip install -r backend/requirements-dev.txt
python -m pytest backend/tests -p no:cacheprovider
```

## Lambda ハンドラー

```text
backend.src.handler.lambda_handler
```

Bedrock アダプターが未設定のため、デフォルトの Lambda ハンドラーは安全に `503 SERVICE_UNAVAILABLE` を返します。実際の Bedrock 接続は Task 4 で実装します。
