"""RAG service boundary used by the Lambda handler.

The real Amazon Bedrock adapter is intentionally deferred to Task 4. Keeping
the boundary independent from boto3 makes the API contract testable without
AWS credentials or network access.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class Source:
    """A public citation that can be returned to the frontend."""

    title: str
    section: str


@dataclass(frozen=True, slots=True)
class RagResult:
    """Normalized result produced by any RAG service implementation."""

    answer: str
    sources: tuple[Source, ...] = ()


class RagService(Protocol):
    """Interface implemented by mock and future Bedrock RAG services."""

    def answer(self, question: str) -> RagResult:
        """Return a grounded answer and its public sources."""


class RagServiceUnavailableError(RuntimeError):
    """Raised when the configured RAG provider cannot serve a request."""


class UnconfiguredRagService:
    """Safe default used until the Bedrock adapter is implemented."""

    def answer(self, question: str) -> RagResult:
        del question
        raise RagServiceUnavailableError("RAG service is not configured")
