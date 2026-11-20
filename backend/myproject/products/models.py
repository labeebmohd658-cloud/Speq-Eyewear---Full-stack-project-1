
from django.db import models
from django.conf import settings
import uuid
from django.core.exceptions import ValidationError

# Available lens options for SpeQ products.
class LensOption(models.TextChoices):
    BLUE_LIGHT = "blue_light", "Blue-Light Protection"
    ZERO_POWER = "zero_power", "Zero-Power Clear Lens"
    FRAME_ONLY = "frame_only", "Frame Only"


# Fixed additional charges for each lens option.
LENS_PRICES = {
    LensOption.BLUE_LIGHT: 500,
    LensOption.ZERO_POWER: 0,
    LensOption.FRAME_ONLY: 0,
}


class Collection(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    slug = models.SlugField(
        unique=True
    )

    description = models.TextField(blank=True)

    image = models.URLField(
        blank=True
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Occasion(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True
    )

    slug = models.SlugField(
        unique=True
    )

    description = models.TextField(blank=True)

    image = models.URLField(
        blank=True
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Product(models.Model):

    class FrameShape(models.TextChoices):
        RECTANGLE = "rectangle", "Rectangle"
        ROUND = "round", "Round"
        AVIATOR = "aviator", "Aviator"
        GEOMETRIC = "geometric", "Geometric"
        SQUARE = "square", "Square"

    name = models.CharField(max_length=200)

    # Every product belongs to one collection
    collection = models.ForeignKey(
        Collection,
        on_delete=models.PROTECT,
        related_name="products",
    )

    
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
      
    )

    frame_shape = models.CharField(
        max_length=20,
        choices=FrameShape.choices,
        null=True,
        blank=True
    )

    # One product can belong to multiple occasions
    occasions = models.ManyToManyField(
        Occasion,
        related_name="products",
        blank=True
    )

    description = models.TextField()

    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    selling_price = models.DecimalField(
    max_digits=10,
    decimal_places=2,
   

)

    is_active = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    is_listed = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_products"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Both prices must be positive.
        if self.base_price <= 0:
            raise ValidationError({
                "base_price": "MRP must be greater than zero."
            })

        if self.selling_price <= 0:
            raise ValidationError({
                "selling_price": "Selling price must be greater than zero."
            })

        # Selling price cannot exceed MRP.
        if self.selling_price > self.base_price:
            raise ValidationError({
                "selling_price": "Selling price cannot exceed MRP."
            })

    def __str__(self):
        return self.name




class ProductColor(models.Model):

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="colors"
    )

    color_name = models.CharField(max_length=50)

    color_code = models.CharField(
        max_length=7,
        help_text="Hex color code, e.g. #000000"
    )


    def __str__(self):
        return f"{self.product.name} - {self.color_name}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "color_name"],
                name="unique_color_per_product"
            )
        ]



class ProductVariant(models.Model):

    class Size(models.TextChoices):
        SMALL = "S", "Small"
        MEDIUM = "M", "Medium"
        LARGE = "L", "Large"

    product_color = models.ForeignKey(
        ProductColor,
        on_delete=models.CASCADE,
        related_name="variants"
    )

    size = models.CharField(
        max_length=5,
        choices=Size.choices
    )

    # SKU is generated automatically by Django.
    # Admin users do not need to enter it manually.
    sku = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        editable=False
    )

    stock_quantity = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    # Generate a unique SKU before saving a new variant.
    def save(self, *args, **kwargs):

        if not self.sku:
            self.sku = (
                f"SPQ-{self.product_color.product_id}-"
                f"{self.product_color_id}-{self.size}"
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product_color} - {self.size}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product_color", "size"],
                name="unique_size_per_product_color"
            )
        ]


class ProductImage(models.Model):

    # Connect each gallery image to a particular product colour.
    product_color = models.ForeignKey(
        ProductColor,
        on_delete=models.CASCADE,
        related_name="images"
    )

    # Store the Cloudinary secure URL.
    image_url = models.URLField(max_length=1000)

    # Store the Cloudinary public ID for deletion and replacement.
    public_id = models.CharField(max_length=255)

    # Determine the order in which images appear in the gallery.
    image_order = models.PositiveIntegerField(default=0)

    # Identify the main image for this product colour.
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["image_order", "id"]

        constraints = [
            models.UniqueConstraint(
                fields=["product_color", "image_order"],
                name="unique_image_order_per_color"
            ),
            models.UniqueConstraint(
                fields=["product_color"],
                condition=models.Q(is_primary=True),
                name="unique_primary_image_per_color"
            )
        ]

    def __str__(self):
        return f"{self.product_color} - Image {self.image_order}"

class ProductHighlight(models.Model):

    # Connect each highlight to a product.
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="highlights"
    )

    # Store one highlight for the product.
    title = models.CharField(max_length=200)

    # Control the display order.
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.product.name} - {self.title}"

class ProductReview(models.Model):

    class Rating(models.IntegerChoices):
        ONE = 1, "1 Star"
        TWO = 2, "2 Stars"
        THREE = 3, "3 Stars"
        FOUR = 4, "4 Stars"
        FIVE = 5, "5 Stars"

    class ReviewStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_reviews"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    rating = models.PositiveSmallIntegerField(
        choices=Rating.choices
    )

    comment = models.TextField()

    status = models.CharField(
        max_length=10,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="unique_review_per_user_product"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.product} - {self.rating} Stars"

class Coupon(models.Model):

    class DiscountType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage"
        FIXED = "fixed", "Fixed Amount"

    code = models.CharField(
        max_length=30,
        unique=True
    )

    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices
    )

    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    minimum_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    per_user_limit = models.PositiveIntegerField(default=1)

    used_count = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_at__gt=models.F("start_at")),
                name="coupon_end_after_start"
            )
        ]

    def clean(self):

        from django.core.exceptions import ValidationError

        # Normalize coupon code.
        if not self.code or not self.code.strip():
            raise ValidationError({
                "code": "Coupon code cannot be empty."
            })

        self.code = self.code.strip().upper()

        # Validate discount type.
        if self.discount_type not in self.DiscountType.values:
            raise ValidationError({
                "discount_type": "Invalid discount type."
            })

        # Discount must be greater than zero.
        if self.discount_value <= 0:
            raise ValidationError({
                "discount_value": "Discount must be greater than zero."
            })

        # Percentage discount cannot exceed 100%.
        if (
            self.discount_type == self.DiscountType.PERCENTAGE
            and self.discount_value > 100
        ):
            raise ValidationError({
                "discount_value": "Percentage discount cannot exceed 100%."
            })

        # Minimum order amount cannot be negative.
        if self.minimum_order_amount < 0:
            raise ValidationError({
                "minimum_order_amount": "Minimum order amount cannot be negative."
            })

        # Usage limit must be positive when provided.
        if self.usage_limit is not None and self.usage_limit <= 0:
            raise ValidationError({
                "usage_limit": "Usage limit must be greater than zero."
            })

        if self.per_user_limit <= 0:
            raise ValidationError({
                "per_user_limit": "Per-user limit must be greater than zero."
            })

        # Used count cannot be negative.
        if self.used_count < 0:
            raise ValidationError({
                "used_count": "Used count cannot be negative."
            })

        # End date must be later than start date.
        if self.start_at and self.end_at and self.end_at <= self.start_at:
            raise ValidationError({
                "end_at": "End date must be later than start date."
            })

    def __str__(self):
        return self.code



class Cart(models.Model):

    # Each customer can have only one cart.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email}'s Cart"



class CartItem(models.Model):

    # Which cart contains this item?
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items"
    )

    # Which product variant did the customer select?
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="cart_items"
    )

    # Customer's selected lens option.
    lens_option = models.CharField(
        max_length=20,
        choices=LensOption.choices,
        default=LensOption.FRAME_ONLY
    )

    # Additional charge for the selected lens.
    lens_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # Number of units selected.
    quantity = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
           models.UniqueConstraint(
                fields=["cart", "product_variant", "lens_option"],
                name="unique_variant_lens_per_cart"
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="cart_item_quantity_positive"
            ),
        ]

    def __str__(self):
        return f"{self.product_variant} - Quantity: {self.quantity}"


class Wishlist(models.Model):
    # Each customer can have only one wishlist.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist"
    )

    # Automatically store when the wishlist is created.
    created_at = models.DateTimeField(auto_now_add=True)

    # Automatically update when the wishlist changes.
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email}'s Wishlist"


class WishlistItem(models.Model):
    # Connect each item to its customer's wishlist.
    wishlist = models.ForeignKey(
        Wishlist,
        on_delete=models.CASCADE,
        related_name="items"
    )

    # Store the selected product.
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="wishlist_items"
    )

    # Store when the product was added.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent the same product from appearing twice
        # in the same customer's wishlist.
        constraints = [
            models.UniqueConstraint(
                fields=["wishlist", "product"],
                name="unique_product_per_wishlist"
            )
        ]

        # Display recently added products first.
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} - {self.wishlist.user.email}"





class Order(models.Model):

    class PaymentMethod(models.TextChoices):
        COD = "cod", "Cash on Delivery"
        RAZORPAY = "razorpay", "Razorpay"

    class OrderStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    # Unique reference for every order.
    order_number = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    # Customer who placed the order.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders"
    )

    # Payment information.
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )

    # Order progress.
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING
    )

    # Price information.
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    final_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    # Delivery address snapshot.
    shipping_full_name = models.CharField(max_length=150)
    shipping_phone = models.CharField(max_length=15)
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_pincode = models.CharField(max_length=10)

    # Razorpay references.
    razorpay_order_id = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    razorpay_payment_id = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(subtotal__gte=0),
                name="order_subtotal_nonnegative"
            ),
            models.CheckConstraint(
                condition=models.Q(discount_amount__gte=0),
                name="order_discount_nonnegative"
            ),
            models.CheckConstraint(
                condition=models.Q(final_amount__gte=0),
                name="order_final_amount_nonnegative"
            ),
        ]


    def __str__(self):
        return str(self.order_number)


class OrderItem(models.Model):

    # Parent order.
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )

    # Product purchased.
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items"
    )

    # Selected colour and size variant.
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        related_name="order_items"
    )

    # Snapshot of the lens selected during purchase.
    lens_option = models.CharField(
        max_length=20,
        choices=LensOption.choices,
        default=LensOption.FRAME_ONLY
    )

    # Snapshot of the lens charge at purchase time.
    lens_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # Product information snapshot.
    product_name = models.CharField(max_length=200)
    brand = models.CharField(max_length=30)
    color_name = models.CharField(max_length=100)
    size = models.CharField(max_length=10)

    # Purchase price snapshot.
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    quantity = models.PositiveIntegerField()

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    created_at = models.DateTimeField(auto_now_add=True)

    
    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="order_item_quantity_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(unit_price__gte=0),
                name="order_item_unit_price_nonnegative"
            ),
            models.CheckConstraint(
                condition=models.Q(total_price__gte=0),
                name="order_item_total_price_nonnegative"
            ),
        ]


    def __str__(self):
        return f"{self.product_name} - {self.quantity}"

