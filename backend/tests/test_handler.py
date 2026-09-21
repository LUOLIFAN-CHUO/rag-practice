import json
from dataclasses import dataclass, field

import pytest

from backend.src.handler import MAX_QUESTION_LENGTH, create_handler, lambda_handler
from backend.src.rag_service import (
    RagResult,
    RagServiceUnavailableError,
    Source,
)


@dataclass
class FakeContext:
    aws_request_id: str = "lambda-request-123"


@dataclass
class FakeRagService:
    result: RagResult = RagResult(
        answer="AWS の経験は主に二つあります。",
        sources=(
            Source(title="AWS Japan インターンシップ", section="experience"),
            Source(title="Cloud Resume Challenge", section="projects"),
        ),
    )
    questions: list[str] = field(default_factory=list)

    def answer(self, question: str) -> RagResult:
        self.questions.append(question)
        return self.result


class UnavailableRagService:
    def answer(self, question: str) -> RagResult:
        del question
        raise RagServiceUnavailableError("temporary failure")


class BrokenRagService:
    def answer(self, question: str) -> RagResult:
        del question
        raise RuntimeError("internal implementation detail")


def parse_body(response: dict) -> dict:
    return json.loads(response["body"])


def test_valid_question_returns_contract_response() -> None:
    service = FakeRagService()
    handler = create_handler(service)

    response = handler(
        {"body": json.dumps({"question": "  AWS の経験を教えてください。  "})},
        FakeContext(),
    )

    assert response["statusCode"] == 200
    assert response["headers"]["Content-Type"] == "application/json; charset=utf-8"
    assert parse_body(response) == {
        "answer": "AWS の経験は主に二つあります。",
        "sources": [
            {"title": "AWS Japan インターンシップ", "section": "experience"},
            {"title": "Cloud Resume Challenge", "section": "projects"},
        ],
        "requestId": "lambda-request-123",
    }
    assert service.questions == ["AWS の経験を教えてください。"]


def test_dict_body_is_supported_for_direct_lambda_invocation() -> None:
    service = FakeRagService()
    handler = create_handler(service)

    response = handler({"body": {"question": "技術スキルは？"}}, FakeContext())

    assert response["statusCode"] == 200
    assert service.questions == ["技術スキルは？"]


def test_no_answer_is_a_success_response_without_sources() -> None:
    service = FakeRagService(
        result=RagResult(
            answer="現在の履歴書には、その情報が記載されていません。",
            sources=(),
        )
    )
    handler = create_handler(service)

    response = handler(
        {"body": json.dumps({"question": "Kubernetes の経験は？"})},
        FakeContext(),
    )

    assert response["statusCode"] == 200
    assert parse_body(response)["sources"] == []


@pytest.mark.parametrize(
    ("body", "expected_message"),
    [
        ({}, "質問を入力してください。"),
        ({"question": None}, "質問を入力してください。"),
        ({"question": 123}, "質問を入力してください。"),
        ({"question": "   "}, "質問を入力してください。"),
        (
            {"question": "あ" * (MAX_QUESTION_LENGTH + 1)},
            f"質問は {MAX_QUESTION_LENGTH} 文字以内で入力してください。",
        ),
    ],
)
def test_invalid_question_returns_400(body: dict, expected_message: str) -> None:
    service = FakeRagService()
    handler = create_handler(service)

    response = handler({"body": json.dumps(body)}, FakeContext())
    payload = parse_body(response)

    assert response["statusCode"] == 400
    assert payload["error"] == {
        "code": "INVALID_QUESTION",
        "message": expected_message,
    }
    assert service.questions == []


@pytest.mark.parametrize(
    "event",
    [
        None,
        {},
        {"body": "not-json"},
        {"body": json.dumps(["not", "an", "object"])},
        {"body": json.dumps({"question": "質問", "modelArn": "not-allowed"})},
    ],
)
def test_invalid_request_returns_400(event: object) -> None:
    service = FakeRagService()
    handler = create_handler(service)

    response = handler(event, FakeContext())
    payload = parse_body(response)

    assert response["statusCode"] == 400
    assert payload["error"]["code"] == "INVALID_REQUEST"
    assert service.questions == []


def test_api_gateway_request_id_is_used_without_lambda_context() -> None:
    handler = create_handler(FakeRagService())

    response = handler(
        {
            "body": json.dumps({"question": "学歴を教えてください。"}),
            "requestContext": {"requestId": "gateway-request-456"},
        },
        None,
    )

    assert parse_body(response)["requestId"] == "gateway-request-456"


def test_unavailable_service_returns_safe_503() -> None:
    handler = create_handler(UnavailableRagService())

    response = handler(
        {"body": json.dumps({"question": "AWS の経験は？"})},
        FakeContext(),
    )
    payload = parse_body(response)

    assert response["statusCode"] == 503
    assert payload["error"]["code"] == "SERVICE_UNAVAILABLE"
    assert "temporary failure" not in response["body"]


def test_unexpected_service_error_returns_safe_500() -> None:
    handler = create_handler(BrokenRagService())

    response = handler(
        {"body": json.dumps({"question": "AWS の経験は？"})},
        FakeContext(),
    )
    payload = parse_body(response)

    assert response["statusCode"] == 500
    assert payload["error"]["code"] == "INTERNAL_ERROR"
    assert "internal implementation detail" not in response["body"]


def test_default_lambda_handler_has_no_aws_dependency() -> None:
    response = lambda_handler(
        {"body": json.dumps({"question": "AWS の経験は？"})},
        FakeContext(),
    )

    assert response["statusCode"] == 503
    assert parse_body(response)["error"]["code"] == "SERVICE_UNAVAILABLE"
