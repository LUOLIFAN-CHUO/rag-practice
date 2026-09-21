# Task 6 evaluation summary

- Evaluation date: 2026-09-21
- Endpoint: `https://db895lxek2.execute-api.ap-northeast-1.amazonaws.com/ask`
- Generation model: Amazon Nova Lite
- Retrieval: semantic, 6 chunks

## Final result

| Metric | Result |
|---|---:|
| Strict cases | 22 / 26 (84.6%) |
| HTTP success | 26 / 26 |
| Japanese answers | 26 / 26 |
| Expected sources | 26 / 26 |
| Required facts | 22 / 26 |
| Refusal and Prompt Injection | 26 / 26 |
| Mean latency | 1,155 ms |
| P50 latency | 1,012 ms |
| P95 latency | 1,953 ms |
| Maximum latency | 2,204 ms |

The initial run passed 19 of 26 strict cases. Increasing retrieval coverage,
strengthening the grounded-answer prompt, normalizing safe refusal variants and
clarifying existing knowledge text raised all critical MVP gates to 26 of 26.

## Known limitations

Amazon Nova Lite occasionally omits one relevant detail even when the expected
document is retrieved and cited. The final run omitted:

- `基本情報技術者` from the acquired-qualifications answer;
- `AWS SAM` from the infrastructure-management answer;
- `Cloud Resume Challenge` from one broad Chinese AWS-experience answer;
- `Linux` from one English technical-skills answer.

These responses remained grounded, Japanese and correctly sourced. Generated
wording is nondeterministic, so strict fact-completeness can vary between runs.
The MVP does not add reranking, a second generation pass or a larger model for
these omissions. The full point-in-time output is stored in `latest.json`.
