"""Save and validate post media (images, videos, embed URLs)."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
VIDEO_EXT = {".mp4", ".webm", ".mov"}

IMAGE_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}
VIDEO_MIME = {"video/mp4", "video/webm", "video/quicktime"}


def parse_video_embed(url: str) -> str | None:
    """Return an embeddable URL for YouTube / Vimeo links."""
    url = url.strip()
    if not url:
        return None

    yt_patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)([\w-]{11})",
        r"youtube\.com/embed/([\w-]{11})",
    ]
    for pattern in yt_patterns:
        m = re.search(pattern, url, re.I)
        if m:
            return f"https://www.youtube.com/embed/{m.group(1)}"

    vimeo = re.search(r"vimeo\.com/(?:video/)?(\d+)", url, re.I)
    if vimeo:
        return f"https://player.vimeo.com/video/{vimeo.group(1)}"

    return None


async def save_upload(file: UploadFile) -> tuple[str, str]:
    """Persist an uploaded file; return (public_url, media_type)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    ext = Path(file.filename).suffix.lower()
    content_type = (file.content_type or "").split(";")[0].strip().lower()

    if ext in IMAGE_EXT or content_type in IMAGE_MIME:
        media_type = "image"
        max_bytes = MAX_IMAGE_BYTES
        if ext not in IMAGE_EXT:
            ext = ".jpg"
    elif ext in VIDEO_EXT or content_type in VIDEO_MIME:
        media_type = "video"
        max_bytes = MAX_VIDEO_BYTES
        if ext not in VIDEO_EXT:
            ext = ".mp4"
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, WebM, or MOV.",
        )

    data = await file.read()
    if len(data) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"File too large (max {limit_mb} MB)")

    name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name
    dest.write_bytes(data)

    return f"/uploads/{name}", media_type
