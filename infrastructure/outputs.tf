output "aws_account_id" {
  description = "AWS account that owns the deployed resources."
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS region that contains the deployed resources."
  value       = var.aws_region
}

output "knowledge_bucket_name" {
  description = "Private S3 bucket containing the source documents."
  value       = aws_s3_bucket.knowledge.id
}

output "vector_bucket_arn" {
  description = "ARN of the S3 Vector Bucket."
  value       = aws_s3vectors_vector_bucket.knowledge.vector_bucket_arn
}

output "vector_index_arn" {
  description = "ARN of the S3 Vectors index."
  value       = aws_s3vectors_index.knowledge.index_arn
}

output "knowledge_base_id" {
  description = "ID used by Bedrock Knowledge Bases runtime APIs."
  value       = aws_bedrockagent_knowledge_base.resume.id
}

output "data_source_id" {
  description = "ID used to start and inspect ingestion jobs."
  value       = aws_bedrockagent_data_source.resume.data_source_id
}

output "knowledge_base_role_arn" {
  description = "Least-privilege IAM role assumed by Bedrock Knowledge Bases."
  value       = aws_iam_role.knowledge_base.arn
}

output "rag_lambda_function_name" {
  description = "Name of the Lambda function backing the RAG API."
  value       = aws_lambda_function.rag.function_name
}

output "rag_lambda_function_arn" {
  description = "ARN of the Lambda function backing the RAG API."
  value       = aws_lambda_function.rag.arn
}

output "rag_api_url" {
  description = "Public POST endpoint for the resume RAG assistant."
  value       = "${aws_apigatewayv2_api.rag.api_endpoint}/ask"
}
