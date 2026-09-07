class VisionModelProvider:
    async def analyze_image(
        self,
        image_bytes: bytes,
        categories: list,
        description: str = None,
        selected_category: str = None
    ) -> dict:
        """
        Runs multimodal vision analysis on the supplied image bytes.
        Returns a structured dictionary matching Civique AI Verification payload specifications.
        """
        raise NotImplementedError
