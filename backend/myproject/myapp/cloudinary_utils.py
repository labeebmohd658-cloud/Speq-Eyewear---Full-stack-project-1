
import logging

import cloudinary
import cloudinary.api
import cloudinary.uploader

from django.conf import settings


logger = logging.getLogger(__name__)


# ============================================================
# CLOUDINARY CONFIGURATION
# ============================================================

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


# ============================================================
# PROFILE PICTURE UPLOAD
# ============================================================

def upload_profile_picture(image):

    result = cloudinary.uploader.upload(
        image,
        folder="speq/profile_pictures",
        resource_type="image",
    )

    return result["secure_url"]


# ============================================================
# PRODUCT IMAGE UPLOAD
# ============================================================

def upload_product_image(image):

    result = cloudinary.uploader.upload(
        image,
        folder="speq/products",
        resource_type="image",
    )

    return {
        "image_url": result["secure_url"],
        "public_id": result["public_id"],
    }


# ============================================================
# SINGLE PRODUCT IMAGE DELETE
# ============================================================

def delete_product_image(public_id):

    if not public_id:
        return {"result": "not found"}

    result = cloudinary.uploader.destroy(
        public_id,
        resource_type="image",
        invalidate=True,
    )

    return result


# ============================================================
# MULTIPLE PRODUCT IMAGE DELETE
# ============================================================

def delete_product_images(public_ids):

    if not public_ids:
        return {}

    # Remove empty and duplicate public IDs.
    public_ids = list(
        dict.fromkeys(
            public_id
            for public_id in public_ids
            if public_id
        )
    )

    if not public_ids:
        return {}

    deleted_results = {}

    try:

        # Cloudinary bulk deletion supports batches of up to 1000 IDs.
        for start in range(0, len(public_ids), 1000):

            batch = public_ids[start:start + 1000]

            result = cloudinary.api.delete_resources(
                batch,
                resource_type="image",
                invalidate=True,
            )

            deleted_results.update(
                result.get("deleted", {})
            )

        return deleted_results

    except Exception:

        logger.exception(
            "Failed to delete multiple product images from Cloudinary."
        )

        raise
