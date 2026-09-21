"""Run the fixed resume RAG evaluation set against the public HTTP API."""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


NO_ANSWER_MESSAGE = (
    "現在の履歴書には、その情報が記載されていません。"
    "AWS の経験、技術スキル、プロジェクト、学歴についてご質問ください。"
)
JAPANESE_KANA = re.compile(r"[\u3040-\u30ff]")
RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})


def _normalized(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold()
    return "".join(normalized.split())


def _source_key(source: dict[str, Any]) -> tuple[str, str]:
    return str(source.get("title", "")), str(source.get("section", ""))


def evaluate_case(
    case: dict[str, Any],
    status_code: int,
    payload: dict[str, Any],
    latency_ms: int,
) -> dict[str, Any]:
    answer = payload.get("answer", "")
    if not isinstance(answer, str):
        answer = ""

    raw_sources = payload.get("sources", [])
    sources = (
        [source for source in raw_sources if isinstance(source, dict)]
        if isinstance(raw_sources, list)
        else []
    )
    actual_source_keys = {_source_key(source) for source in sources}
    expected_source_keys = {
        _source_key(source) for source in case.get("expectedSources", [])
    }

    normalized_answer = _normalized(answer)
    missing_facts = [
        fact
        for fact in case.get("requiredFacts", [])
        if _normalized(str(fact)) not in normalized_answer
    ]
    refused = answer.strip() == NO_ANSWER_MESSAGE and not sources
    should_refuse = bool(case.get("shouldRefuse"))

    checks = {
        "http": status_code == 200,
        "japanese": bool(JAPANESE_KANA.search(answer)),
        "sources": (
            not actual_source_keys
            if should_refuse
            else expected_source_keys.issubset(actual_source_keys)
        ),
        "facts": not missing_facts,
        "refusal": refused if should_refuse else not refused,
    }

    return {
        "id": case["id"],
        "inputLanguage": case["language"],
        "statusCode": status_code,
        "latencyMs": latency_ms,
        "passed": all(checks.values()),
        "checks": checks,
        "missingFacts": missing_facts,
        "expectedSources": case.get("expectedSources", []),
        "actualSources": sources,
        "answer": answer,
    }


def _request(
    api_url: str,
    question: str,
    timeout_seconds: float,
    retry_count: int,
) -> tuple[int, dict[str, Any], int]:
    body = json.dumps({"question": question}, ensure_ascii=False).encode("utf-8")
    last_status = 0
    last_payload: dict[str, Any] = {}
    total_started = time.perf_counter()

    for attempt in range(retry_count + 1):
        request = urllib.request.Request(
            api_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                last_status = response.status
                raw_payload = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            last_status = error.code
            raw_payload = error.read().decode("utf-8")
        except urllib.error.URLError as error:
            if attempt < retry_count:
                time.sleep(2**attempt)
                continue
            raise RuntimeError(f"API request failed: {error.reason}") from error

        try:
            decoded = json.loads(raw_payload)
            last_payload = decoded if isinstance(decoded, dict) else {}
        except json.JSONDecodeError:
            last_payload = {}

        if last_status not in RETRYABLE_STATUS_CODES or attempt == retry_count:
            break
        time.sleep(2**attempt)

    latency_ms = round((time.perf_counter() - total_started) * 1000)
    return last_status, last_payload, latency_ms


def _percentile(values: list[int], percentile: float) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    index = max(0, math.ceil(percentile * len(ordered)) - 1)
    return ordered[index]


def build_report(
    api_url: str,
    results: list[dict[str, Any]],
) -> dict[str, Any]:
    latencies = [int(result["latencyMs"]) for result in results]
    check_names = ("http", "japanese", "sources", "facts", "refusal")
    passed = sum(bool(result["passed"]) for result in results)

    return {
        "schemaVersion": "1.0",
        "evaluatedAt": datetime.now(UTC).isoformat(),
        "apiUrl": api_url,
        "summary": {
            "cases": len(results),
            "passed": passed,
            "failed": len(results) - passed,
            "passRate": round(passed / len(results), 4) if results else 0,
            "checksPassed": {
                name: sum(bool(result["checks"][name]) for result in results)
                for name in check_names
            },
            "latencyMs": {
                "mean": round(statistics.fmean(latencies)) if latencies else 0,
                "p50": _percentile(latencies, 0.50),
                "p95": _percentile(latencies, 0.95),
                "max": max(latencies, default=0),
            },
        },
        "results": results,
    }


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True)
    parser.add_argument(
        "--questions",
        type=Path,
        default=Path(__file__).with_name("questions.json"),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path(__file__).with_name("results") / "latest.json",
    )
    parser.add_argument("--timeout", type=float, default=35.0)
    parser.add_argument("--retries", type=int, default=2)
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    suite = json.loads(args.questions.read_text(encoding="utf-8"))
    cases = suite.get("cases", [])
    if not isinstance(cases, list) or not cases:
        raise ValueError("The evaluation suite does not contain any cases")

    results: list[dict[str, Any]] = []
    for index, case in enumerate(cases, start=1):
        status, payload, latency_ms = _request(
            args.api_url,
            str(case["question"]),
            args.timeout,
            args.retries,
        )
        result = evaluate_case(case, status, payload, latency_ms)
        results.append(result)
        outcome = "PASS" if result["passed"] else "FAIL"
        print(f"[{index:02d}/{len(cases):02d}] {outcome} {case['id']} ({latency_ms} ms)", flush=True)

    report = build_report(args.api_url, results)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    summary = report["summary"]
    print(
        f"Completed: {summary['passed']}/{summary['cases']} passed; "
        f"P95 {summary['latencyMs']['p95']} ms; report {args.report}",
        flush=True,
    )
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
