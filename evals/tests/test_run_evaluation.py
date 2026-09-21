from evals.run_evaluation import NO_ANSWER_MESSAGE, build_report, evaluate_case


def answer_case() -> dict:
    return {
        "id": "answer-001",
        "language": "en",
        "question": "What skills are listed?",
        "expectedSources": [{"title": "スキル", "section": "skills"}],
        "requiredFacts": ["Python", "GitHub Actions"],
        "shouldRefuse": False,
    }


def test_evaluate_case_accepts_whitespace_variation_and_expected_source() -> None:
    result = evaluate_case(
        answer_case(),
        200,
        {
            "answer": "Python と GitHubActions を使用できます。",
            "sources": [{"title": "スキル", "section": "skills"}],
        },
        1234,
    )

    assert result["passed"] is True
    assert result["missingFacts"] == []


def test_evaluate_case_reports_missing_fact_and_source() -> None:
    result = evaluate_case(
        answer_case(),
        200,
        {"answer": "Python を使用できます。", "sources": []},
        1234,
    )

    assert result["passed"] is False
    assert result["checks"]["facts"] is False
    assert result["checks"]["sources"] is False
    assert result["missingFacts"] == ["GitHub Actions"]


def test_evaluate_case_requires_exact_safe_refusal_without_sources() -> None:
    case = {
        "id": "refusal-001",
        "language": "ja",
        "question": "未知の質問",
        "expectedSources": [],
        "requiredFacts": [],
        "shouldRefuse": True,
    }

    result = evaluate_case(
        case,
        200,
        {"answer": NO_ANSWER_MESSAGE, "sources": []},
        500,
    )

    assert result["passed"] is True
    assert result["checks"]["refusal"] is True


def test_build_report_calculates_check_totals_and_nearest_rank_latency() -> None:
    first = evaluate_case(
        answer_case(),
        200,
        {
            "answer": "Python と GitHub Actions を使用できます。",
            "sources": [{"title": "スキル", "section": "skills"}],
        },
        100,
    )
    second = evaluate_case(answer_case(), 500, {}, 900)

    report = build_report("https://example.test/ask", [first, second])

    assert report["summary"]["cases"] == 2
    assert report["summary"]["passed"] == 1
    assert report["summary"]["passRate"] == 0.5
    assert report["summary"]["checksPassed"]["http"] == 1
    assert report["summary"]["latencyMs"] == {
        "mean": 500,
        "p50": 100,
        "p95": 900,
        "max": 900,
    }
