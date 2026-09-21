variable "aws_region" {
  description = "AWS region in which the RAG infrastructure is deployed."
  type        = string
  default     = "ap-northeast-1"

  validation {
    condition     = var.aws_region == "ap-northeast-1"
    error_message = "The MVP must be deployed in ap-northeast-1."
  }
}

variable "project_name" {
  description = "Name used to identify this project and tag its resources."
  type        = string
  default     = "cloud-resume-rag"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "demo"
}

variable "embedding_model_id" {
  description = "Bedrock embedding model used by the knowledge base."
  type        = string
  default     = "amazon.titan-embed-text-v2:0"
}
