import asyncio
import json
import os
import urllib.error
import urllib.request
from contextlib import contextmanager

import app.providers.groq as groq_module
from app.providers.groq import GroqProviderError, GroqVisionProvider


class FakeResponse:
    def __init__(self, payload, status=200):
        self.status = status
        self.payload = payload

    def read(self):
        return json.dumps(self.payload).encode()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


@contextmanager
def patched_urlopen(handler):
    original = urllib.request.urlopen
    urllib.request.urlopen = handler
    try:
        yield
    finally:
        urllib.request.urlopen = original


def run_case(handler, expected_code=None, expected_result=None, expected_authenticity=None):
    os.environ["GROQ_API_KEY"] = "test-key"
    os.environ["GROQ_MODEL"] = "test-model"
    async def execute():
        return await GroqVisionProvider().analyze_image(b"image", [{"id": "POTHOLE"}, {"id": "GARBAGE"}], "pothole")
    with patched_urlopen(handler):
        original_to_thread = groq_module.asyncio.to_thread
        groq_module.asyncio.to_thread = lambda function: _run_without_thread(function)
        try:
            result = asyncio.run(execute())
            if expected_code:
                raise AssertionError(f"expected {expected_code}")
            if expected_result:
                assert result["category"] == expected_result
            if expected_authenticity:
                assert result["authenticity"]["verdict"] == expected_authenticity
        except GroqProviderError as error:
            assert error.code == expected_code, (error.code, expected_code)
        finally:
            groq_module.asyncio.to_thread = original_to_thread


async def _run_without_thread(function):
    return function()


run_case(lambda *_args, **_kwargs: FakeResponse({"choices": [{"message": {"content": json.dumps({"issue": {"category": "POTHOLE", "confidence": 0.91, "title": "Road pothole", "severity": "HIGH", "urgency": "HIGH", "summary": "A visible pothole is present in the road surface.", "visual_observations": [], "hazards": [], "recommended_action": "Inspect and repair the road surface.", "affected_asset": "road"}, "authenticity": {"verdict": "LIKELY_REAL", "confidence": 0.8, "signals": [], "limitations": ["Visual screening is not forensic proof."]}})}}]}), expected_result="POTHOLE")
run_case(lambda *_args, **_kwargs: FakeResponse({"choices": [{"message": {"content": json.dumps({"issue": {"category": "GARBAGE", "confidence": 0.88, "title": "Waste image requires review", "severity": "MEDIUM", "urgency": "MEDIUM", "summary": "Visible image artifacts make the waste scene uncertain.", "visual_observations": ["Repeated edge patterns"], "hazards": [], "recommended_action": "Request original evidence and review manually.", "affected_asset": "waste"}, "authenticity": {"verdict": "SUSPICIOUS", "confidence": 0.84, "signals": ["Repeated texture artifacts"], "limitations": ["Visual screening is not forensic proof."]}})}}]}), expected_result="GARBAGE", expected_authenticity="SUSPICIOUS")
run_case(lambda *_args, **_kwargs: (_ for _ in ()).throw(TimeoutError()), expected_code="TIMEOUT")
run_case(lambda *_args, **_kwargs: (_ for _ in ()).throw(urllib.error.HTTPError("x", 429, "rate", {}, None)), expected_code="RATE_LIMIT")
run_case(lambda *_args, **_kwargs: FakeResponse({"choices": [{"message": {"refusal": "unsafe"}}]}), expected_code="REFUSAL")
run_case(lambda *_args, **_kwargs: FakeResponse({"choices": [{"message": {"content": "not-json"}}]}), expected_code="MALFORMED_RESPONSE")
run_case(lambda *_args, **_kwargs: (_ for _ in ()).throw(urllib.error.URLError("offline")), expected_code="NETWORK_ERROR")
print("Groq provider contract tests passed.")
