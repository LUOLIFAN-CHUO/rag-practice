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

variable "allowed_origins" {
  description = "Exact browser origins allowed to call the public HTTP API."
  type        = list(string)
  default = [
    "https://dyp8879eswsdu.cloudfront.net",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
  ]

  validation {
    condition = (
      length(var.allowed_origins) > 0
      && !contains(var.allowed_origins, "*")
      && alltrue([for origin in var.allowed_origins : can(regex("^https?://[^/]+$", origin))])
    )
    error_message = "Allowed origins must be exact HTTP(S) origins and must not contain a wildcard."
  }
}

variable "api_throttling_rate_limit" {
  description = "Maximum steady-state requests per second for POST /ask."
  type        = number
  default     = 1

  validation {
    condition     = var.api_throttling_rate_limit > 0
    error_message = "The API throttling rate limit must be greater than zero."
  }
}

variable "api_throttling_burst_limit" {
  description = "Maximum burst size for POST /ask."
  type        = number
  default     = 2

  validation {
    condition     = var.api_throttling_burst_limit >= 1
    error_message = "The API throttling burst limit must be at least one."
  }
}

variable "api_integration_timeout_milliseconds" {
  description = "API Gateway timeout for the Lambda proxy integration."
  type        = number
  default     = 29000

  validation {
    condition = (
      var.api_integration_timeout_milliseconds >= 50
      && var.api_integration_timeout_milliseconds <= 30000
    )
    error_message = "The HTTP API integration timeout must be between 50 and 30000 milliseconds."
  }
}

variable "lambda_timeout_seconds" {
  description = "Timeout for the RAG Lambda, kept below the API integration timeout."
  type        = number
  default     = 28

  validation {
    condition     = var.lambda_timeout_seconds >= 1 && var.lambda_timeout_seconds <= 29
    error_message = "The Lambda timeout must be between 1 and 29 seconds."
  }
}

variable "lambda_reserved_concurrency" {
  description = "Optional function concurrency cap. The current demo account quota requires this to remain null."
  type        = number
  default     = null
  nullable    = true

  validation {
    condition = (
      var.lambda_reserved_concurrency == null
      || var.lambda_reserved_concurrency >= 1
    )
    error_message = "Reserved concurrency must be null or at least one."
  }
}
