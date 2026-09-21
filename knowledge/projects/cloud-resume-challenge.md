# Cloud Resume Challenge

## プロジェクト概要

Cloud Resume Challenge は、静的な履歴書サイトとサーバーレスバックエンドを組み合わせた個人プロジェクトです。フロントエンドの公開、API、データ保存、Infrastructure as Code、テスト、CI/CD を一体として構築しています。

これは、履歴書に記載している AWS 関連経験の一つです。

## フロントエンド

履歴書サイトは HTML、CSS、JavaScript で実装しています。静的ファイルを Amazon S3 に配置し、Amazon CloudFront を通じて配信しています。Amazon Route 53 も使用しています。

GitHub Actions から S3 への同期と CloudFront のキャッシュ無効化を実行し、フロントエンドを自動デプロイしています。

## 訪問者数カウンター

サイトには訪問者数カウンターがあります。ブラウザから Amazon API Gateway の API を呼び出し、Python と boto3 で実装した AWS Lambda が Amazon DynamoDB の訪問者数を更新して返します。

バックエンドの基本構成は次のとおりです。

```text
Browser
  ↓
API Gateway
  ↓
Lambda
  ↓
DynamoDB
```

## Infrastructure as Code と CI/CD

AWS Lambda、DynamoDB、IAM などのバックエンドリソースは Terraform で管理しています。プロジェクトでは AWS SAM も使用しています。

バックエンドの GitHub Actions では、Python のテストを実行した後に Terraform を使ってインフラをデプロイします。Lambda のテストには pytest、boto3、moto を使用しています。

## 問題解決の経験

構築中には、アクセス権限や CORS などの問題が発生しました。エラーメッセージと公式ドキュメントを確認し、原因を切り分けながら解決しました。

このプロジェクトを通じて、初めて扱う AWS サービスでも、必要な情報を調べ、実際に試しながら理解する経験を積みました。
