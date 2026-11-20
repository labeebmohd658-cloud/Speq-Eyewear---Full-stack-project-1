
from django.urls import path
from .views import (
    ProductListView,
    ProductImageUploadView,
    ProductDetailView,
    RelatedProductsView,
    ProductReviewView,
    CouponDetailView,
    CouponListCreateView,
    AddToCartView,
    CartListView,
    RemoveCartItemView,
    UpdateCartItemView,
    WishlistListView,
    AddToWishlistView,
    RemoveFromWishlistView,
    PublicCategoryListView,
    PublicCollectionListView,
    PublicOccasionListView,
   
    )

urlpatterns = [
    path("", ProductListView.as_view(), name="product-list"),
    path("images/upload/",ProductImageUploadView.as_view(),name="product-image-upload"),
    path("<int:id>/",ProductDetailView.as_view(),name="product-detail"),
    path("<int:id>/related/",RelatedProductsView.as_view(),name="related-products"),
    path("<int:id>/reviews/",ProductReviewView.as_view(),name="product-reviews"),
    path("coupons/",CouponListCreateView.as_view(),name="coupen-list-create"),
    path("coupons/<int:pk>/",CouponDetailView.as_view(),name="coupon-detail"),
    path("cart/add/",AddToCartView.as_view(),name="add-to-cart"),
    path("cart/", CartListView.as_view(), name="cart-list"),
    path("cart/remove/<int:item_id>/",RemoveCartItemView.as_view(),name="remove-cart-item"),
    path("cart/update/<int:item_id>/",UpdateCartItemView.as_view(),name="update-cart-item"),
    path("wishlist/",WishlistListView.as_view(),name="wishlist-list"),
    path("wishlist/add/",AddToWishlistView.as_view(),name="wishlist-add"),
    path("wishlist/remove/<int:item_id>/",RemoveFromWishlistView.as_view(),name="wishlist-remove"),
    path("categories/", PublicCategoryListView.as_view(), name="public-categories"),
    path("collections/", PublicCollectionListView.as_view(), name="public-collections"),
    path("occasions/", PublicOccasionListView.as_view(), name="public-occasions"),

]
