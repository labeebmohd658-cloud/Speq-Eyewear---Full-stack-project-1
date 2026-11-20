
import logging
import re

from django.db import transaction
from rest_framework import serializers

from products.models import (
    Category,
    Collection,
    Occasion,
    ProductVariant,
    ProductImage,
    ProductColor,
    ProductHighlight,
    Product,
    ProductReview
)


logger = logging.getLogger(__name__)


def delete_product_images(public_ids):
    """
    Delete images from Cloudinary using their public IDs.

    Returns a dictionary containing the result for each public ID.
    Cloudinary is imported inside the function so a missing Cloudinary
    dependency does not prevent Django from loading this serializer module.
    """
    from cloudinary import uploader

    results = {}

    for public_id in public_ids:
        if not public_id:
            continue

        response = uploader.destroy(public_id, resource_type="image")
        cloudinary_status = response.get("result")

        if cloudinary_status == "ok":
            results[public_id] = "deleted"
        elif cloudinary_status == "not found":
            results[public_id] = "not_found"
        else:
            results[public_id] = response

    return results


# ---------------------------------------------------------
# CATEGORY, COLLECTION AND OCCASION SERIALIZERS
# ---------------------------------------------------------


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class CollectionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Collection
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "image",
            "is_active",
            "created_at",
            
        ]
        read_only_fields = [
            "id",
            "created_at",
            
        ]


class OccasionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Occasion
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "image",
            "is_active",
            "created_at",
            
        ]
        read_only_fields = [
            "id",
            "created_at",
        
        ]


# ---------------------------------------------------------
# PRODUCT VARIANT SERIALIZERS
# ---------------------------------------------------------


class AdminProductVariantSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "size",
            "sku",
            "stock_quantity",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "sku",
        ]


class AdminProductVariantUpdateSerializer(serializers.ModelSerializer):

    # Existing variant ID identifies which record to update.
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "size",
            "stock_quantity",
            "is_active",
        ]

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Stock quantity cannot be negative."
            )
        return value


# ---------------------------------------------------------
# PRODUCT IMAGE SERIALIZER
# ---------------------------------------------------------


class AdminProductImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductImage
        fields = [
            "id",
            "image_url",
            "image_order",
            "is_primary",
        ]
        read_only_fields = [
            "id",
            "image_url",
        ]


# ---------------------------------------------------------
# PRODUCT COLOR SERIALIZERS
# ---------------------------------------------------------


class AdminProductColorSerializer(serializers.ModelSerializer):

    # Displays all images belonging to this colour.
    images = AdminProductImageSerializer(
        many=True,
        read_only=True
    )

    # Displays all variants belonging to this colour.
    variants = AdminProductVariantSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = ProductColor
        fields = [
            "id",
            "color_name",
            "color_code",
            "images",
            "variants",
        ]
        read_only_fields = [
            "id",
        ]


class AdminProductColorInputSerializer(serializers.ModelSerializer):

    # Accepts multiple size variants for a new colour.
    variants = AdminProductVariantSerializer(many=True)

    class Meta:
        model = ProductColor
        fields = [
            "color_name",
            "color_code",
            "variants",
        ]

    def validate_variants(self, value):

        if not value:
            raise serializers.ValidationError(
                "Each colour must have at least one size variant."
            )

        sizes = [
            variant["size"]
            for variant in value
        ]

        if len(sizes) != len(set(sizes)):
            raise serializers.ValidationError(
                "Duplicate sizes are not allowed for the same colour."
            )

        return value

    def validate_color_code(self, value):

        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", value):
            raise serializers.ValidationError(
                "Enter a valid hex colour code, e.g. #1B3B2B."
            )

        return value


class AdminProductColorUpdateSerializer(serializers.ModelSerializer):

    # Existing colour ID identifies the record to update.
    id = serializers.IntegerField(required=False)

    # Accepts variant updates for this colour.
    variants = AdminProductVariantUpdateSerializer(
        many=True,
        required=False
    )

    class Meta:
        model = ProductColor
        fields = [
            "id",
            "color_name",
            "color_code",
            "variants",
        ]

    def validate_color_code(self, value):

        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", value):
            raise serializers.ValidationError(
                "Enter a valid hex colour code, e.g. #1B3B2B."
            )

        return value

    def validate_variants(self, value):

        sizes = [
            variant["size"]
            for variant in value
            if variant.get("size") is not None
        ]

        if len(sizes) != len(set(sizes)):
            raise serializers.ValidationError(
                "Duplicate sizes are not allowed for the same colour."
            )

        return value


# ---------------------------------------------------------
# PRODUCT HIGHLIGHT SERIALIZERS
# ---------------------------------------------------------


class AdminProductHighlightSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductHighlight
        fields = [
            "id",
            "title",
            "display_order",
        ]
        read_only_fields = [
            "id",
        ]


class AdminProductHighlightInputSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductHighlight
        fields = [
            "title",
            "display_order",
        ]


class AdminProductHighlightUpdateSerializer(serializers.ModelSerializer):

    # Existing highlight ID identifies the record to update.
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductHighlight
        fields = [
            "id",
            "title",
            "display_order",
        ]


# ---------------------------------------------------------
# ADMIN PRODUCT READ SERIALIZER
# ---------------------------------------------------------


class AdminProductSerializer(serializers.ModelSerializer):

    # Displays the category name.
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    # Displays the collection name.
    collection_name = serializers.CharField(
        source="collection.name",
        read_only=True
    )

    # Displays occasion names.
    occasion_names = serializers.StringRelatedField(
        source="occasions",
        many=True,
        read_only=True
    )

    # Displays all colours with their images and variants.
    colors = AdminProductColorSerializer(
        many=True,
        read_only=True
    )

    # Displays product highlights.
    highlights = AdminProductHighlightSerializer(
        many=True,
        read_only=True
    )

    # Calculates the discount amount.
    discount_amount = serializers.SerializerMethodField()

    # Calculates the discount percentage.
    discount_percentage = serializers.SerializerMethodField()

    def get_discount_amount(self, obj):
        return obj.base_price - obj.selling_price

    def get_discount_percentage(self, obj):

        if not obj.base_price:
            return 0

        percentage = (
            (obj.base_price - obj.selling_price)
            / obj.base_price
        ) * 100

        return round(percentage, 2)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "base_price",
            "selling_price",
            "discount_amount",
            "discount_percentage",
            "category",
            "category_name",
            "collection",
            "collection_name",
            "occasions",
            "occasion_names",
            "frame_shape",
            "is_active",
            "is_blocked",
            "is_listed",
            "is_archived",
            "colors",
            "highlights",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "discount_amount",
            "discount_percentage",
            "created_at",
            "updated_at",
        ]


# ---------------------------------------------------------
# ADMIN PRODUCT CREATE SERIALIZER
# ---------------------------------------------------------


class AdminProductCreateSerializer(serializers.ModelSerializer):

    # Only active categories can be assigned.
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True)
    )

    # Only active collections can be assigned.
    collection = serializers.PrimaryKeyRelatedField(
        queryset=Collection.objects.filter(is_active=True)
    )

    # Accepts multiple colours and their variants.
    colors = AdminProductColorInputSerializer(many=True)

    # Accepts multiple highlights.
    highlights = AdminProductHighlightInputSerializer(
        many=True,
        required=False
    )

    # Accepts multiple occasion IDs.
    occasions = serializers.PrimaryKeyRelatedField(
        queryset=Occasion.objects.filter(is_active=True),
        many=True,
        required=False
    )

    class Meta:
        model = Product
        fields = [
            "name",
            "description",
            "base_price",
            "selling_price",
            "category",
            "collection",
            "occasions",
            "frame_shape",
            "colors",
            "highlights",
        ]

    import re

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Product name must contain at least 3 characters."
            )

        if not re.fullmatch(r"[A-Za-z0-9 ]+", value):
            raise serializers.ValidationError(
                "Product name can contain only letters, numbers and spaces."
            )

        letter_count = sum(char.isalpha() for char in value)

        if letter_count < 3:
            raise serializers.ValidationError(
                "Product name must contain at least 3 letters."
            )

        return value

    def validate_description(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Description must contain at least 10 characters."
            )

        return value

    def validate_colors(self, value):

        if not value:
            raise serializers.ValidationError(
                "A product must have at least one colour."
            )

        color_names = [
            color["color_name"].strip().lower()
            for color in value
        ]

        if len(color_names) != len(set(color_names)):
            raise serializers.ValidationError(
                "Duplicate colours are not allowed."
            )

        return value

    def validate_color_name(self, value):
        value = value.strip()

        if not value.isalpha():
            raise serializers.ValidationError(
                "Color name must contain only letters."
            )

        return value

    def validate_base_price(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "MRP must be greater than zero."
            )

        return value

    def validate_selling_price(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Selling price must be greater than zero."
            )

        return value

    def validate_highlight(self, value):
        value = value.strip()

        if len(value) < 5:
            raise serializers.ValidationError(
                "Highlight must contain at least 5 characters."
            )

        return value

    def validate(self, attrs):

        base_price = attrs.get("base_price")
        selling_price = attrs.get("selling_price")

        if (
            base_price is not None
            and selling_price is not None
            and selling_price > base_price
        ):
            raise serializers.ValidationError({
                "selling_price": (
                    "Selling price cannot be greater than MRP."
                )
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):

        # Extract nested data before creating the product.
        colors_data = validated_data.pop("colors")
        highlights_data = validated_data.pop("highlights", [])
        occasions_data = validated_data.pop("occasions", [])

        # Keep the product hidden until it is ready to publish.
        product = Product.objects.create(
            is_listed=False,
            **validated_data
        )

        # Assign selected occasions.
        product.occasions.set(occasions_data)

        # Create colours and their variants.
        for color_data in colors_data:

            variants_data = color_data.pop("variants")

            color = ProductColor.objects.create(
                product=product,
                **color_data
            )

            for variant_data in variants_data:
                ProductVariant.objects.create(
                    product_color=color,
                    **variant_data
                )

        # Create product highlights.
        for highlight_data in highlights_data:
            ProductHighlight.objects.create(
                product=product,
                **highlight_data
            )

        return product


# ---------------------------------------------------------
# ADMIN PRODUCT PUBLISH SERIALIZER
# ---------------------------------------------------------


class AdminProductPublishSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = [
            "is_listed",
        ]

    def validate_is_listed(self, value):

        if not value:
            return value

        product = self.instance

        if product.is_archived:
            raise serializers.ValidationError(
                "Archived products cannot be published."
            )

        if not product.is_active:
            raise serializers.ValidationError(
                "Inactive products cannot be published."
            )

        if product.is_blocked:
            raise serializers.ValidationError(
                "Blocked products cannot be published."
            )

        colors = product.colors.all()

        if not colors.exists():
            raise serializers.ValidationError(
                "A product must have at least one colour."
            )

        for color in colors:

            images = color.images.all()

            if images.count() < 3:
                raise serializers.ValidationError(
                    f"{color.color_name} must have at least 3 images."
                )

            primary_count = images.filter(
                is_primary=True
            ).count()

            if primary_count != 1:
                raise serializers.ValidationError(
                    f"{color.color_name} must have exactly one primary image."
                )

            if not color.variants.filter(is_active=True).exists():
                raise serializers.ValidationError(
                    f"{color.color_name} must have at least one active variant."
                )

        return value


# ---------------------------------------------------------
# ADMIN PRODUCT UPDATE SERIALIZER
# ---------------------------------------------------------




import re

from rest_framework import serializers

class AdminProductUpdateSerializer(serializers.ModelSerializer):

    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True)
    )

    collection = serializers.PrimaryKeyRelatedField(
        queryset=Collection.objects.filter(is_active=True)
    )

    occasions = serializers.PrimaryKeyRelatedField(
        queryset=Occasion.objects.filter(is_active=True),
        many=True,
        required=False
    )

    colors = AdminProductColorUpdateSerializer(
        many=True,
        required=False
    )

    highlights = AdminProductHighlightUpdateSerializer(
        many=True,
        required=False
    )

    delete_color_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )

    delete_variant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )

    delete_highlight_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Product
        fields = [
            "name",
            "description",
            "base_price",
            "selling_price",
            "category",
            "collection",
            "occasions",
            "frame_shape",
            "is_active",
            "is_blocked",
            "colors",
            "highlights",
            "delete_color_ids",
            "delete_variant_ids",
            "delete_highlight_ids",
        ]

    # -------------------------------------------------
    # BASIC FIELD VALIDATION
    # -------------------------------------------------

    def validate_name(self, value):

        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Product name must contain at least 3 characters."
            )

        if len(value) > 100:
            raise serializers.ValidationError(
                "Product name cannot exceed 100 characters."
            )

        # Only letters, numbers and spaces are allowed.
        if not re.fullmatch(r"[A-Za-z0-9 ]+", value):
            raise serializers.ValidationError(
                "Product name can contain only letters, numbers and spaces."
            )

        # At least 3 letters are mandatory.
        letter_count = sum(char.isalpha() for char in value)

        if letter_count < 3:
            raise serializers.ValidationError(
                "Product name must contain at least 3 letters."
            )

        return value

    def validate_description(self, value):

        value = value.strip()

        if len(value) < 10:
            raise serializers.ValidationError(
                "Description must contain at least 10 characters."
            )

        if len(value) > 1000:
            raise serializers.ValidationError(
                "Description cannot exceed 1000 characters."
            )

        return value

    def validate_base_price(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "MRP must be greater than zero."
            )

        return value

    def validate_selling_price(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Selling price must be greater than zero."
            )

        return value

    # -------------------------------------------------
    # OBJECT LEVEL PRICE VALIDATION
    # -------------------------------------------------

    def validate(self, attrs):

        base_price = attrs.get(
            "base_price",
            getattr(self.instance, "base_price", None)
        )

        selling_price = attrs.get(
            "selling_price",
            getattr(self.instance, "selling_price", None)
        )

        if (
            base_price is not None
            and selling_price is not None
            and selling_price > base_price
        ):
            raise serializers.ValidationError({
                "selling_price": (
                    "Selling price cannot be greater than MRP."
                )
            })

        delete_color_ids = attrs.get("delete_color_ids", [])
        delete_variant_ids = set(attrs.get("delete_variant_ids", []))
        submitted_variant_ids = {
            variant_data["id"]
            for color_data in attrs.get("colors", [])
            for variant_data in color_data.get("variants", [])
            if variant_data.get("id") is not None
        }

        for color_data in attrs.get("colors", []):
            color_name = color_data.get("color_name")

            if color_name is None:
                continue

            existing_colors = self.instance.colors.filter(
                color_name__iexact=color_name
            ).exclude(id__in=delete_color_ids)

            color_id = color_data.get("id")
            if color_id is not None:
                existing_colors = existing_colors.exclude(id=color_id)

            if existing_colors.exists():
                raise serializers.ValidationError({
                    "colors": f"Colour '{color_name}' already exists."
                })

        for color_data in attrs.get("colors", []):
            color_id = color_data.get("id")

            if color_id is None:
                continue

            for variant_data in color_data.get("variants", []):
                size = variant_data.get("size")

                if size is None:
                    continue

                existing_variants = ProductVariant.objects.filter(
                    product_color_id=color_id,
                    size=size,
                ).exclude(
                    id__in=delete_variant_ids | submitted_variant_ids
                )

                variant_id = variant_data.get("id")
                if variant_id is not None:
                    existing_variants = existing_variants.exclude(
                        id=variant_id
                    )

                if existing_variants.exists():
                    raise serializers.ValidationError({
                        "colors": (
                            f"Size '{size}' already exists for this colour."
                        )
                    })

        return attrs

    # -------------------------------------------------
    # COLOUR AND VARIANT VALIDATION
    # -------------------------------------------------

    def validate_colors(self, value):

        product = self.instance

        color_ids = []
        variant_ids = []

        submitted_color_names = [
            item["color_name"].strip().lower()
            for item in value
            if item.get("color_name")
        ]

        if len(submitted_color_names) != len(set(submitted_color_names)):
            raise serializers.ValidationError(
                "Duplicate colour names are not allowed."
            )

        for color_data in value:

            color_id = color_data.get("id")
            color_name = color_data.get("color_name")

            if color_name is not None:

                color_name = color_name.strip()

                if len(color_name) < 2:
                    raise serializers.ValidationError(
                        "Colour name must contain at least 2 characters."
                    )

                # Only letters are allowed in colour names.
                if not color_name.isalpha():
                    raise serializers.ValidationError(
                        "Colour name must contain only letters."
                    )

            color_code = color_data.get("color_code")

            if color_code is not None:
                if not re.fullmatch(
                    r"#[0-9A-Fa-f]{6}",
                    color_code
                ):
                    raise serializers.ValidationError(
                        "Enter a valid HEX colour code, e.g. #1B3B2B."
                    )

            if color_id is not None:

                if not product.colors.filter(id=color_id).exists():
                    raise serializers.ValidationError(
                        f"Colour ID {color_id} does not belong to this product."
                    )

                color_ids.append(color_id)

            variants = color_data.get("variants", [])

            if color_id is None and not variants:
                raise serializers.ValidationError(
                    "A new colour must have at least one size variant."
                )

            if color_id is None and (
                not color_name or not color_code
            ):
                raise serializers.ValidationError(
                    "A new colour must include a name and colour code."
                )

            submitted_sizes = [
                item.get("size")
                for item in variants
                if item.get("size") is not None
            ]

            if len(submitted_sizes) != len(set(submitted_sizes)):
                raise serializers.ValidationError(
                    "Duplicate sizes are not allowed for the same colour."
                )

            for variant_data in variants:

                variant_id = variant_data.get("id")
                size = variant_data.get("size")
                stock = variant_data.get("stock_quantity")

                if variant_id is None and (
                    size is None or stock is None
                ):
                    raise serializers.ValidationError(
                        "A new variant must include a size and stock quantity."
                    )

                if stock is not None and stock < 0:
                    raise serializers.ValidationError(
                        "Stock quantity cannot be negative."
                    )

                if variant_id is not None and color_id is None:
                    raise serializers.ValidationError(
                        "A new colour cannot contain existing variant IDs."
                    )

                if variant_id is not None:

                    variant = ProductVariant.objects.filter(
                        id=variant_id,
                        product_color_id=color_id,
                        product_color__product=product
                    ).first()

                    if variant is None:
                        raise serializers.ValidationError(
                            f"Variant ID {variant_id} does not belong to this colour."
                        )

                    variant_ids.append(variant_id)

        if len(color_ids) != len(set(color_ids)):
            raise serializers.ValidationError(
                "Duplicate colour IDs are not allowed."
            )

        if len(variant_ids) != len(set(variant_ids)):
            raise serializers.ValidationError(
                "Duplicate variant IDs are not allowed."
            )

        return value

    def validate_highlights(self, value):

        highlight_ids = [
            item["id"]
            for item in value
            if item.get("id") is not None
        ]

        if len(highlight_ids) != len(set(highlight_ids)):
            raise serializers.ValidationError(
                "Duplicate highlight IDs are not allowed."
            )

        if highlight_ids:
            owned_count = self.instance.highlights.filter(
                id__in=highlight_ids
            ).count()

            if owned_count != len(highlight_ids):
                raise serializers.ValidationError(
                    "One or more highlight IDs do not belong to this product."
                )

        for item in value:
            if item.get("id") is None and not item.get("title"):
                raise serializers.ValidationError(
                    "A new highlight must include a title."
                )

        return value

    @transaction.atomic
    def update(self, instance, validated_data):

        colors_data = validated_data.pop("colors", None)
        highlights_data = validated_data.pop("highlights", None)
        occasions_data = validated_data.pop("occasions", None)
        delete_color_ids = set(validated_data.pop("delete_color_ids", []))
        delete_variant_ids = set(validated_data.pop("delete_variant_ids", []))
        delete_highlight_ids = set(
            validated_data.pop("delete_highlight_ids", [])
        )

        submitted_color_ids = set()
        submitted_variant_ids = set()
        submitted_highlight_ids = set()

        if colors_data is not None:
            for color_data in colors_data:
                color_id = color_data.get("id")
                if color_id is not None:
                    submitted_color_ids.add(color_id)

                submitted_variant_ids.update(
                    variant_data["id"]
                    for variant_data in color_data.get("variants", [])
                    if variant_data.get("id") is not None
                )

        if highlights_data is not None:
            submitted_highlight_ids = {
                item["id"]
                for item in highlights_data
                if item.get("id") is not None
            }

        if delete_color_ids & submitted_color_ids:
            raise serializers.ValidationError(
                "A colour cannot be updated and deleted together."
            )

        if delete_variant_ids & submitted_variant_ids:
            raise serializers.ValidationError(
                "A variant cannot be updated and deleted together."
            )

        if delete_highlight_ids & submitted_highlight_ids:
            raise serializers.ValidationError(
                "A highlight cannot be updated and deleted together."
            )

        if (
            instance.colors.filter(id__in=delete_color_ids).count()
            != len(delete_color_ids)
        ):
            raise serializers.ValidationError(
                "One or more colour IDs do not belong to this product."
            )

        if (
            ProductVariant.objects.filter(
                id__in=delete_variant_ids,
                product_color__product=instance,
            ).count()
            != len(delete_variant_ids)
        ):
            raise serializers.ValidationError(
                "One or more variant IDs do not belong to this product."
            )

        if (
            instance.highlights.filter(id__in=delete_highlight_ids).count()
            != len(delete_highlight_ids)
        ):
            raise serializers.ValidationError(
                "One or more highlight IDs do not belong to this product."
            )

        protected_variants = ProductVariant.objects.filter(
            order_items__isnull=False
        )
        if (
            protected_variants.filter(id__in=delete_variant_ids).exists()
            or protected_variants.filter(
                product_color_id__in=delete_color_ids
            ).exists()
        ):
            raise serializers.ValidationError(
                "Variants referenced by existing orders cannot be deleted."
            )

        if delete_variant_ids:
            ProductVariant.objects.filter(
                id__in=delete_variant_ids,
                product_color__product=instance,
            ).delete()

        if delete_highlight_ids:
            instance.highlights.filter(id__in=delete_highlight_ids).delete()

        if delete_color_ids:
            public_ids = list(
                ProductImage.objects.filter(
                    product_color_id__in=delete_color_ids
                ).values_list("public_id", flat=True)
            )

            instance.colors.filter(id__in=delete_color_ids).delete()

            if public_ids:
                def cleanup_cloudinary_images():
                    try:
                        results = delete_product_images(public_ids)
                        failed_deletions = {
                            public_id: result
                            for public_id, result in results.items()
                            if result not in ("deleted", "not_found")
                        }
                        if failed_deletions:
                            logger.error(
                                "Cloudinary image cleanup was unsuccessful "
                                "for some deleted product images: %s",
                                failed_deletions,
                            )
                    except Exception:
                        logger.exception(
                            "Failed to clean up deleted product images."
                        )

                transaction.on_commit(cleanup_cloudinary_images)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if occasions_data is not None:
            instance.occasions.set(occasions_data)

        if colors_data is not None:
            for color_data in colors_data:
                color_data = dict(color_data)
                color_id = color_data.pop("id", None)
                variants_data = color_data.pop("variants", None)

                if color_id is not None:
                    color = instance.colors.get(id=color_id)
                    for attr, value in color_data.items():
                        setattr(color, attr, value)
                    color.save()
                else:
                    color = ProductColor.objects.create(
                        product=instance,
                        **color_data,
                    )

                if variants_data is None:
                    continue

                variants_to_update = []
                new_variants = []

                for variant_data in variants_data:
                    variant_data = dict(variant_data)
                    variant_id = variant_data.pop("id", None)

                    if variant_id is None:
                        new_variants.append(variant_data)
                        continue

                    variant = color.variants.get(id=variant_id)
                    old_size = variant.size
                    new_size = variant_data.get("size", old_size)
                    variants_to_update.append(
                        (variant, old_size, new_size, variant_data)
                    )

                temporary_size_index = 0
                for variant, old_size, new_size, _ in variants_to_update:
                    if new_size == old_size:
                        continue

                    while color.variants.filter(
                        size=f"X{temporary_size_index:04d}"
                    ).exists():
                        temporary_size_index += 1

                    variant.size = f"X{temporary_size_index:04d}"
                    variant.sku = f"TMP-{variant.id}"
                    variant.save(update_fields=["size", "sku"])
                    temporary_size_index += 1

                for variant, old_size, new_size, variant_data in variants_to_update:
                    for attr, value in variant_data.items():
                        setattr(variant, attr, value)

                    if new_size != old_size:
                        variant.sku = (
                            f"SPQ-{instance.id}-"
                            f"{color.id}-{variant.size}"
                        )

                    variant.save()

                for variant_data in new_variants:
                    ProductVariant.objects.create(
                        product_color=color,
                        **variant_data,
                    )

        if highlights_data is not None:
            for highlight_data in highlights_data:
                highlight_data = dict(highlight_data)
                highlight_id = highlight_data.pop("id", None)

                if highlight_id is not None:
                    highlight = instance.highlights.get(id=highlight_id)
                    for attr, value in highlight_data.items():
                        setattr(highlight, attr, value)
                    highlight.save()
                else:
                    ProductHighlight.objects.create(
                        product=instance,
                        **highlight_data,
                    )

        return instance


# ---------------------------------------------------------
# PRODUCT IMAGE UPLOAD SERIALIZER
# ---------------------------------------------------------


class ProductImageUploadSerializer(serializers.Serializer):

    # Only allow uploads for colours belonging to eligible products.
    product_color = serializers.PrimaryKeyRelatedField(
        queryset=ProductColor.objects.select_related(
            "product"
        ).filter(
            product__is_archived=False,
            product__is_active=True,
            product__is_blocked=False,
        )
    )

    # Image file received from the React admin form.
    image = serializers.ImageField()

    # Display order of the image.
    image_order = serializers.IntegerField(min_value=0)

    # Whether this image is the primary image.
    is_primary = serializers.BooleanField(default=False)

    def validate_image(self, value):

        # Maximum allowed size: 5 MB.
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "Image size must not exceed 5 MB."
            )

        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPG, PNG and WEBP images are allowed."
            )

        return value

    def validate(self, attrs):

        product_color = attrs["product_color"]
        image_order = attrs["image_order"]

        if ProductImage.objects.filter(
            product_color=product_color,
            image_order=image_order
        ).exists():
            raise serializers.ValidationError({
                "image_order": (
                    "This image order is already used for this colour."
                )
            })

        return attrs


# ---------------------------------------------------------
# PRODUCT IMAGE UPDATE SERIALIZER
# ---------------------------------------------------------


class ProductImageUpdateSerializer(serializers.Serializer):

    image_order = serializers.IntegerField(
        min_value=0,
        required=False
    )

    is_primary = serializers.BooleanField(
        required=False
    )

    def validate(self, attrs):

        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )

        return attrs

    def validate_image_order(self, value):

        product_image = self.context["product_image"]

        duplicate_exists = ProductImage.objects.filter(
            product_color=product_image.product_color,
            image_order=value
        ).exclude(
            id=product_image.id
        ).exists()

        if duplicate_exists:
            raise serializers.ValidationError(
                "This image order is already used by another image."
            )

        return value


# ---------------------------------------------------------
# PRODUCT IMAGE REORDER SERIALIZER
# ---------------------------------------------------------


class ProductImageReorderSerializer(serializers.Serializer):

    # Receive image IDs in the desired display order.
    image_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False
    )

    def validate_image_ids(self, value):

        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Duplicate image IDs are not allowed."
            )

        return value

class AdminProductReviewSerializer(serializers.ModelSerializer):

    # Display customer name.
    customer_name = serializers.CharField(
        source="user.full_name",
        read_only=True
    )

    # Display product name.
    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    class Meta:
        model = ProductReview

        fields = [
            "id",
            "customer_name",
            "product_name",
            "rating",
            "comment",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "customer_name",
            "product_name",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]

class AdminProductReviewStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductReview
        fields = ["status"]

    def validate_status(self, value):

        allowed_statuses = [
            ProductReview.ReviewStatus.APPROVED,
            ProductReview.ReviewStatus.REJECTED,
        ]

        if value not in allowed_statuses:
            raise serializers.ValidationError(
                "Status must be APPROVED or REJECTED."
            )

        return value