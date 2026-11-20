from django.contrib import admin
from .models import (
    ProductReview,
    Order,
    OrderItem,
    CartItem,
    Cart,
    Wishlist,
    WishlistItem)

@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):

    # Columns displayed in the admin review list.
    list_display = (
        "id",
        "user",
        "product",
        "rating",
        "status",
        "created_at",
    )

    # Filters available in the sidebar.
    list_filter = (
        "status",
        "rating",
        "created_at",
    )

    # Search by user email, product name or review title.
    search_fields = (
        "user__email",
        "product__name",
        "title",
        "comment",
    )

    # Allow admin to approve reviews directly from the list.
    list_editable = ("status",)

    # Newest reviews appear first.
    ordering = ("-created_at",)

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = [
        "product",
        "product_variant",
        "product_name",
        "brand",
        "color_name",
        "size",
        "unit_price",
        "quantity",
        "total_price",
    ]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_number",
        "user",
        "payment_method",
        "payment_status",
        "status",
        "final_amount",
        "created_at",
    ]

    list_filter = [
        "status",
        "payment_status",
        "payment_method",
        "created_at",
    ]

    search_fields = [
        "order_number",
        "user__email",
        "shipping_phone",
    ]

    readonly_fields = [
        "order_number",
        "user",
        "payment_method",
        "subtotal",
        "discount_amount",
        "final_amount",
        "created_at",
        "updated_at",
    ]

    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = [
        "product_name",
        "order",
        "color_name",
        "size",
        "quantity",
        "unit_price",
        "total_price",
    ]

    readonly_fields = [
        "order",
        "product",
        "product_variant",
        "product_name",
        "brand",
        "color_name",
        "size",
        "unit_price",
        "quantity",
        "total_price",
        "created_at",
    ]


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "created_at", "updated_at"]
    search_fields = ["user__email"]
    inlines = [CartItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = [
        "cart",
        "product_variant",
        "quantity",
        "created_at",
    ]
    list_filter = ["created_at"]
    search_fields = [
        "cart__user__email",
        "product_variant__sku",
    ]

class WishlistItemInline(admin.TabularInline):
    # Display wishlist products inside the Wishlist admin page.
    model = WishlistItem
    extra = 0


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    # Columns displayed in the wishlist list page.
    list_display = ["id", "user", "created_at", "updated_at"]

    # Allow searching by customer email.
    search_fields = ["user__email"]

    # Show wishlist items inside the wishlist details page.
    inlines = [WishlistItemInline]


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ["wishlist", "product", "created_at"]

    # Allow searching by customer email and product name.
    search_fields = ["wishlist__user__email", "product__name"]