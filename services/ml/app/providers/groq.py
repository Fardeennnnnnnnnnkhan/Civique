import os, json, base64, urllib.request, urllib.error, asyncio, socket
from .base import VisionModelProvider

class GroqProviderError(RuntimeError):
    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.retryable = retryable

class GroqVisionProvider(VisionModelProvider):
    """Provider-neutral Groq multimodal adapter with strict, failure-safe contracts."""
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model_name = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
        # Vision requests can take longer than text-only requests. Never allow
        # an accidentally tiny local value (for example 1.5s) to abort them.
        self.timeout_seconds = max(10.0, float(os.getenv("GROQ_TIMEOUT_SECONDS", "30")))

    async def analyze_image(self, image_bytes: bytes, categories: list, description: str = None, selected_category: str = None, mime_type: str = "image/jpeg", citizen_answers: dict | None = None) -> dict:
        if not self.api_key:
            raise GroqProviderError("NOT_CONFIGURED", "GROQ_API_KEY is not configured")
        taxonomy_ids = [str(c.get("id", c)).upper() for c in categories]
        taxonomy = ", ".join(taxonomy_ids)
        prompt = {
            "categories": taxonomy,
            "description": description or "",
            "selected_category": selected_category or "",
            "citizen_answers": citizen_answers or {},
            "analysis_phase": "DETAILED_INSIGHTS" if citizen_answers else "QUESTION_DISCOVERY",
            "requirements": {
                "issue": {
                    "category": "exactly one taxonomy ID; choose POTHOLE when a road-surface cavity/depression is visibly present",
                    "confidence": "calibrated number 0..1 based on visible evidence; do not inflate confidence",
                    "confidence_band": "HIGH when >=0.85, MEDIUM when 0.60-0.84, LOW otherwise",
                    "alternative_categories": [{"category": "taxonomy ID", "confidence": "number 0..1", "reason": "why it may fit"}],
                    "category_rationale": "one sentence explaining the visual evidence for the selected category",
                    "title": "specific factual title, never generic",
                    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
                    "urgency": "LOW|MEDIUM|HIGH|CRITICAL",
                    "condition": "visible condition of the affected asset",
                    "summary": "detailed evidence-grounded summary of what is visibly present and its likely civic impact; never invent facts",
                    "visual_observations": ["3-6 concrete visible observations, no speculation"],
                    "hazards": ["visible or clearly inferable public-safety hazards"],
                    "impact": "likely public impact supported by the image",
                    "recommended_action": "practical next action",
                    "next_steps": ["2-4 practical inspection or response steps"],
                    "affected_asset": "road|drain|light|water|waste|sign|vegetation|other",
                    "evidence_quality": "LOW|MEDIUM|HIGH"
                },
                "authenticity": {
                    "verdict": "REAL|LIKELY_REAL|SUSPICIOUS|LIKELY_SYNTHETIC|INCONCLUSIVE",
                    "confidence": "number 0..1",
                    "signals": ["observable manipulation or provenance signals"],
                    "limitations": ["why this is not forensic proof"]
                },
                "civic_relevance": {
                    "status": "CIVIC_ISSUE_VISIBLE|NO_CIVIC_ISSUE_VISIBLE|AMBIGUOUS",
                    "confidence": "number 0..1",
                    "issue_present": "boolean",
                    "affected_domain": "ROAD_INFRASTRUCTURE|WASTE|WATER|DRAINAGE|LIGHTING|TRAFFIC|PUBLIC_PROPERTY|VEGETATION|ANIMALS|NONE|UNKNOWN",
                    "reason": "short evidence-grounded explanation"
                },
                "decision": "ACCEPT|REJECT|REVIEW_REQUIRED",
                "follow_up_questions": [{"id": "snake_case", "prompt": "image-specific question", "input": "CHOICE", "options": ["exactly three obvious answer choices"], "required": "boolean", "reason": "why this improves triage"}],
                "review": "AUTO_ACCEPT|HUMAN_REVIEW"
            },
            "safety": "Authenticity is advisory visual screening, not forensic proof. Never claim certainty from pixels alone. Analyze the single supplied image only; never claim multiple images, camera angles, measurements, location, timestamps, or metadata. The image is the primary source; description is secondary context. A clear authentic logo, advertisement, document, screenshot, product or unrelated object is still NO_CIVIC_ISSUE_VISIBLE and must be REJECTED. Never use OTHERS to hide an irrelevant image. Generate follow-up questions only for ACCEPT or REVIEW_REQUIRED, and make them specific to visible evidence and uncertainty."
        }
        system_prompt = """You are Civique's senior municipal evidence analyst. Analyze the supplied image carefully and return only valid JSON matching the requested schema. Separate authenticity from civic relevance: a real image is not automatically a valid civic report. REJECT logos, advertisements, documents, screenshots, products, unrelated objects, blank images, and images with no visible public problem. ACCEPT only when a visible civic issue affects public infrastructure, public space, public safety or municipal services. Use REVIEW_REQUIRED when a possible issue is ambiguous. Classify from visible evidence, not stereotypes or unsupported assumptions. Prefer a specific taxonomy category when supported. Calibrate confidence honestly. Never invent location, identity, timestamps, dimensions, number of images, camera angles, metadata, or facts outside the image. Authenticity is advisory visual screening, never forensic proof; use HUMAN_REVIEW for uncertainty or manipulation concerns. Generate 2-5 image-specific follow-up questions for ACCEPT or REVIEW_REQUIRED and no questions for REJECT. Every question must be a CHOICE question with exactly three clear, mutually exclusive options. If citizen_answers are supplied, treat them as confirmed citizen context, incorporate them into the title, summary, severity reasoning, hazards, public impact and recommended action, and return detailed final insights. Do not ask the same questions again after answers are supplied."""
        body = json.dumps({"model": self.model_name, "temperature": 0.1, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": [{"type": "text", "text": json.dumps(prompt)}, {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64," + base64.b64encode(image_bytes).decode()}}]}]}).encode()
        # Groq is fronted by Cloudflare and rejects urllib's default
        # `Python-urllib/<version>` user-agent with HTTP 403/error 1010.
        # Use an explicit service user-agent for the production request.
        request = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Civique-ML/1.0 (+https://civique.local)",
            },
            method="POST",
        )
        def call():
            try:
                with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                    return response.status, json.loads(response.read().decode())
            except urllib.error.HTTPError as error:
                retryable = error.code == 429 or error.code >= 500
                try:
                    upstream_body = error.read().decode("utf-8", errors="replace")[:500]
                except Exception:
                    upstream_body = ""
                detail = f"Groq request failed with HTTP {error.code}"
                if upstream_body:
                    detail = f"{detail}: {upstream_body}"
                raise GroqProviderError("RATE_LIMIT" if error.code == 429 else f"HTTP_{error.code}", detail, retryable) from error
            except (socket.timeout, TimeoutError) as error:
                raise GroqProviderError("TIMEOUT", "Groq vision request timed out", True) from error
            except urllib.error.URLError as error:
                reason = str(error.reason)
                if "timed out" in reason.lower() or "timeout" in reason.lower():
                    raise GroqProviderError("TIMEOUT", "Groq vision request timed out", True) from error
                raise GroqProviderError("NETWORK_ERROR", reason, True) from error
        try:
            _status, result = await asyncio.to_thread(call)
        except GroqProviderError:
            raise
        except json.JSONDecodeError as error:
            raise GroqProviderError("MALFORMED_RESPONSE", "Groq returned invalid JSON", True) from error
        except Exception as error:
            raise GroqProviderError("UPSTREAM_ERROR", str(error), True) from error
        try:
            message = result["choices"][0]["message"]
            if message.get("refusal") or not message.get("content"):
                raise GroqProviderError("REFUSAL", "Groq refused or omitted the structured response")
            content = message["content"]
            parsed = json.loads(content) if isinstance(content, str) else content
            if not isinstance(parsed, dict):
                raise ValueError("response must be an object")
            issue = parsed.get("issue", parsed)
            authenticity = parsed.get("authenticity", {})
            civic_relevance = parsed.get("civic_relevance", {})
            relevance_status = str(civic_relevance.get("status", "")).upper()
            if not relevance_status:
                # Backward-compatible normalization for older provider fixtures.
                legacy_category = str(issue.get("category", "")).upper()
                relevance_status = "CIVIC_ISSUE_VISIBLE" if legacy_category in taxonomy_ids else "AMBIGUOUS"
            if relevance_status not in {"CIVIC_ISSUE_VISIBLE", "NO_CIVIC_ISSUE_VISIBLE", "AMBIGUOUS"}:
                raise ValueError("civic_relevance.status is invalid")
            relevance_confidence = float(civic_relevance.get("confidence", 0.0))
            if not 0 <= relevance_confidence <= 1:
                raise ValueError("civic_relevance.confidence must be between 0 and 1")
            decision = str(parsed.get("decision", "")).upper()
            if decision not in {"ACCEPT", "REJECT", "REVIEW_REQUIRED"}:
                decision = "REJECT" if relevance_status == "NO_CIVIC_ISSUE_VISIBLE" else "REVIEW_REQUIRED" if relevance_status == "AMBIGUOUS" else "ACCEPT"
            if relevance_status == "NO_CIVIC_ISSUE_VISIBLE":
                decision = "REJECT"
            category = str(issue.get("category", "")).upper()
            if decision == "REJECT":
                category = "NOT_A_CIVIC_ISSUE"
            elif category not in taxonomy_ids:
                raise ValueError("category is outside the supplied taxonomy")
            confidence = float(issue.get("confidence", 0.0))
            if not 0 <= confidence <= 1:
                raise ValueError("confidence must be between 0 and 1")
            required_text = ("title", "summary", "recommended_action")
            if any(not isinstance(issue.get(field), str) or not issue[field].strip() for field in required_text):
                raise ValueError("issue title, summary, and recommended action are required")
            if issue.get("severity") not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"} or issue.get("urgency") not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
                raise ValueError("issue severity and urgency are invalid")
            if issue.get("evidence_quality") is not None and issue.get("evidence_quality") not in {"LOW", "MEDIUM", "HIGH"}:
                raise ValueError("issue evidence quality is invalid")
            expected_band = "HIGH" if confidence >= 0.85 else "MEDIUM" if confidence >= 0.60 else "LOW"
            issue["confidence_band"] = expected_band
            alternatives = issue.get("alternative_categories", [])
            if not isinstance(alternatives, list):
                raise ValueError("alternative_categories must be an array")
            issue["alternative_categories"] = [alternative for alternative in alternatives if isinstance(alternative, dict) and str(alternative.get("category", "")).upper() in taxonomy_ids][:3]
            if authenticity.get("verdict") not in {"REAL", "LIKELY_REAL", "SUSPICIOUS", "LIKELY_SYNTHETIC", "INCONCLUSIVE"}:
                raise ValueError("authenticity verdict is invalid")
            authenticity_confidence = float(authenticity.get("confidence", 0.0))
            if not 0 <= authenticity_confidence <= 1:
                raise ValueError("authenticity confidence must be between 0 and 1")
            for field in ("visual_observations", "hazards", "next_steps", "signals", "limitations"):
                value = issue.get(field) if field in issue else authenticity.get(field)
                if value is not None and not isinstance(value, list):
                    raise ValueError(f"{field} must be an array")
            questions = parsed.get("follow_up_questions", [])
            if not isinstance(questions, list):
                raise ValueError("follow_up_questions must be an array")
            normalized_questions = []
            for q in questions[:5]:
                if not isinstance(q, dict) or not isinstance(q.get("id"), str) or not isinstance(q.get("prompt"), str):
                    continue
                options = q.get("options")
                if not isinstance(options, list):
                    continue
                options = [str(option).strip() for option in options if str(option).strip()][:3]
                if len(options) != 3:
                    continue
                normalized_questions.append({**q, "input": "CHOICE", "options": options})
            parsed["follow_up_questions"] = normalized_questions
            parsed["civic_relevance"] = {**civic_relevance, "status": relevance_status, "confidence": relevance_confidence}
            parsed["decision"] = decision
        except GroqProviderError:
            raise
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            raise GroqProviderError("MALFORMED_RESPONSE", str(error), True) from error
        issue = parsed.get("issue", parsed)
        authenticity = parsed.get("authenticity", {})
        parsed.update({
            "category": category,
            "confidence": confidence,
            "label": issue["title"],
            "summary": issue["summary"],
            "issue": issue,
            "authenticity": authenticity,
            "civic_relevance": parsed.get("civic_relevance"),
            "decision": parsed.get("decision", "REVIEW_REQUIRED"),
            "follow_up_questions": parsed.get("follow_up_questions", []),
            "review": "HUMAN_REVIEW" if parsed.get("decision") == "REVIEW_REQUIRED" or authenticity["verdict"] in {"SUSPICIOUS", "LIKELY_SYNTHETIC", "INCONCLUSIVE"} else parsed.get("review", "AUTO_ACCEPT"),
            "model_version": self.model_name,
            "engine": "groq",
            "analysis_status": "completed"
        })
        parsed["usage"] = result.get("usage", {})
        return parsed

    async def verify_resolution(self, before_bytes: bytes, after_bytes: bytes, category: str, notes: str, before_mime: str = "image/jpeg", after_mime: str = "image/jpeg") -> dict:
        if not self.api_key:
            raise GroqProviderError("NOT_CONFIGURED", "GROQ_API_KEY is not configured")
        prompt = f"""Compare BEFORE and AFTER municipal evidence for taxonomy category {category}. Worker notes: {notes}.
Return only JSON: {{"outcome":"VERIFIED|REVIEW_REQUIRED|REJECTED","confidence":0..1,"before_issue_visible":boolean,"after_issue_visible":boolean,"visible_improvement":"NONE|PARTIAL|SUBSTANTIAL|COMPLETE|UNCERTAIN","before_observations":[string],"after_observations":[string],"authenticity":{{"verdict":"LIKELY_REAL|SUSPICIOUS|INCONCLUSIVE","signals":[string],"limitations":[string]}},"rationale":string}}.
Use pixels only. Never infer GPS, timestamps, worker identity, or hidden work. Choose VERIFIED only for clear relevant improvement; REJECTED only when the issue visibly remains or after evidence is irrelevant; otherwise REVIEW_REQUIRED."""
        body = json.dumps({"model": self.model_name, "temperature": 0.1, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": "You are Civique's municipal resolution evidence reviewer. Be conservative, factual, and return only the requested JSON."}, {"role": "user", "content": [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": f"data:{before_mime};base64," + base64.b64encode(before_bytes).decode()}}, {"type": "image_url", "image_url": {"url": f"data:{after_mime};base64," + base64.b64encode(after_bytes).decode()}}]}]}).encode()
        request = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=body, headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Civique-ML/1.0 (+https://civique.local)"}, method="POST")
        def call():
            try:
                with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                    return json.loads(response.read().decode())
            except urllib.error.HTTPError as error:
                raise GroqProviderError("RATE_LIMIT" if error.code == 429 else f"HTTP_{error.code}", f"Groq request failed with HTTP {error.code}", error.code == 429 or error.code >= 500) from error
            except (urllib.error.URLError, socket.timeout, TimeoutError) as error:
                raise GroqProviderError("NETWORK_ERROR", str(error), True) from error
        result = await asyncio.to_thread(call)
        try:
            content = result["choices"][0]["message"]["content"]
            parsed = json.loads(content) if isinstance(content, str) else content
            if parsed.get("outcome") not in {"VERIFIED", "REVIEW_REQUIRED", "REJECTED"}: raise ValueError("invalid outcome")
            confidence = float(parsed["confidence"])
            if not 0 <= confidence <= 1: raise ValueError("invalid confidence")
            parsed["confidence"] = confidence
            return parsed
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            raise GroqProviderError("MALFORMED_RESPONSE", str(error), True) from error
