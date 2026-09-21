"""AWS Lambda entry point for the resume RAG API."""

import json
import uuid
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from .rag_service import (
    RagResult,
    RagService,
    RagServiceUnavailableError,
    UnconfiguredRagService,
)
from .response import error_response, success_response


MAX_QUESTION_LENGTH = 240


@dataclass(frozen=True, slots=True)
class RequestValidationError(ValueError):
    """A request error that is safe to expose to the API caller."""

    code: str
    message: str


def _request_id(event: Any, context: Any) -> str:
    context_request_id = getattr(context, "aws_request_id", None)
    if context_request_id:
        return str(context_request_id)

    if isinstance(event, Mapping):
        request_context = event.get("requestContext")
        if isinstance(request_context, Mapping) and request_context.get("requestId"):
            return str(request_context["requestId"])

    return str(uuid.uuid4())


def _parse_body(event: Any) -> Mapping[str, Any]:
    if not isinstance(event, Mapping):
        raise RequestValidationError(
            "INVALID_REQUEST",
            "リクエスト形式が正しくありません。",
        )

    body = event.get("body")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError as error:
            raise RequestValidationError(
                "INVALID_REQUEST",
                "リクエスト形式が正しくありません。",
            ) from error

    if not isinstance(body, Mapping):
        raise RequestValidationError(
            "INVALID_REQUEST",
            "リクエスト形式が正しくありません。",
        )

    unsupported_fields = set(body) - {"question"}
    if unsupported_fields:
        raise RequestValidationError(
            "INVALID_REQUEST",
            "リクエストに対応していない項目が含まれています。",
        )

    return body


def _validate_question(body: Mapping[str, Any], max_length: int) -> str:
    question = body.get("question")
    if not isinstance(question, str):
        raise RequestValidationError(
            "INVALID_QUESTION",
            "質問を入力してください。",
        )

    question = question.strip()
    if not question:
        raise RequestValidationError(
            "INVALID_QUESTION",
            "質問を入力してください。",
        )

    if len(question) > max_length:
        raise RequestValidationError(
            "INVALID_QUESTION",
            f"質問は {max_length} 文字以内で入力してください。",
        )

    return question


def create_handler(
    rag_service: RagService,
    *,
    max_question_length: int = MAX_QUESTION_LENGTH,
) -> Callable[[Any, Any], dict[str, Any]]:
    """Build a Lambda handler with an injected RAG service."""

    def handler(event: Any, context: Any) -> dict[str, Any]:
        request_id = _request_id(event, context)

        try:
            body = _parse_body(event)
            question = _validate_question(body, max_question_length)
        except RequestValidationError as error:
            return error_response(400, error.code, error.message, request_id)

        try:
            result = rag_service.answer(question)
            if not isinstance(result, RagResult):
                raise TypeError("RAG service returned an invalid result")
            return success_response(result, request_id)
        except RagServiceUnavailableError:
            return error_response(
                503,
                "SERVICE_UNAVAILABLE",
                "現在、回答を生成できません。しばらくしてからもう一度お試しください。",
                request_id,
            )
        except Exception:
            return error_response(
                500,
                "INTERNAL_ERROR",
                "エラーが発生しました。しばらくしてからもう一度お試しください。",
                request_id,
            )

    return handler


lambda_handler = create_handler(UnconfiguredRagService())
