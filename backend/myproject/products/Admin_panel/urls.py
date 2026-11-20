
from django.urls import path

from .views import (
    CategoryListCreateView,
    CategoryRetrieveUpdateView,
    CategorySoftDeleteView,

    CollectionListCreateView,
    CollectionRetrieveUpdateView,
    CollectionSoftDeleteView,

    OccasionListCreateView,
    OccasionRetrieveUpdateView,
    OccasionSoftDeleteView,

    AdminProductListCreateView,
    AdminProductRetrieveUpdateView,
    AdminProductSoftDeleteView,
    AdminProductPublishView,
    AdminProductRestoreView,

    ProductImageUploadView,
    ProductImageDeleteView,
    ProductImageUpdateView,
    ProductImageReorderView,

    AdminProductReviewListView,
    AdminProductReviewUpdateView,
    AdminProductReviewDeleteView,
)


urlpatterns = [

    # ========================================================
    # CATEGORY
    # ========================================================

    path(
        "categories/",
        CategoryListCreateView.as_view(),
        name="admin-category-list-create",
    ),

    path(
        "categories/<int:id>/",
        CategoryRetrieveUpdateView.as_view(),
        name="admin-category-detail",
    ),

    path(
        "categories/<int:id>/delete/",
        CategorySoftDeleteView.as_view(),
        name="admin-category-delete",
    ),


    # ========================================================
    # COLLECTION
    # ========================================================

    path(
        "collections/",
        CollectionListCreateView.as_view(),
        name="admin-collection-list-create",
    ),

    path(
        "collections/<int:id>/",
        CollectionRetrieveUpdateView.as_view(),
        name="admin-collection-detail",
    ),

    path(
        "collections/<int:id>/delete/",
        CollectionSoftDeleteView.as_view(),
        name="admin-collection-delete",
    ),


    # ========================================================
    # OCCASION
    # ========================================================

    path(
        "occasions/",
        OccasionListCreateView.as_view(),
        name="admin-occasion-list-create",
    ),

    path(
        "occasions/<int:id>/",
        OccasionRetrieveUpdateView.as_view(),
        name="admin-occasion-detail",
    ),

    path(
        "occasions/<int:id>/delete/",
        OccasionSoftDeleteView.as_view(),
        name="admin-occasion-delete",
    ),


    # ========================================================
    # PRODUCT
    # ========================================================

    path(
        "products/",
        AdminProductListCreateView.as_view(),
        name="admin-product-list-create",
    ),

    path(
        "products/<int:id>/",
        AdminProductRetrieveUpdateView.as_view(),
        name="admin-product-detail",
    ),

    path(
        "products/<int:id>/publish/",
        AdminProductPublishView.as_view(),
        name="admin-product-publish",
    ),

    path(
        "products/<int:id>/delete/",
        AdminProductSoftDeleteView.as_view(),
        name="admin-product-soft-delete",
    ),

    path(
        "products/<int:id>/restore/",
        AdminProductRestoreView.as_view(),
        name="admin-product-restore",
    ),


    # ========================================================
    # PRODUCT IMAGES
    # ========================================================

    path(
        "products/images/upload/",
        ProductImageUploadView.as_view(),
        name="admin-product-image-upload",
    ),

    path(
        "products/images/<int:id>/delete/",
        ProductImageDeleteView.as_view(),
        name="admin-product-image-delete",
    ),

    path(
        "products/images/<int:id>/",
        ProductImageUpdateView.as_view(),
        name="admin-product-image-update",
    ),

    path(
        "products/colors/<int:color_id>/images/reorder/",
        ProductImageReorderView.as_view(),
        name="admin-product-image-reorder",
    ),

    # ========================================================
        # PRODUCT REVIEW
    # ========================================================
    

    path(
        "reviews/",
        AdminProductReviewListView.as_view(),
        name="admin-review-list"
    ),

    path(
        "reviews/<int:pk>/",
        AdminProductReviewUpdateView.as_view(),
        name="admin-review-update"
    ),

    path(
        "reviews/<int:pk>/delete/",
        AdminProductReviewDeleteView.as_view(),
        name="admin-review-delete"
    ),

]
