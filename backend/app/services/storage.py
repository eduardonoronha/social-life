import asyncio
import io
from uuid import uuid4

from minio import Minio

from app.core.config import settings


MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def storage_client(endpoint: str | None = None) -> Minio:
    target = endpoint or settings.storage_endpoint
    return Minio(
        target,
        access_key=settings.storage_access_key,
        secret_key=settings.storage_secret_key,
        secure=settings.storage_secure,
    )


def ensure_bucket() -> None:
    client = storage_client()
    if not client.bucket_exists(settings.storage_bucket):
        client.make_bucket(settings.storage_bucket)


async def init_storage() -> None:
    await asyncio.to_thread(ensure_bucket)


async def store_bytes(content: bytes, content_type: str, original_name: str) -> tuple[str, int]:
    object_key = f"uploads/{uuid4()}-{original_name}"
    await asyncio.to_thread(ensure_bucket)
    client = storage_client()
    await asyncio.to_thread(
        client.put_object,
        settings.storage_bucket,
        object_key,
        io.BytesIO(content),
        len(content),
        content_type=content_type,
    )
    return object_key, len(content)


async def signed_download_url(object_key: str) -> str:
    internal_client = storage_client()
    public_client = storage_client(settings.storage_public_endpoint)
    # The internal client verifies that the object exists before exposing a URL.
    await asyncio.to_thread(internal_client.stat_object, settings.storage_bucket, object_key)
    return await asyncio.to_thread(
        public_client.presigned_get_object,
        settings.storage_bucket,
        object_key,
    )


async def read_bytes(object_key: str) -> bytes:
    client = storage_client()

    def read_object() -> bytes:
        response = client.get_object(settings.storage_bucket, object_key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    return await asyncio.to_thread(read_object)
