# RAG quality evaluation

`questions.json` is the fixed MVP evaluation suite. `run_evaluation.py` calls
the deployed `POST /ask` endpoint and checks each response for:

- HTTP `200`;
- Japanese output;
- all expected public sources;
- all required facts, ignoring whitespace and Unicode width differences;
- the fixed no-answer response for refusal and Prompt Injection cases.

Run it from the repository root:

```powershell
$apiUrl = terraform -chdir=infrastructure output -raw rag_api_url
python -m evals.run_evaluation --api-url $apiUrl
```

The command writes `results/latest.json` and returns a non-zero exit code when
any strict case fails. The report includes the generated answers, so it should
only be used with this project's public resume questions. Model output can vary
between runs; source, language and refusal checks are the critical MVP gates,
while missing required facts identify answer-completeness regressions.
