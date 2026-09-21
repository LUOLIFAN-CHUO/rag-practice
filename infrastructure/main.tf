data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  knowledge_bucket_name = "${local.name_prefix}-${data.aws_caller_identity.current.account_id}-${var.aws_region}"
  vector_bucket_name    = "${local.name_prefix}-vectors-${data.aws_caller_identity.current.account_id}"
  vector_index_name     = "${local.name_prefix}-index"

  embedding_model_arn = "arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}::foundation-model/${var.embedding_model_id}"
  knowledge_files     = fileset("${path.module}/../knowledge", "**")
}

resource "aws_s3_bucket" "knowledge" {
  bucket        = local.knowledge_bucket_name
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "knowledge" {
  bucket = aws_s3_bucket.knowledge.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "knowledge" {
  bucket = aws_s3_bucket.knowledge.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "knowledge" {
  bucket = aws_s3_bucket.knowledge.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_object" "knowledge" {
  for_each = local.knowledge_files

  bucket       = aws_s3_bucket.knowledge.id
  key          = each.value
  source       = "${path.module}/../knowledge/${each.value}"
  etag         = filemd5("${path.module}/../knowledge/${each.value}")
  content_type = endswith(each.value, ".json") ? "application/json" : "text/markdown; charset=utf-8"

  depends_on = [
    aws_s3_bucket_public_access_block.knowledge,
    aws_s3_bucket_server_side_encryption_configuration.knowledge,
    aws_s3_bucket_versioning.knowledge,
  ]
}

resource "aws_s3vectors_vector_bucket" "knowledge" {
  vector_bucket_name = local.vector_bucket_name
  force_destroy      = false
}

resource "aws_s3vectors_index" "knowledge" {
  index_name         = local.vector_index_name
  vector_bucket_name = aws_s3vectors_vector_bucket.knowledge.vector_bucket_name

  data_type       = "float32"
  dimension       = 1024
  distance_metric = "cosine"
}

data "aws_iam_policy_document" "knowledge_base_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "AWS:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:knowledge-base/*"]
    }
  }
}

resource "aws_iam_role" "knowledge_base" {
  name               = "${local.name_prefix}-kb-role"
  assume_role_policy = data.aws_iam_policy_document.knowledge_base_assume_role.json
}

data "aws_iam_policy_document" "knowledge_base" {
  statement {
    sid       = "ListBedrockModels"
    effect    = "Allow"
    actions   = ["bedrock:ListFoundationModels"]
    resources = ["*"]
  }

  statement {
    sid       = "InvokeEmbeddingModel"
    effect    = "Allow"
    actions   = ["bedrock:InvokeModel"]
    resources = [local.embedding_model_arn]
  }

  statement {
    sid       = "ListKnowledgeBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.knowledge.arn]

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid       = "ReadKnowledgeObjects"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.knowledge.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }

  statement {
    sid    = "UseVectorIndex"
    effect = "Allow"
    actions = [
      "s3vectors:DeleteVectors",
      "s3vectors:GetIndex",
      "s3vectors:GetVectors",
      "s3vectors:PutVectors",
      "s3vectors:QueryVectors",
    ]
    resources = [aws_s3vectors_index.knowledge.index_arn]
  }
}

resource "aws_iam_role_policy" "knowledge_base" {
  name   = "${local.name_prefix}-kb-policy"
  role   = aws_iam_role.knowledge_base.id
  policy = data.aws_iam_policy_document.knowledge_base.json
}

data "aws_iam_policy_document" "vector_bucket" {
  statement {
    sid    = "AllowKnowledgeBaseRole"
    effect = "Allow"
    actions = [
      "s3vectors:DeleteVectors",
      "s3vectors:GetIndex",
      "s3vectors:GetVectors",
      "s3vectors:PutVectors",
      "s3vectors:QueryVectors",
    ]
    resources = [aws_s3vectors_index.knowledge.index_arn]

    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    condition {
      test     = "ArnEquals"
      variable = "aws:PrincipalArn"
      values   = [aws_iam_role.knowledge_base.arn]
    }
  }
}

resource "aws_s3vectors_vector_bucket_policy" "knowledge" {
  vector_bucket_arn = aws_s3vectors_vector_bucket.knowledge.vector_bucket_arn
  policy            = data.aws_iam_policy_document.vector_bucket.json
}

resource "aws_bedrockagent_knowledge_base" "resume" {
  name        = "${local.name_prefix}-kb"
  description = "Japanese resume knowledge base for the Cloud Resume RAG demo."
  role_arn    = aws_iam_role.knowledge_base.arn

  knowledge_base_configuration {
    type = "VECTOR"

    vector_knowledge_base_configuration {
      embedding_model_arn = local.embedding_model_arn
    }
  }

  storage_configuration {
    type = "S3_VECTORS"

    s3_vectors_configuration {
      index_arn = aws_s3vectors_index.knowledge.index_arn
    }
  }

  depends_on = [
    aws_iam_role_policy.knowledge_base,
    aws_s3vectors_vector_bucket_policy.knowledge,
  ]
}

resource "aws_bedrockagent_data_source" "resume" {
  knowledge_base_id = aws_bedrockagent_knowledge_base.resume.id
  name              = "${local.name_prefix}-s3"
  description       = "Curated Japanese resume documents."

  lifecycle {
    replace_triggered_by = [aws_bedrockagent_knowledge_base.resume]
  }

  data_source_configuration {
    type = "S3"

    s3_configuration {
      bucket_arn = aws_s3_bucket.knowledge.arn
    }
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"

      fixed_size_chunking_configuration {
        max_tokens         = 300
        overlap_percentage = 10
      }
    }
  }

  depends_on = [aws_s3_object.knowledge]
}
