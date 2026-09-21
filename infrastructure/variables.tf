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

variable "generation_model_id" {
  description = "Bedrock model used to generate grounded Japanese answers."
  type        = string
  default     = "amazon.nova-lite-v1:0"
}

variable "max_question_length" {
  description = "Maximum number of characters accepted by the Lambda handler."
  type        = number
  default     = 240

  validation {
    condition     = var.max_question_length > 0
    error_message = "The maximum question length must be greater than zero."
  }
}

variable "retrieval_result_count" {
  description = "Number of knowledge base chunks retrieved for each question."
  type        = number
  default     = 4

  validation {
    condition     = var.retrieval_result_count >= 1 && var.retrieval_result_count <= 10
    error_message = "The retrieval result count must be between 1 and 10."
  }
}
