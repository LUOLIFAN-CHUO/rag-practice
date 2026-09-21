"""API Gateway response helpers."""

import json
from collections.abc import Mapping
from typing import Any

from .rag_service import RagResult


JSON_HEADERS = {"Content-Type": "application/json; charset=utf-8"}


def json_response(status_code: int, payload: Mapping[str, Any]) -> dict[str, Any]:
    """Create an API Gateway compatible JSON response."""

    return {
        "statusCode": status_code,
        "headers": JSON_HEADERS.copy(),
        "body": json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
    }


def success_response(result: RagResult, request_id: str) -> dict[str, Any]:
    """Create the public success response defined in the API contract."""

    return json_response(
        200,
        {
            "answer": result.answer,
            "sources": [
                {"title": source.title, "section": source.section}
                for source in result.sources
            ],
            "requestId": request_id,
        },
    )


def error_response(
    status_code: int,
    code: str,
    message: str,
    request_id: str,
) -> dict[str, Any]:
    """Create a safe public error response without internal details."""

    return json_response(
        status_code,
        {
            "error": {"code": code, "message": message},
            "requestId": request_id,
        },
    )
