# RAG infrastructure

This directory provisions the Task 3 resources in `ap-northeast-1`:

- a private, versioned S3 bucket containing `../knowledge`;
- an S3 Vector Bucket and 1024-dimension cosine index;
- a least-privilege IAM service role for Bedrock Knowledge Bases;
- a Bedrock Knowledge Base using Amazon Titan Text Embeddings V2;
- an S3 data source.
- a private Python Lambda that generates grounded Japanese answers with Amazon Nova Lite.

Terraform intentionally does not contain an AWS profile or credentials. Select the intended local profile before running it.

```powershell
$env:AWS_PROFILE = "rag-dev"
aws sts get-caller-identity

terraform init
terraform fmt -check
terraform validate
terraform plan -out=task3.tfplan
terraform apply task3.tfplan
```

After apply, start one ingestion job and inspect it:

```powershell
$knowledgeBaseId = terraform output -raw knowledge_base_id
$dataSourceId = terraform output -raw data_source_id

aws bedrock-agent start-ingestion-job `
  --region ap-northeast-1 `
  --knowledge-base-id $knowledgeBaseId `
  --data-source-id $dataSourceId
```

Terraform state, plans, credentials, and local variable files are excluded from Git. S3 buckets are not configured for forced deletion, so destroying the stack requires intentionally emptying the document and vector stores first.

The Task 4 Lambda has no public endpoint. Invoke it directly for verification:

```powershell
$functionName = terraform output -raw rag_lambda_function_name
$payload = '{"body":"{\"question\":\"AWS の経験について教えてください。\"}"}'

aws lambda invoke `
  --region ap-northeast-1 `
  --function-name $functionName `
  --cli-binary-format raw-in-base64-out `
  --payload $payload `
  response.json
```
