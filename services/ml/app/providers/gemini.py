import os
import json
import logging
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from .base import VisionModelProvider

logger = logging.getLogger("civique-gemini-provider")

class CategoryMatch(BaseModel):
    id: str = Field(description="The matching category ID from the taxonomy, or 'OTHERS' if no category fits.")
    match_strength: str = Field(description="Match strength: high, medium, low, or inconclusive.")

class GeminiAnalysisResult(BaseModel):
    category: CategoryMatch
    alternatives: list[str] = Field(description="List of alternative category IDs if match is ambiguous.")
    visual_observations: list[str] = Field(description="Specific visual facts observed in the photo supporting the conclusion.")
    evidence_relevance: str = Field(description="Relevance strength: high, medium, low, or very_low.")
    uncertainties: list[str] = Field(description="Any visual ambiguities, blur, or uncertainties noticed.")
    analysis_status: str = Field(description="Must be 'completed'.")

class GeminiProvider(VisionModelProvider):
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not configured.")
            
        logger.info(f"Initializing GeminiProvider with model {self.model_name}...")
        self.client = genai.Client(api_key=self.api_key)

    async def analyze_image(
        self,
        image_bytes: bytes,
        categories: list,
        description: str = None,
        selected_category: str = None
    ) -> dict:
        """
        Queries Gemini with dynamic taxonomy system instructions and raw image bytes.
        """
        # Construct taxonomy text definition
        categories_str = "\n".join([
            f"- ID: {c['id']}, Name: {c['name']}, Description: {c['description']}, Visual Criteria: {c['visual_criteria']}"
            for c in categories
        ])

        system_instruction = f"""You are CIVIQUE AI, a civic evidence analysis system.
Analyze the supplied image as visual evidence.
Your task is to determine whether the image visually supports one of the supplied Civique civic issue categories.
Use the complete visual context. Do not classify based merely on individual objects.
Do not infer facts that are not visually observable.

Categories Taxonomy:
{categories_str}

Select OTHERS only when none of the supplied civic categories are sufficiently supported.
Explain the visual evidence supporting your result.
If the evidence is ambiguous, explicitly report uncertainty. Do not claim certainty where the image does not support it.
"""

        # Multimodal parts builder
        contents = [
            types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg"
            )
        ]

        prompt = "Analyze the uploaded civic evidence."
        if description:
            prompt += f"\nCitizen's Report Description: {description}"
        if selected_category:
            prompt += f"\nCitizen's Selected Category: {selected_category}"

        contents.append(prompt)

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=GeminiAnalysisResult,
            temperature=0.1
        )

        try:
            # Execute content generation
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini API request failed: {e}")
            raise e
