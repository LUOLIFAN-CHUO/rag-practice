# Resume AI Chatbot (RAG)

[日本語](./README.md) | English

A Japanese-language RAG assistant embedded in an AWS Cloud Resume. It retrieves only from curated, public resume knowledge and uses Amazon Bedrock to generate grounded answers with source attribution. When evidence is missing, it does not speculate.

**Demo:** https://dyp8879eswsdu.cloudfront.net/

## System architecture

[![AI-Powered Cloud Portfolio architecture](docs/architecture/AI-Powered-Cloud-Portfolio.png)](docs/architecture/AI-Powered-Cloud-Portfolio.html)

Click the image to open the interactive Archify diagram. This repository owns the RAG path shown in the diagram.

```text
Portfolio UI
  → POST /ask
  → Amazon API Gateway
  → AWS Lambda (Python)
  → Amazon Bedrock Knowledge Bases
  → S3 Vectors + S3 documents
  → Amazon Nova Lite / Titan Text Embeddings V2
```

## Highlights

- Natural Japanese answers, including for questions submitted in Chinese or English
- Retrieval, generation, and citations through `RetrieveAndGenerate`
- Guardrails against inventing experience, skills, or personal information
- Reader-friendly source labels mapped from public metadata
- API Gateway CORS, throttling, and input-length controls
- Fixed evaluation questions for answer-quality regression checks
- Terraform-managed AWS resources

## Repository structure

```text
backend/          Lambda handler and Bedrock adapter
knowledge/        Markdown knowledge documents and metadata
infrastructure/   Terraform for API, Lambda, Knowledge Base, and S3
evals/            Evaluation questions, runner, and results
frontend-tests/   Browser API-client tests
api-client.js     POST /ask client
rag-widget.js     AI chat Web Component
```

## API

```http
POST https://db895lxek2.execute-api.ap-northeast-1.amazonaws.com/ask
Content-Type: application/json
```

```json
{
  "question": "AWS の経験について教えてください。"
}
```

A successful response contains `answer`, public `sources`, and `requestId`. The MVP is single-turn and stateless; questions and answers are not persisted.

## Local development and tests

```powershell
python -m http.server 8000
python -m pytest backend/tests -p no:cacheprovider
npm test
```

## Security principles

- Never commit AWS keys, Terraform state, or Lambda build artifacts
- Restrict Lambda IAM access to required Bedrock and logging actions
- Do not expose internal S3 URIs or retrieved passages in API responses
- Do not store full questions or generated answers in application logs
- Keep sign-in, conversation history, and user uploads outside the MVP scope

## Related repositories

- [cloud-resume-frontend](https://github.com/LUOLIFAN-CHUO/cloud-resume-frontend) — resume website and RAG widget
- [cloud-resume-backend](https://github.com/LUOLIFAN-CHUO/cloud-resume-backend) — visitor-counter API

## Architecture artifacts

- [Interactive HTML](docs/architecture/AI-Powered-Cloud-Portfolio.html)
- [Archify source specification](docs/architecture/AI-Powered-Cloud-Portfolio.architecture.json)
- [PNG preview](docs/architecture/AI-Powered-Cloud-Portfolio.png)
