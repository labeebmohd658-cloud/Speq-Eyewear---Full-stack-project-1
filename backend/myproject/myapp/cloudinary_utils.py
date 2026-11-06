import cloudinary
import cloudinary.uploader
from django.conf import settings


# Configure Cloudinary using credentials from settings.py.
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


def upload_profile_picture(image):
    """
    Upload a profile picture to Cloudinary.
    Return the secure URL of the uploaded image.
    """

    result = cloudinary.uploader.upload(
        image,
        folder="speq/profile_pictures",
        resource_type="image",
    )

    return result["secure_url"]