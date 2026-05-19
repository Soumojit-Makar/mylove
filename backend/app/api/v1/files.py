"""Files router — upload and retrieval via S3 (Vercel has no persistent disk)."""

import io
import uuid
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from bson import ObjectId

from app.core.security import require_permission
from app.core.config import settings
from app.core.database import get_db

router = APIRouter(prefix="/files")

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


async def _store(content: bytes, key: str, content_type: str) -> str:
    """Upload to S3 or write to local disk depending on STORAGE_BACKEND."""
    if settings.STORAGE_BACKEND == "s3":
        s3 = _s3_client()
        s3.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type,
            ServerSideEncryption="AES256",
        )
        region = settings.AWS_REGION
        bucket = settings.AWS_S3_BUCKET
        return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    else:
        # Local dev only — Vercel functions have no persistent disk
        path = os.path.join(settings.MEDIA_ROOT, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        import aiofiles
        async with aiofiles.open(path, "wb") as f:
            await f.write(content)
        return f"/media/{key}"


async def _delete_from_storage(url_or_key: str) -> None:
    if settings.STORAGE_BACKEND == "s3":
        # Extract key from S3 URL
        key = url_or_key.split(".amazonaws.com/", 1)[-1] if ".amazonaws.com/" in url_or_key else url_or_key
        s3 = _s3_client()
        s3.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
    else:
        local_path = url_or_key.lstrip("/media/")
        full_path = os.path.join(settings.MEDIA_ROOT, local_path)
        if os.path.exists(full_path):
            os.remove(full_path)


def _presigned_url(key: str, expires: int = 3600) -> str:
    """Generate a time-limited pre-signed S3 URL for secure direct access."""
    s3 = _s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": key},
        ExpiresIn=expires,
    )


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    resource_type: str = "general",
    resource_id: str = None,
    user: dict = Depends(require_permission("*")),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type not allowed: {file.content_type}")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "File too large (max 10 MB)")

    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4()}{ext}"
    key = f"{user['tenant_id']}/{resource_type}/{filename}"

    url = await _store(content, key, file.content_type)

    db = get_db()
    doc = {
        "filename":      filename,
        "original_name": file.filename,
        "content_type":  file.content_type,
        "size":          len(content),
        "storage_key":   key,
        "url":           url,
        "resource_type": resource_type,
        "resource_id":   resource_id,
        "tenant_id":     user["tenant_id"],
        "uploaded_by":   str(user["_id"]),
        "created_at":    datetime.now(timezone.utc),
    }
    r = await db.files.insert_one(doc)
    return {"id": str(r.inserted_id), "filename": filename, "url": url, "size": len(content)}


@router.get("/{file_id}")
async def get_file(file_id: str, user: dict = Depends(require_permission("*"))):
    db = get_db()
    doc = await db.files.find_one({"_id": ObjectId(file_id), "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(404, "File not found")
    doc["_id"] = str(doc["_id"])

    # For S3 files, return a fresh pre-signed URL on each access
    if settings.STORAGE_BACKEND == "s3" and doc.get("storage_key"):
        doc["url"] = _presigned_url(doc["storage_key"])

    return doc


@router.delete("/{file_id}", status_code=204)
async def delete_file(file_id: str, user: dict = Depends(require_permission("*"))):
    db = get_db()
    doc = await db.files.find_one({"_id": ObjectId(file_id), "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(404, "File not found")
    await _delete_from_storage(doc.get("storage_key") or doc.get("url", ""))
    await db.files.delete_one({"_id": ObjectId(file_id)})
