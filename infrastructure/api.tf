resource "aws_apigatewayv2_api" "rag" {
  name          = "${local.name_prefix}-api"
  description   = "Public HTTP API for the resume RAG assistant."
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["content-type"]
    allow_methods = ["POST", "OPTIONS"]
    allow_origins = var.allowed_origins
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "rag_lambda" {
  api_id = aws_apigatewayv2_api.rag.id

  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.rag.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = var.api_integration_timeout_milliseconds
}

resource "aws_apigatewayv2_route" "ask" {
  api_id = aws_apigatewayv2_api.rag.id

  route_key = "POST /ask"
  target    = "integrations/${aws_apigatewayv2_integration.rag_lambda.id}"
}

resource "aws_apigatewayv2_stage" "rag" {
  api_id = aws_apigatewayv2_api.rag.id

  name        = "$default"
  auto_deploy = true

  route_settings {
    route_key              = aws_apigatewayv2_route.ask.route_key
    throttling_burst_limit = var.api_throttling_burst_limit
    throttling_rate_limit  = var.api_throttling_rate_limit
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rag.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.rag.execution_arn}/*/POST/ask"
}
