
from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from .constants import MAX_CART_QUANTITY

from django.db.models import Avg
from .models import (
      Product,
      ProductColor, 
      ProductVariant,
      ProductImage,
      ProductHighlight,
      ProductReview,
      Coupon,
      Cart,
      CartItem,
      WishlistItem,
      Wishlist,
      Category,
      Collection,
      Occasion,
      LensOption,
      LENS_PRICES,
    
      )

class CategoryPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description"]


class CollectionPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "name", "slug", "description", "image"]


class OccasionPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Occasion
        fields = ["id", "name", "slug", "description", "image"]

class ProductVariantSerializer(serializers.ModelSerializer):

    # Tells the frontend whether this variant can be purchased.
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "size",
            "stock_quantity",
            "is_available",
        ]

    def get_is_available(self, obj):
        # A variant is available when it has stock.
        return obj.is_active and obj.stock_quantity > 0


class ProductImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductImage
        fields = [
            "id",
            "image_url",
            "image_order",
            "is_primary",
        ]



class ProductColorSerializer(serializers.ModelSerializer):

    # Return all images belonging to this product colour.
    images = ProductImageSerializer(many=True, read_only=True)

    # Return all size variants belonging to this product colour.
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = ProductColor
        fields = [
            "id",
            "color_name",
            "color_code",
            "images",
            "variants",
        ]


class ProductColorDetailSerializer(serializers.ModelSerializer):

    # Get all images connected to this product colour.
    images = ProductImageSerializer(many=True, read_only=True)

    # Get all size variants connected to this product colour.
    variants = ProductVariantSerializer(many=True, read_only=True)



    class Meta:
        model = ProductColor
        fields = [
            "id",
            "color_name",
            "color_code",
            "images",
            "variants",
        ]




class ProductListSerializer(serializers.ModelSerializer):

    # Return colours, images and variants.
    colors = ProductColorSerializer(many=True, read_only=True)

    # Value comes from the Exists() annotation in ProductListView.
    is_available = serializers.BooleanField(read_only=True)

    # Return related model slugs instead of database IDs.
    category = serializers.SlugRelatedField(
        read_only=True,
        slug_field="slug"
    )

    collection = serializers.SlugRelatedField(
        read_only=True,
        slug_field="slug"
    )

    occasions = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field="slug"
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "collection",
            "frame_shape",
            "occasions",
            "description",
            "base_price",
            "selling_price",
            "is_available",
            "colors",
        ]


class RelatedProductSerializer(serializers.ModelSerializer):
    # Return the primary product image.
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "base_price",
            "selling_price",
            "frame_shape",
            "image_url",
        ]

    def get_image_url(self, obj):
        # Find the first primary image across the product's colours.
        for color in obj.colors.all():
            for image in color.images.all():
                if image.is_primary:
                    return image.image_url

        # Fall back to the first available image.
        for color in obj.colors.all():
            first_image = color.images.first()
            if first_image:
                return first_image.image_url

        return None


class ProductHighlightSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductHighlight
        fields = [
            "id",
            "title",
            "display_order",
        ]




class ProductDetailSerializer(serializers.ModelSerializer):

    colors = ProductColorDetailSerializer(many=True, read_only=True)
    highlights = ProductHighlightSerializer(many=True, read_only=True)

    # Product availability and review information.
    is_available = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    # Price information.
    has_discount = serializers.SerializerMethodField()
    discount_type = serializers.SerializerMethodField()
    discount_value = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()

    # Return related model slugs.
    category = serializers.SlugRelatedField(
        read_only=True,
        slug_field="slug"
    )

    collection = serializers.SlugRelatedField(
        read_only=True,
        slug_field="slug"
    )

    occasions = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field="slug"
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "collection",
            "frame_shape",
            "occasions",
            "description",
            "base_price",
            "selling_price",
            "colors",
            "highlights",
            "is_available",
            "created_at",
            "average_rating",
            "review_count",
            "has_discount",
            "discount_type",
            "discount_value",
            "discount_amount",
            "final_price",
        ]

    def get_is_available(self, obj):

        return ProductVariant.objects.filter(
            product_color__product=obj,
            is_active=True,
            stock_quantity__gt=0
        ).exists()

    def get_average_rating(self, obj):

        if obj.average_rating is None:
            return 0

        return round(obj.average_rating, 1)

    def get_review_count(self, obj):

        return obj.review_count

    # A product has a discount when selling price is lower than MRP.
    def get_has_discount(self, obj):

        return obj.selling_price < obj.base_price

    # No separate discount model exists.
    def get_discount_type(self, obj):

        return None

    def get_discount_value(self, obj):

        return None

    # Difference between MRP and selling price.
    def get_discount_amount(self, obj):

        return obj.base_price - obj.selling_price

    # Selling price is already the final product price.
    def get_final_price(self, obj):

        return obj.selling_price



class ProductImageUploadSerializer(serializers.Serializer):

    # Identify the colour to which this image belongs.
    product_color = serializers.PrimaryKeyRelatedField(
        queryset=ProductColor.objects.all()
    )

    # Receive the image uploaded from React.
    image = serializers.ImageField()

    # Determine the position of this image in the gallery.
    image_order = serializers.IntegerField(min_value=0)

    # Identify whether this is the main gallery image.
    is_primary = serializers.BooleanField(required=False, default=False)

    def validate_image(self, image):

        # Restrict uploaded image size to 5 MB.
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "Image size must not exceed 5 MB."
            )

        # Allow only JPG, PNG and WEBP images.
        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ]

        if image.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPG, PNG and WEBP images are allowed."
            )

        return image

    def validate(self, attrs):

        # Get the selected product colour.
        product_color = attrs["product_color"]

        # Get the requested image position.
        image_order = attrs["image_order"]

        # Check whether this position is already used.
        if ProductImage.objects.filter(
            product_color=product_color,
            image_order=image_order
        ).exists():

            raise serializers.ValidationError({
                "image_order": "This image order is already used for this colour."
            })

        return attrs


class ProductReviewSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductReview

        fields = [
            "id",
            "user",
            "product",
            "rating",
            "comment",
            "status",
            "created_at",
            "updated_at",
        ]

        # These fields are controlled by the backend.
        read_only_fields = [
            "id",
            "user",
            "product",
            "status",
            "created_at",
            "updated_at",
        ]

    # Validate the rating.
    def validate_rating(self, value):

        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

    # Validate the review comment.
    def validate_comment(self, value):

        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Review comment must contain at least 3 characters."
            )

        if len(value) > 2000:
            raise serializers.ValidationError(
                "Review comment cannot exceed 2000 characters."
            )

        return value

    # Check whether the user has already reviewed this product.
    def validate(self, attrs):

        request = self.context.get("request")
        product = self.context.get("product")

        if self.instance is None and request and product:

            already_reviewed = ProductReview.objects.filter(
                user=request.user,
                product=product
            ).exists()

            if already_reviewed:
                raise serializers.ValidationError(
                    "You have already reviewed this product."
                )

        return attrs





class CouponSerializer(serializers.ModelSerializer):

    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "discount_type",
            "discount_value",
            "minimum_order_amount",
            "start_at",
            "end_at",
            "usage_limit",
            "per_user_limit",
            "used_count",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "used_count",
            "created_at",
            "updated_at",
        ]

    def validate_code(self, value):
        return value.strip().upper()

    def validate(self, attrs):

        # Support both POST and PATCH requests.
        discount_type = attrs.get(
            "discount_type",
            getattr(self.instance, "discount_type", None)
        )

        discount_value = attrs.get(
            "discount_value",
            getattr(self.instance, "discount_value", None)
        )

        minimum_order_amount = attrs.get(
            "minimum_order_amount",
            getattr(self.instance, "minimum_order_amount", 0)
        )

        usage_limit = attrs.get(
            "usage_limit",
            getattr(self.instance, "usage_limit", None)
        )

        per_user_limit = attrs.get(
            "per_user_limit",
            getattr(self.instance, "per_user_limit", 1)
        )

        start_at = attrs.get(
            "start_at",
            getattr(self.instance, "start_at", None)
        )

        end_at = attrs.get(
            "end_at",
            getattr(self.instance, "end_at", None)
        )

        if discount_value is not None and discount_value <= 0:
            raise serializers.ValidationError({
                "discount_value": "Discount must be greater than zero."
            })

        if (
            discount_type == "percentage"
            and discount_value is not None
            and discount_value > 100
        ):
            raise serializers.ValidationError({
                "discount_value": "Percentage discount cannot exceed 100%."
            })

        if minimum_order_amount is not None and minimum_order_amount < 0:
            raise serializers.ValidationError({
                "minimum_order_amount": "Minimum order amount cannot be negative."
            })

        if usage_limit is not None and usage_limit <= 0:
            raise serializers.ValidationError({
                "usage_limit": "Usage limit must be greater than zero."
            })

        if per_user_limit <= 0:
            raise serializers.ValidationError({
                "per_user_limit": "Per-user limit must be greater than zero."
            })

        if start_at and end_at and end_at <= start_at:
            raise serializers.ValidationError({
                "end_at": "End date must be later than start date."
            })

        return attrs



class CartItemSerializer(serializers.ModelSerializer):

    # Product information
    product_name = serializers.CharField(
        source="product_variant.product_color.product.name",
        read_only=True
    )

    color_name = serializers.CharField(
        source="product_variant.product_color.color_name",
        read_only=True
    )

    color_code = serializers.CharField(
        source="product_variant.product_color.color_code",
        read_only=True
    )

    size = serializers.CharField(
        source="product_variant.size",
        read_only=True
    )

    # Product image: primary image for the selected colour
    image_url = serializers.SerializerMethodField()

    # Stock information
    stock_quantity = serializers.IntegerField(
        source="product_variant.stock_quantity",
        read_only=True
    )

    # Product pricing
    base_price = serializers.DecimalField(
        source="product_variant.product_color.product.base_price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    selling_price = serializers.DecimalField(
        source="product_variant.product_color.product.selling_price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    discount_amount = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()

    # Availability information
    is_available = serializers.SerializerMethodField()
    availability_message = serializers.SerializerMethodField()

    class Meta:
        model = CartItem

        fields = [
            "id",
            "product_variant",
            "product_name",
            "image_url",
            "color_name",
            "color_code",
            "size",
            "lens_option",
            "lens_price",
            "quantity",
            "stock_quantity",
            "base_price",
            "selling_price",
            "discount_amount",
            "final_price",
            "is_available",
            "availability_message",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields

    def get_image_url(self, obj):
        # Get images belonging to the selected product colour.
        images = obj.product_variant.product_color.images.all()

        # Prefer the primary image.
        primary_image = next(
            (image for image in images if image.is_primary),
            None
        )

        # Fall back to the first image.
        image = primary_image or next(iter(images), None)

        return image.image_url if image else None

    def get_discount_amount(self, obj):
        product = obj.product_variant.product_color.product

        return product.base_price - product.selling_price

    def get_final_price(self, obj):
        product = obj.product_variant.product_color.product

        return product.selling_price

    def get_is_available(self, obj):
        variant = obj.product_variant
        product = variant.product_color.product

        product_available = (
            product.is_active
            and not product.is_blocked
            and product.is_listed
            and not product.is_archived
        )

        stock_available = variant.stock_quantity >= obj.quantity

        return (
            variant.is_active
            and product_available
            and stock_available
        )

    def get_availability_message(self, obj):
        variant = obj.product_variant
        product = variant.product_color.product

        if (
            not product.is_active
            or product.is_blocked
            or not product.is_listed
            or product.is_archived
        ):
            return "This product is no longer available."

        if not variant.is_active:
            return "This product variant is unavailable."

        if variant.stock_quantity <= 0:
            return "This product is out of stock."

        if variant.stock_quantity < obj.quantity:
            return "Requested quantity exceeds available stock."

        return "Available."



class AddToCartSerializer(serializers.Serializer):

    product_variant = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all()
    )

    quantity = serializers.IntegerField(
        default=1,
        min_value=1
    )

    lens_option = serializers.ChoiceField(
        choices=LensOption.choices,
        default=LensOption.FRAME_ONLY
    )

    def validate(self, attrs):

        variant = attrs["product_variant"]
        quantity = attrs["quantity"]
        product = variant.product_color.product

        # Check whether the variant is active.
        if not variant.is_active:
            raise serializers.ValidationError(
                "This product variant is not available."
            )

        # Check whether the product is visible to customers.
        if (
            not product.is_active
            or product.is_blocked
            or not product.is_listed
            or product.is_archived
        ):
            raise serializers.ValidationError(
                "This product is not available."
            )

        # Check stock availability.
        if variant.stock_quantity <= 0:
            raise serializers.ValidationError(
                "This product is out of stock."
            )

        # Check maximum quantity.
        if quantity > MAX_CART_QUANTITY:
            raise serializers.ValidationError(
                f"You can add a maximum of {MAX_CART_QUANTITY} units."
            )

        if quantity > variant.stock_quantity:
            raise serializers.ValidationError(
                "Requested quantity exceeds available stock."
            )

        # Calculate the lens charge using backend pricing.
        attrs["lens_price"] = LENS_PRICES[attrs["lens_option"]]

        return attrs






class WishlistItemSerializer(serializers.ModelSerializer):

    # Product information
    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    category = serializers.SlugRelatedField(
        source="product.category",
        read_only=True,
        slug_field="slug"
    )

    frame_shape = serializers.CharField(
        source="product.frame_shape",
        read_only=True
    )

    # Product pricing
    base_price = serializers.DecimalField(
        source="product.base_price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    selling_price = serializers.DecimalField(
        source="product.selling_price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    # Product image
    image_url = serializers.SerializerMethodField()

    # Product availability
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = WishlistItem

        fields = [
            "id",
            "product",
            "product_name",
            "category",
            "frame_shape",
            "image_url",
            "base_price",
            "selling_price",
            "is_available",
            "created_at"
        ]

        read_only_fields = fields

    def get_image_url(self, obj):

        product = obj.product

        # Find the primary image across product colours.
        for color in product.colors.all():
            primary_image = color.images.filter(
                is_primary=True
            ).first()

            if primary_image:
                return primary_image.image_url

        # Fall back to the first available image.
        for color in product.colors.all():
            image = color.images.first()

            if image:
                return image.image_url

        return None

    def get_is_available(self, obj):

        product = obj.product

        # Check product visibility.
        product_available = (
            product.is_active
            and not product.is_blocked
            and product.is_listed
            and not product.is_archived
        )

        if not product_available:
            return False

        # Check whether at least one purchasable variant exists.
        return ProductVariant.objects.filter(
            product_color__product=product,
            is_active=True,
            stock_quantity__gt=0
        ).exists()
