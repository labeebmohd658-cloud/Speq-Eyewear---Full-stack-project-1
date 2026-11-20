
import logging

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import filters, generics, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import (
    Category,
    Collection,
    Occasion,
    Product,
    ProductColor,
    ProductImage,
    ProductReview
)

from myapp.cloudinary_utils import (
    upload_product_image,
    delete_product_image,
)

from .serializers import (
    CategorySerializer,
    CollectionSerializer,
    OccasionSerializer,
    AdminProductSerializer,
    AdminProductCreateSerializer,
    AdminProductPublishSerializer,
    AdminProductUpdateSerializer,
    ProductImageUploadSerializer,
    ProductImageUpdateSerializer,
    ProductImageReorderSerializer,
    AdminProductReviewSerializer,
    AdminProductReviewStatusSerializer,
    
)


logger = logging.getLogger(__name__)


# ============================================================
# PAGINATION
# ============================================================

class CategoryPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


# ============================================================
# CATEGORY MANAGEMENT
# ============================================================

class CategoryListCreateView(generics.ListCreateAPIView):

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]
    pagination_class = CategoryPagination

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at", "-id"]


class CategoryRetrieveUpdateView(generics.RetrieveUpdateAPIView):

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]
    lookup_field = "id"


class CategorySoftDeleteView(generics.DestroyAPIView):

    queryset = Category.objects.all()
    permission_classes = [IsAdminUser]
    lookup_field = "id"

    def perform_destroy(self, instance):

        instance.is_active = False

        instance.save(
            update_fields=["is_active"]
        )


# ============================================================
# COLLECTION MANAGEMENT
# ============================================================

class CollectionListCreateView(generics.ListCreateAPIView):

    queryset = Collection.objects.all()
    serializer_class = CollectionSerializer
    permission_classes = [IsAdminUser]
    pagination_class = CategoryPagination

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at", "-id"]


class CollectionRetrieveUpdateView(generics.RetrieveUpdateAPIView):

    queryset = Collection.objects.all()
    serializer_class = CollectionSerializer
    permission_classes = [IsAdminUser]
    lookup_field = "id"


class CollectionSoftDeleteView(generics.DestroyAPIView):

    queryset = Collection.objects.all()
    permission_classes = [IsAdminUser]
    lookup_field = "id"

    def perform_destroy(self, instance):

        instance.is_active = False

        instance.save(
            update_fields=["is_active"]
        )


# ============================================================
# OCCASION MANAGEMENT
# ============================================================

class OccasionListCreateView(generics.ListCreateAPIView):

    queryset = Occasion.objects.all()
    serializer_class = OccasionSerializer
    permission_classes = [IsAdminUser]
    pagination_class = CategoryPagination

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at", "-id"]


class OccasionRetrieveUpdateView(generics.RetrieveUpdateAPIView):

    queryset = Occasion.objects.all()
    serializer_class = OccasionSerializer
    permission_classes = [IsAdminUser]
    lookup_field = "id"


class OccasionSoftDeleteView(generics.DestroyAPIView):

    queryset = Occasion.objects.all()
    permission_classes = [IsAdminUser]
    lookup_field = "id"

    def perform_destroy(self, instance):

        instance.is_active = False

        instance.save(
            update_fields=["is_active"]
        )


# ============================================================
# PRODUCT MANAGEMENT
# ============================================================


class AdminProductListCreateView(generics.ListCreateAPIView):

    queryset = (
        Product.objects
        .select_related(
            "category",
            "collection",
        )
        .prefetch_related(
            "occasions",
            "colors__images",
            "colors__variants",
            "highlights",
        )
    )

    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]
    pagination_class = CategoryPagination

    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    search_fields = ["name"]

    ordering_fields = [
        "name",
        "base_price",
        "selling_price",
        "created_at",
    ]

    ordering = ["-created_at", "-id"]

    def get_serializer_class(self):

        if self.request.method == "POST":
            return AdminProductCreateSerializer

        return AdminProductSerializer

    def create(self, request, *args, **kwargs):

        # Validate incoming product data.
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Save the product.
        product = serializer.save()

        # Return the product using the read serializer.
        response_serializer = AdminProductSerializer(
            product,
            context=self.get_serializer_context()
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )


class AdminProductRetrieveUpdateView(generics.RetrieveUpdateAPIView):

    queryset = (
        Product.objects
        .select_related(
            "category",
            "collection",
        )
        .prefetch_related(
            "occasions",
            "colors__images",
            "colors__variants",
            "highlights",
        )
    )

    permission_classes = [IsAdminUser]
    lookup_field = "id"

    def get_serializer_class(self):

        if self.request.method in ["PUT", "PATCH"]:
            return AdminProductUpdateSerializer

        return AdminProductSerializer


class AdminProductSoftDeleteView(generics.DestroyAPIView):

    queryset = Product.objects.all()
    permission_classes = [IsAdminUser]
    lookup_field = "id"

    def perform_destroy(self, instance):

        instance.is_archived = True
        instance.is_listed = False

        instance.save(
            update_fields=[
                "is_archived",
                "is_listed",
            ]
        )


class AdminProductRestoreView(generics.GenericAPIView):

    queryset = Product.objects.filter(is_archived=True)
    permission_classes = [IsAdminUser]
    lookup_field = "id"

    def post(self, request, *args, **kwargs):

        product = self.get_object()

        product.is_archived = False
        product.is_listed = False

        product.save(
            update_fields=[
                "is_archived",
                "is_listed",
            ]
        )

        return Response(
            {
                "message": "Product restored successfully.",
                "product_id": product.id,
                "is_archived": product.is_archived,
                "is_listed": product.is_listed,
            },
            status=status.HTTP_200_OK,
        )



class AdminProductPublishView(generics.UpdateAPIView):

    queryset = Product.objects.prefetch_related(
        "colors__images",
        "colors__variants",
    )

    serializer_class = AdminProductPublishSerializer
    permission_classes = [IsAdminUser]
    lookup_field = "id"

    def post(self, request, *args, **kwargs):

        # Get the product using its ID from the URL.
        product = self.get_object()

        # Validate the publishing data.
        serializer = self.get_serializer(
            product,
            data=request.data,
        )

        serializer.is_valid(raise_exception=True)

        # Save the publishing status.
        serializer.save()

        # Return the updated product status.
        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# PRODUCT IMAGE UPLOAD
# ============================================================

class ProductImageUploadView(APIView):

    permission_classes = [IsAdminUser]

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def post(self, request):

        serializer = ProductImageUploadSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        image = serializer.validated_data["image"]
        product_color = serializer.validated_data["product_color"]
        image_order = serializer.validated_data["image_order"]
        is_primary = serializer.validated_data["is_primary"]

        uploaded_image = None

        try:

            # Upload the image to Cloudinary first.
            uploaded_image = upload_product_image(image)

            with transaction.atomic():

                # Lock the colour to prevent simultaneous image changes.
                locked_color = (
                    ProductColor.objects
                    .select_for_update()
                    .get(id=product_color.id)
                )

                # Check image order again inside the transaction.
                order_exists = ProductImage.objects.filter(
                    product_color=locked_color,
                    image_order=image_order,
                ).exists()

                if order_exists:
                    raise serializers.ValidationError(
                        {
                            "image_order": (
                                "This image order is already used "
                                "by another image."
                            )
                        }
                    )

                has_primary = ProductImage.objects.filter(
                    product_color=locked_color,
                    is_primary=True,
                ).exists()

                # The first image must become the primary image.
                if not has_primary:
                    is_primary = True

                # Ensure only one primary image exists.
                if is_primary:

                    ProductImage.objects.filter(
                        product_color=locked_color,
                        is_primary=True,
                    ).update(
                        is_primary=False
                    )

                product_image = ProductImage.objects.create(
                    product_color=locked_color,
                    image_url=uploaded_image["image_url"],
                    public_id=uploaded_image["public_id"],
                    image_order=image_order,
                    is_primary=is_primary,
                )

            return Response(
                {
                    "message": "Product image uploaded successfully.",
                    "image": {
                        "id": product_image.id,
                        "image_url": product_image.image_url,
                        "image_order": product_image.image_order,
                        "is_primary": product_image.is_primary,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        except serializers.ValidationError:

            # The Cloudinary upload succeeded, but database validation failed.
            if uploaded_image:

                try:
                    delete_product_image(
                        uploaded_image["public_id"]
                    )

                except Exception:
                    logger.exception(
                        "Failed to clean up uploaded Cloudinary image."
                    )

            raise

        except Exception:

            logger.exception(
                "Product image upload failed."
            )

            # Remove the uploaded Cloudinary file if database creation failed.
            if uploaded_image:

                try:
                    delete_product_image(
                        uploaded_image["public_id"]
                    )

                except Exception:
                    logger.exception(
                        "Failed to clean up uploaded Cloudinary image."
                    )

            return Response(
                {
                    "error": "Product image upload failed."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================
# PRODUCT IMAGE DELETE
# ============================================================

class ProductImageDeleteView(APIView):

    permission_classes = [IsAdminUser]

    def delete(self, request, id):

        product_image = get_object_or_404(
            ProductImage.objects.select_related(
                "product_color__product"
            ),
            id=id,
        )

        try:

            with transaction.atomic():

                # Lock the colour first.
                locked_color = (
                    ProductColor.objects
                    .select_for_update()
                    .select_related("product")
                    .get(id=product_image.product_color_id)
                )

                # Lock the image being deleted.
                image_to_delete = get_object_or_404(
                    ProductImage.objects.select_for_update(),
                    id=id,
                    product_color=locked_color,
                )

                product = locked_color.product

                remaining_count = (
                    ProductImage.objects
                    .filter(product_color=locked_color)
                    .exclude(id=id)
                    .count()
                )

                # Published products must retain at least 3 images per colour.
                if product.is_listed and remaining_count < 3:

                    return Response(
                        {
                            "error": (
                                "Cannot delete this image. "
                                "A published product must have at least "
                                "3 images per colour."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                was_primary = image_to_delete.is_primary
                public_id = image_to_delete.public_id

                # Delete the database record.
                image_to_delete.delete()

                # If the deleted image was primary, promote another image.
                if was_primary:

                    replacement_image = (
                        ProductImage.objects
                        .filter(product_color=locked_color)
                        .order_by("image_order", "id")
                        .first()
                    )

                    if replacement_image:

                        replacement_image.is_primary = True

                        replacement_image.save(
                            update_fields=["is_primary"]
                        )

                # Run Cloudinary cleanup only after successful DB commit.
                def cleanup_cloudinary_image():

                    if not public_id:
                        return

                    try:

                        result = delete_product_image(public_id)

                        if (
                            isinstance(result, dict)
                            and result.get("result") not in [
                                "ok",
                                "not found",
                            ]
                        ):

                            logger.error(
                                "Cloudinary deletion returned an "
                                "unexpected result for %s: %s",
                                public_id,
                                result,
                            )

                    except Exception:

                        logger.exception(
                            "Cloudinary image cleanup failed: %s",
                            public_id,
                        )

                transaction.on_commit(
                    cleanup_cloudinary_image
                )

            return Response(
                {
                    "message": "Product image deleted successfully."
                },
                status=status.HTTP_200_OK,
            )

        except Exception:

            logger.exception(
                "Product image deletion failed."
            )

            return Response(
                {
                    "error": "Unable to delete product image."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================
# PRODUCT IMAGE UPDATE
# ============================================================

class ProductImageUpdateView(APIView):

    permission_classes = [IsAdminUser]

    def patch(self, request, id):

        product_image = get_object_or_404(
            ProductImage.objects.select_related(
                "product_color"
            ),
            id=id,
        )

        serializer = ProductImageUpdateSerializer(
            data=request.data,
            context={
                "product_image": product_image,
            },
        )

        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data

        try:

            with transaction.atomic():

                locked_color = (
                    ProductColor.objects
                    .select_for_update()
                    .get(id=product_image.product_color_id)
                )

                product_image = get_object_or_404(
                    ProductImage.objects.select_for_update(),
                    id=id,
                    product_color=locked_color,
                )

                # Do not allow the only primary image to lose primary status.
                if validated_data.get("is_primary") is False:

                    if product_image.is_primary:

                        raise serializers.ValidationError(
                            {
                                "is_primary": (
                                    "Select another primary image "
                                    "before removing this image's "
                                    "primary status."
                                )
                            }
                        )

                # Update image order if supplied.
                if "image_order" in validated_data:

                    new_order = validated_data["image_order"]

                    duplicate_exists = ProductImage.objects.filter(
                        product_color=locked_color,
                        image_order=new_order,
                    ).exclude(
                        id=product_image.id
                    ).exists()

                    if duplicate_exists:

                        raise serializers.ValidationError(
                            {
                                "image_order": (
                                    "This image order is already used "
                                    "by another image."
                                )
                            }
                        )

                    product_image.image_order = new_order

                # Make this image primary if requested.
                if validated_data.get("is_primary") is True:

                    ProductImage.objects.filter(
                        product_color=locked_color,
                        is_primary=True,
                    ).exclude(
                        id=product_image.id
                    ).update(
                        is_primary=False
                    )

                    product_image.is_primary = True

                product_image.save()

            return Response(
                {
                    "message": "Product image updated successfully.",
                    "image": {
                        "id": product_image.id,
                        "image_order": product_image.image_order,
                        "is_primary": product_image.is_primary,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except serializers.ValidationError:
            raise

        except Exception:

            logger.exception(
                "Product image update failed."
            )

            return Response(
                {
                    "error": "Unable to update product image."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================
# PRODUCT IMAGE REORDER
# ============================================================

class ProductImageReorderView(APIView):

    permission_classes = [IsAdminUser]

    def post(self, request, color_id):

        serializer = ProductImageReorderSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        image_ids = serializer.validated_data["image_ids"]

        try:

            with transaction.atomic():

                # Lock the colour before changing image order.
                locked_color = get_object_or_404(
                    ProductColor.objects.select_for_update(),
                    id=color_id,
                )

                # Lock all images belonging to this colour.
                images = list(
                    ProductImage.objects
                    .select_for_update()
                    .filter(product_color=locked_color)
                    .order_by("id")
                )

                existing_ids = {
                    image.id for image in images
                }

                # Reject missing, extra or duplicate image IDs.
                if (
                    len(image_ids) != len(set(image_ids))
                    or set(image_ids) != existing_ids
                ):

                    raise serializers.ValidationError(
                        {
                            "image_ids": (
                                "Provide every image ID belonging to "
                                "this colour exactly once."
                            )
                        }
                    )

                # Temporarily move all images to unused positions.
                max_order = max(
                    (
                        image.image_order
                        for image in images
                    ),
                    default=-1,
                )

                image_map = {
                    image.id: image
                    for image in images
                }

                for index, image in enumerate(images):

                    image.image_order = max_order + index + 1

                ProductImage.objects.bulk_update(
                    images,
                    ["image_order"],
                )

                # Assign the final positions requested by the admin.
                for position, image_id in enumerate(image_ids):

                    image_map[image_id].image_order = position

                ProductImage.objects.bulk_update(
                    images,
                    ["image_order"],
                )

            return Response(
                {
                    "message": "Product images reordered successfully.",
                    "images": [
                        {
                            "id": image_id,
                            "image_order": position,
                        }
                        for position, image_id in enumerate(image_ids)
                    ],
                },
                status=status.HTTP_200_OK,
            )

        except serializers.ValidationError:
            raise

        except Exception:

            logger.exception(
                "Product image reordering failed."
            )

            return Response(
                {
                    "error": "Unable to reorder product images."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )



# List all reviews for the React admin panel.
class AdminProductReviewListView(generics.ListAPIView):

    serializer_class = AdminProductReviewSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):

        queryset = ProductReview.objects.select_related(
            "user",
            "product"
        ).all()

        # Optional status filtering.
        review_status = self.request.query_params.get("status")

        if review_status:
            queryset = queryset.filter(status=review_status.upper())

        return queryset


# Approve or reject a review.
class AdminProductReviewUpdateView(generics.UpdateAPIView):

    queryset = ProductReview.objects.all()
    serializer_class = AdminProductReviewStatusSerializer
    permission_classes = [IsAdminUser]

    http_method_names = ["patch", "head", "options"]


# Delete a review.
class AdminProductReviewDeleteView(generics.DestroyAPIView):

    queryset = ProductReview.objects.all()
    permission_classes = [IsAdminUser]
