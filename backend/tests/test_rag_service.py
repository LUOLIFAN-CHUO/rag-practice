from dataclasses import dataclass, field
from typing import Any

import pytest
from botocore.exceptions import ClientError, ConnectTimeoutError

from backend.src.rag_service import (
    GENERATION_PROMPT,
    NO_ANSWER_MESSAGE,
    BedrockRagService,
    RagServiceUnavailableError,
    Source,
)


@dataclass
class FakeBedrockClient:
    response: dict[str, Any] = field(default_factory=dict)
    error: Exception | None = None
    requests: list[dict[str, Any]] = field(default_factory=list)

    def retrieve_and_generate(self, **kwargs: Any) -> dict[str, Any]:
        self.requests.append(kwargs)
        if self.error:
            raise self.error
        return self.response


def service(client: FakeBedrockClient) -> BedrockRagService:
    return BedrockRagService(
        client=client,
        knowledge_base_id="KB12345678",
        model_arn="arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-lite-v1:0",
        number_of_results=4,
    )


def test_answer_calls_bedrock_and_maps_deduplicated_sources() -> None:
    client = FakeBedrockClient(
        response={
            "output": {"text": "AWS を利用したプロジェクトを構築しています。"},
            "citations": [
                {
                    "retrievedReferences": [
                        {
                            "metadata": {
                                "title": "Cloud Resume Challenge",
                                "section": "projects",
                            },
                            "location": {
                                "s3Location": {"uri": "s3://private/internal.md"}
                            },
                        },
                        {
                            "metadata": {
                                "title": "Cloud Resume Challenge",
                                "section": "projects",
                            }
                        },
                    ]
                },
                {
                    "retrievedReferences": [
                        {
                            "metadata": {
                                "title": "技術スキルと学歴",
                                "section": "skills",
                            }
                        }
                    ]
                },
            ],
        }
    )

    result = service(client).answer("AWS の経験を教えてください。")

    assert result.answer == "AWS を利用したプロジェクトを構築しています。"
    assert result.sources == (
        Source(title="Cloud Resume Challenge", section="projects"),
        Source(title="技術スキルと学歴", section="skills"),
    )
    assert "s3://" not in repr(result)

    request = client.requests[0]
    assert request["input"] == {"text": "AWS の経験を教えてください。"}
    configuration = request["retrieveAndGenerateConfiguration"]
    assert configuration["type"] == "KNOWLEDGE_BASE"
    knowledge_base = configuration["knowledgeBaseConfiguration"]
    assert knowledge_base["knowledgeBaseId"] == "KB12345678"
    assert knowledge_base["retrievalConfiguration"][
        "vectorSearchConfiguration"
    ] == {"numberOfResults": 4, "overrideSearchType": "SEMANTIC"}
    assert knowledge_base["generationConfiguration"]["promptTemplate"] == {
        "textPromptTemplate": GENERATION_PROMPT
    }
    assert "$search_results$" in GENERATION_PROMPT
    assert "$output_format_instructions$" in GENERATION_PROMPT


@pytest.mark.parametrize(
    "response",
    [
        {"output": {"text": "根拠のない回答"}, "citations": []},
        {
            "output": {"text": "根拠のない回答"},
            "citations": [{"retrievedReferences": [{"metadata": {}}]}],
        },
        {"output": {"text": ""}, "citations": []},
    ],
)
def test_missing_public_citations_returns_fixed_no_answer(
    response: dict[str, Any],
) -> None:
    result = service(FakeBedrockClient(response=response)).answer("未知の質問")

    assert result.answer == NO_ANSWER_MESSAGE
    assert result.sources == ()


def test_fixed_no_answer_does_not_return_sources() -> None:
    response = {
        "output": {"text": NO_ANSWER_MESSAGE},
        "citations": [
            {
                "retrievedReferences": [
                    {
                        "metadata": {
                            "title": "職務経歴",
                            "section": "AWS",
                        }
                    }
                ]
            }
        ],
    }

    result = service(FakeBedrockClient(response=response)).answer("対象外の質問")

    assert result.answer == NO_ANSWER_MESSAGE
    assert result.sources == ()


@pytest.mark.parametrize(
    "error_code",
    [
        "ThrottlingException",
        "ServiceQuotaExceededException",
        "InternalServerException",
        "DependencyFailedException",
    ],
)
def test_transient_bedrock_errors_are_service_unavailable(
    error_code: str,
) -> None:
    error = ClientError(
        {"Error": {"Code": error_code, "Message": "temporary"}},
        "RetrieveAndGenerate",
    )

    with pytest.raises(RagServiceUnavailableError):
        service(FakeBedrockClient(error=error)).answer("質問")


def test_network_timeout_is_service_unavailable() -> None:
    error = ConnectTimeoutError(endpoint_url="https://bedrock.example")

    with pytest.raises(RagServiceUnavailableError):
        service(FakeBedrockClient(error=error)).answer("質問")


def test_non_transient_client_error_is_not_hidden_as_outage() -> None:
    error = ClientError(
        {"Error": {"Code": "AccessDeniedException", "Message": "denied"}},
        "RetrieveAndGenerate",
    )

    with pytest.raises(ClientError):
        service(FakeBedrockClient(error=error)).answer("質問")
