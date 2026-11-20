
from rest_framework import generics,serializers
from rest_framework.pagination import PageNumberPagination

from .serializers import ProductListSerializer

from decimal import Decimal, InvalidOperation
from rest_framework.exceptions import ValidationError

from django.db.models import (
    Exists,
    OuterRef,
    Prefetch,
    Avg,
    Count,
    Q,
    Sum )
from django.shortcuts import get_object_or_404

from .models import (
    Product,
    ProductColor,
    ProductVariant,
    ProductImage,
    ProductReview,
    Coupon,
    CartItem,
    Cart,
    Wishlist,
    WishlistItem,
    Category,
    Collection,
    Occasion,
    )

from django.db import transaction,IntegrityError,models
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser,AllowAny,IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status

import cloudinary.uploader

from .serializers import (
    ProductImageUploadSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductReviewSerializer,
    CouponSerializer,
    AddToCartSerializer,
    CartItemSerializer,
    WishlistItemSerializer,
    CategoryPublicSerializer,
    CollectionPublicSerializer,
    OccasionPublicSerializer,
    RelatedProductSerializer
    )

from myapp.cloudinary_utils import upload_product_image

from .constants import MAX_CART_QUANTITY

# Controls how many products appear on each page.
class ProductPagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = "page_size"
    max_page_size = 20


# Returns products available for customers.

# Return active categories to customers.
class PublicCategoryListView(generics.ListAPIView):
    serializer_class = CategoryPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Category.objects.filter(
            is_active=True
        ).order_by("name")


# Return active collections to customers.
class PublicCollectionListView(generics.ListAPIView):
    serializer_class = CollectionPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Collection.objects.filter(
            is_active=True
        ).order_by("name")


# Return active occasions to customers.
class PublicOccasionListView(generics.ListAPIView):
    serializer_class = OccasionPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Occasion.objects.filter(
            is_active=True
        ).order_by("name")

class ProductListView(generics.ListAPIView):

    # Return product information using this serializer.
    serializer_class = ProductListSerializer

    # Return 8 products per page by default.
    pagination_class = ProductPagination

    # Customers do not need to log in to browse products.
    permission_classes = [AllowAny]

    def get_queryset(self):

        # Find active variants that have available stock
        # for each product.
        available_variants = ProductVariant.objects.filter(
            product_color__product=OuterRef("pk"),
            is_active=True,
            stock_quantity__gt=0
        )

        # Fetch only products that customers are allowed to see.
        queryset = Product.objects.filter(
            is_active=True,
            is_blocked=False,
            is_listed=True,
            is_archived=False
        ).select_related(
            "category",
            "collection"
        ).annotate(
            # Add an is_available value to each product.
            is_available=Exists(available_variants)
        ).prefetch_related(

            # Fetch product colours, images and active variants.
            Prefetch(
                "colors",
                queryset=ProductColor.objects.prefetch_related(

                    Prefetch(
                        "images",
                        queryset=ProductImage.objects.order_by(
                            "image_order", "id"
                        )
                    ),

                    Prefetch(
                        "variants",
                        queryset=ProductVariant.objects.filter(
                            is_active=True
                        )
                    )
                )
            ),

            # Fetch occasions associated with each product.
            "occasions"
        )

        # ---------------------------------------
        # 1. PRODUCT NAME SEARCH
        # ---------------------------------------

        search_query = self.request.query_params.get(
            "search", ""
        ).strip()

        # Every word must match somewhere in the product name.
        if search_query:
            for word in search_query.split():
                queryset = queryset.filter(
                    name__icontains=word
                )

        # ---------------------------------------
        # 2. CATEGORY FILTER
        # ---------------------------------------

        category_param = self.request.query_params.get(
            "category", ""
        )

        if category_param:

            # Support multiple category slugs separated by commas.
            categories = list(dict.fromkeys(
                item.strip().lower()
                for item in category_param.split(",")
                if item.strip()
            ))

            # Get only active categories that exist in the database.
            valid_categories = set(
                Category.objects.filter(
                    slug__in=categories,
                    is_active=True
                ).values_list("slug", flat=True)
            )

            # Find invalid category slugs.
            invalid_categories = set(categories) - valid_categories

            if invalid_categories:
                raise ValidationError({
                    "category": (
                        f"Invalid categories: "
                        f"{', '.join(sorted(invalid_categories))}"
                    )
                })

            # Return products belonging to any selected category.
            queryset = queryset.filter(
                category__slug__in=categories
            )

        # ---------------------------------------
        # 3. COLLECTION FILTER
        # ---------------------------------------

        collection_param = self.request.query_params.get(
            "collection", ""
        )

        if collection_param:

            collections = list(dict.fromkeys(
                item.strip().lower()
                for item in collection_param.split(",")
                if item.strip()
            ))

            valid_collections = set(
                Collection.objects.filter(
                    slug__in=collections,
                    is_active=True
                ).values_list("slug", flat=True)
            )

            invalid_collections = set(collections) - valid_collections

            if invalid_collections:
                raise ValidationError({
                    "collection": (
                        f"Invalid collections: "
                        f"{', '.join(sorted(invalid_collections))}"
                    )
                })

            queryset = queryset.filter(
                collection__slug__in=collections
            )

        # ---------------------------------------
        # 4. FRAME SHAPE FILTER
        # ---------------------------------------

        frame_shape_param = self.request.query_params.get(
            "frame_shape", ""
        )

        if frame_shape_param:

            # Support multiple frame shapes.
            frame_shapes = list(dict.fromkeys(
                item.strip().lower()
                for item in frame_shape_param.split(",")
                if item.strip()
            ))

            invalid_shapes = [
                shape for shape in frame_shapes
                if shape not in Product.FrameShape.values
            ]

            if invalid_shapes:
                raise ValidationError({
                    "frame_shape": (
                        f"Invalid frame shapes: "
                        f"{', '.join(invalid_shapes)}"
                    )
                })

            queryset = queryset.filter(
                frame_shape__in=frame_shapes
            )

        # ---------------------------------------
        # 5. OCCASION FILTER
        # ---------------------------------------

        occasion_param = self.request.query_params.get(
            "occasion", ""
        )

        if occasion_param:

            occasions = list(dict.fromkeys(
                item.strip().lower()
                for item in occasion_param.split(",")
                if item.strip()
            ))

            valid_occasions = set(
                Occasion.objects.filter(
                    slug__in=occasions,
                    is_active=True
                ).values_list("slug", flat=True)
            )

            invalid_occasions = set(occasions) - valid_occasions

            if invalid_occasions:
                raise ValidationError({
                    "occasion": (
                        f"Invalid occasions: "
                        f"{', '.join(sorted(invalid_occasions))}"
                    )
                })

            # A product can match any selected occasion.
            # distinct() prevents duplicate products from the M2M join.
            queryset = queryset.filter(
                occasions__slug__in=occasions
            ).distinct()

        # ---------------------------------------
        # 6. PRICE FILTER
        # ---------------------------------------

        min_price_param = self.request.query_params.get("min_price")
        max_price_param = self.request.query_params.get("max_price")

        try:

            min_price = (
                Decimal(min_price_param.strip())
                if min_price_param and min_price_param.strip()
                else None
            )

            max_price = (
                Decimal(max_price_param.strip())
                if max_price_param and max_price_param.strip()
                else None
            )

        except (InvalidOperation, ValueError):
            raise ValidationError({
                "price": "Price must contain valid numeric values."
            })

        # Reject NaN and infinity.
        if (
            (min_price is not None and not min_price.is_finite())
            or (max_price is not None and not max_price.is_finite())
        ):
            raise ValidationError({
                "price": "Price must be a finite numeric value."
            })

        # Reject negative prices.
        if min_price is not None and min_price < 0:
            raise ValidationError({
                "min_price": "Minimum price cannot be negative."
            })

        if max_price is not None and max_price < 0:
            raise ValidationError({
                "max_price": "Maximum price cannot be negative."
            })

        # Minimum price must not exceed maximum price.
        if (
            min_price is not None
            and max_price is not None
            and min_price > max_price
        ):
            raise ValidationError({
                "price": "Minimum price cannot be greater than maximum price."
            })

        # selling_price is the final customer-facing product price.
        if min_price is not None:
            queryset = queryset.filter(
                selling_price__gte=min_price
            )

        if max_price is not None:
            queryset = queryset.filter(
                selling_price__lte=max_price
            )

        # ---------------------------------------
        # 7. SORTING
        # ---------------------------------------

        sort_option = self.request.query_params.get("sort")

        allowed_sort_options = [
            "price_low",
            "price_high",
            "name_asc",
            "name_desc"
        ]

        if sort_option and sort_option not in allowed_sort_options:
            raise ValidationError({
                "sort": "Invalid sorting option."
            })

        if sort_option == "price_low":

            queryset = queryset.order_by(
                "selling_price", "id"
            )

        elif sort_option == "price_high":

            queryset = queryset.order_by(
                "-selling_price", "id"
            )

        elif sort_option == "name_asc":

            queryset = queryset.order_by(
                "name", "id"
            )

        elif sort_option == "name_desc":

            queryset = queryset.order_by(
                "-name", "id"
            )

        else:

            # Show newest products first by default.
            queryset = queryset.order_by(
                "-created_at", "-id"
            )

        return queryset


class ProductDetailView(generics.RetrieveAPIView):

    # Customers can view product details without logging in.
    permission_classes = [AllowAny]

    # Return only products visible to customers.
    queryset = Product.objects.filter(
        is_active=True,
        is_blocked=False,
        is_listed=True,
        is_archived=False
    ).annotate(

        # Calculate average rating using approved reviews only.
        average_rating=Avg(
            "reviews__rating",
            filter=Q(
                reviews__status=ProductReview.ReviewStatus.APPROVED
            )
        ),

        # Count approved reviews only.
        review_count=Count(
            "reviews",
            filter=Q(
                reviews__status=ProductReview.ReviewStatus.APPROVED
            )
        )

    ).prefetch_related(
        Prefetch(
            "colors",
            queryset=ProductColor.objects.prefetch_related(
                "images",
                Prefetch(
                    "variants",
                    queryset=ProductVariant.objects.filter(
                        is_active=True
                    )
                )
            )
        )
    )

    serializer_class = ProductDetailSerializer
    lookup_field = "id"


class RelatedProductsView(generics.ListAPIView):

    serializer_class = RelatedProductSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):

        # Get the currently viewed product.
        current_product = get_object_or_404(
            Product.objects.filter(
                is_active=True,
                is_blocked=False,
                is_listed=True,
                is_archived=False
            ),
            id=self.kwargs["id"]
        )

        # Start with other customer-visible products.
        queryset = Product.objects.filter(
            is_active=True,
            is_blocked=False,
            is_listed=True,
            is_archived=False
        ).exclude(
            id=current_product.id
        )

        # Calculate recommendation scores.
        queryset = queryset.annotate(
            recommendation_score=(
                # Same category: highest priority.
                models.Case(
                    models.When(
                        category=current_product.category,
                        then=models.Value(5)
                    ),
                    default=models.Value(0),
                    output_field=models.IntegerField()
                )
                +
                # Same frame shape.
                models.Case(
                    models.When(
                        frame_shape=current_product.frame_shape,
                        then=models.Value(4)
                    ),
                    default=models.Value(0),
                    output_field=models.IntegerField()
                )
                +
                # Same collection.
                models.Case(
                    models.When(
                        collection=current_product.collection,
                        then=models.Value(2)
                    ),
                    default=models.Value(0),
                    output_field=models.IntegerField()
                )
            )
        )

        # Fetch product images efficiently.
        queryset = queryset.select_related(
            "category",
            "collection"
        ).prefetch_related(
            Prefetch(
                "colors",
                queryset=ProductColor.objects.prefetch_related(
                    "images"
                )
            )
        )

        # Highest matching score first.
        # Newest products break ties.
        return queryset.order_by(
            "-recommendation_score",
            "-created_at",
            "-id"
        )[:4]

class ProductImageUploadView(APIView):

    # Only staff/admin users can upload product images.
    permission_classes = [IsAdminUser]

    # Accept image files through multipart form data.
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):

        # Validate the incoming upload data.
        serializer = ProductImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get the validated values.
        product_color = serializer.validated_data["product_color"]
        image = serializer.validated_data["image"]
        image_order = serializer.validated_data["image_order"]
        is_primary = serializer.validated_data["is_primary"]

        # Upload the image to Cloudinary.
        cloudinary_data = upload_product_image(image)

        try:
            with transaction.atomic():

                # If no primary image exists, make this the primary image.
                has_primary = ProductImage.objects.filter(
                    product_color=product_color,
                    is_primary=True
                ).exists()

                if is_primary or not has_primary:

                    # Remove the primary status from the previous image.
                    ProductImage.objects.filter(
                        product_color=product_color,
                        is_primary=True
                    ).update(is_primary=False)

                    is_primary = True

                # Save the Cloudinary details in the database.
                product_image = ProductImage.objects.create(
                    product_color=product_color,
                    image_url=cloudinary_data["image_url"],
                    public_id=cloudinary_data["public_id"],
                    image_order=image_order,
                    is_primary=is_primary
                )

        except Exception:
            # If database saving fails, remove the uploaded Cloudinary image.
            try:
                cloudinary.uploader.destroy(
                    cloudinary_data["public_id"],
                    resource_type="image"
                )
            except Exception:
                # Log cleanup failure in production.
                pass

            raise

        return Response(
            {
                "message": "Product image uploaded successfully.",
                "image": {
                    "id": product_image.id,
                    "product_color": product_color.id,
                    "image_url": product_image.image_url,
                    "public_id": product_image.public_id,
                    "image_order": product_image.image_order,
                    "is_primary": product_image.is_primary,
                }
            },
            status=status.HTTP_201_CREATED
        )

class ProductReviewView(generics.ListCreateAPIView):

    serializer_class = ProductReviewSerializer

    def get_product(self):
        # Fetch the product only once per request.
        if not hasattr(self, "_product"):
            self._product = get_object_or_404(
                Product.objects.filter(
                    is_active=True,
                    is_blocked=False,
                    is_listed=True,
                    is_archived=False
                ),
                id=self.kwargs["id"]
            )

        return self._product

    def get_queryset(self):
        # Return only approved reviews for this product.
        return ProductReview.objects.filter(
            product_id=self.kwargs["id"],
            status=ProductReview.ReviewStatus.APPROVED
        ).select_related("user")

    def get_serializer_context(self):
        context = super().get_serializer_context()

        # Pass the product to the serializer.
        context["product"] = self.get_product()

        return context

    def get_permissions(self):
        # Anyone can view approved reviews.
        if self.request.method == "GET":
            return [AllowAny()]

        # Only authenticated users can submit reviews.
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                serializer.save(
                    user=self.request.user,
                    product=self.get_product()
                )

        except IntegrityError:
            raise serializers.ValidationError(
                {"detail": "You have already reviewed this product."}
            )






class CouponListCreateView(generics.ListCreateAPIView):

    queryset = Coupon.objects.all().order_by("-created_at")
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]


class CouponDetailView(generics.RetrieveUpdateAPIView):

    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]




class AddToCartView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = AddToCartSerializer(data=request.data)

        if serializer.is_valid():

            # Get validated data.
            variant = serializer.validated_data["product_variant"]
            product = variant.product_color.product
            quantity = serializer.validated_data["quantity"]
            lens_option = serializer.validated_data["lens_option"]
            lens_price = serializer.validated_data["lens_price"]

            # Check product and variant availability.
            if (
                not variant.is_active
                or not product.is_active
                or product.is_blocked
                or not product.is_listed
                or product.is_archived
            ):
                return Response(
                    {"error": "This product is no longer available."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check maximum quantity for a single request.
            if quantity > MAX_CART_QUANTITY:
                return Response(
                    {"error": f"You can add a maximum of {MAX_CART_QUANTITY} units."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check available stock.
            if quantity > variant.stock_quantity:
                return Response(
                    {"error": "Requested quantity exceeds available stock."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get or create the user's cart.
            cart, cart_created = Cart.objects.get_or_create(
                user=request.user
            )

            # Get or create the cart item.
            cart_item, item_created = CartItem.objects.get_or_create(
                cart=cart,
                product_variant=variant,
                lens_option=lens_option,
                defaults={
                    "quantity": quantity,
                    "lens_price": lens_price,
                }
            )

            # If the item already exists, update its quantity.
            if not item_created:

                new_quantity = cart_item.quantity + quantity

                if new_quantity > MAX_CART_QUANTITY:
                    return Response(
                        {"error": f"You can add a maximum of {MAX_CART_QUANTITY} units."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if new_quantity > variant.stock_quantity:
                    return Response(
                        {"error": "Requested quantity exceeds available stock."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                cart_item.quantity = new_quantity
                cart_item.lens_price = lens_price
                cart_item.save()

            # Remove the product from wishlist if it exists.
            WishlistItem.objects.filter(
                wishlist__user=request.user,
                product=product
            ).delete()

            return Response(
                {
                    "message": "Product added to cart successfully.",
                    "cart_item": CartItemSerializer(cart_item).data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )




class CartListView(APIView):
    # Only authenticated users can access their cart
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get the logged-in user's cart.
        # If the user doesn't have a cart, create one.
        cart, created = Cart.objects.get_or_create(
            user=request.user
        )

        # Fetch all cart items belonging to this cart.
        # select_related() fetches related database objects efficiently.
        # This avoids unnecessary database queries for product details.
        cart_items = CartItem.objects.filter(
            cart=cart
        ).select_related(
            "product_variant__product_color__product",
            "product_variant__product_color"
        ).order_by("-created_at")

        # Convert cart item objects into JSON-friendly data
        serializer = CartItemSerializer(
            cart_items,
            many=True
        )

        # Count the number of different entries in the cart.
        # Example: 2 different products = 2 items.
        total_items = cart_items.count()

        # Calculate the total quantity of all products.
        # Example: Product A (2) + Product B (3) = 5.
        total_quantity = cart_items.aggregate(
            total=Sum("quantity")
        )["total"] or 0

        # Calculate subtotal using each item's final price.
        # final_price already includes any active product discount.
        # Quantity is multiplied by final_price for each cart item.
        # Decimal is used to avoid floating-point price calculation errors.
        subtotal = sum(
            (
                item.quantity * (
                    item.product_variant.product_color.product.selling_price
                    + item.lens_price
                )
                for item in cart_items
            ),
            Decimal("0.00")
        )

        # Return cart details and summary to the frontend
        return Response({
            "total_items": total_items,
            "total_quantity": total_quantity,
            "subtotal": subtotal,
            "cart_items": serializer.data
        })



class RemoveCartItemView(APIView):
    # Only authenticated users can remove cart items.
    permission_classes = [IsAuthenticated]

    # DELETE request removes a selected cart item.
    def delete(self, request, item_id):

        # Find the cart item using its ID.
        # Also check that it belongs to the logged-in user.
        cart_item = CartItem.objects.filter(
            id=item_id,
            cart__user=request.user
        ).first()

        # If no matching item exists, return a 404 response.
        if not cart_item:
            return Response(
                {"error": "Cart item not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Delete the selected cart item from the database.
        cart_item.delete()

        # Inform the frontend that the item was removed successfully.
        return Response(
            {"message": "Product removed from cart successfully."},
            status=status.HTTP_200_OK
        )


class UpdateCartItemView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):

        # Find the cart item belonging to the logged-in user.
        cart_item = CartItem.objects.filter(
            id=item_id,
            cart__user=request.user
        ).select_related(
            "product_variant__product_color__product"
        ).first()

        # Return 404 if the cart item does not exist.
        if not cart_item:
            return Response(
                {"error": "Cart item not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get the requested quantity from the frontend.
        quantity = request.data.get("quantity")

        # Validate that quantity is a positive integer.
        if isinstance(quantity, bool) or not isinstance(quantity, int) or quantity < 1:
            return Response(
                {"error": "Quantity must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST
            )

        variant = cart_item.product_variant
        product = variant.product_color.product

        # Check whether the variant and product are available.
        if (
            not variant.is_active
            or not product.is_active
            or product.is_blocked
            or not product.is_listed
            or product.is_archived
        ):
            return Response(
                {"error": "This product is not available."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check maximum allowed quantity.
        if quantity > MAX_CART_QUANTITY:
            return Response(
                {"error": f"Maximum {MAX_CART_QUANTITY} units allowed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check available stock.
        if quantity > variant.stock_quantity:
            return Response(
                {"error": "Requested quantity exceeds available stock."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update and save the quantity.
        cart_item.quantity = quantity
        cart_item.save(update_fields=["quantity", "updated_at"])

        # Return the updated cart item.
        serializer = CartItemSerializer(cart_item)

        return Response({
            "message": "Cart quantity updated successfully.",
            "cart_item": serializer.data
        })


class AddToWishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Get the product ID sent by the frontend.
        product_id = request.data.get("product")

        # Check whether the product ID was provided.
        if not product_id:
            return Response(
                {"error": "Product ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find a product that is visible to customers.
        # Blocked, inactive, unlisted and archived products
        # cannot be added to the wishlist.
        product = Product.objects.filter(
            id=product_id,
            is_active=True,
            is_blocked=False,
            is_listed=True,
            is_archived=False
        ).first()

        # Return 404 if the product is unavailable or doesn't exist.
        if not product:
            return Response(
                {"error": "Product not found or unavailable."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get the logged-in user's wishlist.
        # Create one if it doesn't exist.
        wishlist, created = Wishlist.objects.get_or_create(
            user=request.user
        )

        # Add the product to the wishlist.
        # If the product already exists, don't create a duplicate.
        wishlist_item, item_created = WishlistItem.objects.get_or_create(
            wishlist=wishlist,
            product=product
        )

        # Serialize the wishlist item for the API response.
        serializer = WishlistItemSerializer(wishlist_item)

        # Return a different message depending on whether
        # the product was newly added or already existed.
        return Response(
            {
                "message": (
                    "Product added to wishlist successfully."
                    if item_created
                    else "Product is already in your wishlist."
                ),
                "wishlist_item": serializer.data
            },
            status=(
                status.HTTP_201_CREATED
                if item_created
                else status.HTTP_200_OK
            )
        )



class WishlistListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        # Get the logged-in user's wishlist.
        wishlist, created = Wishlist.objects.get_or_create(
            user=request.user
        )

        # Retrieve only customer-visible wishlist products.
        wishlist_items = WishlistItem.objects.filter(
            wishlist=wishlist,
            product__is_active=True,
            product__is_blocked=False,
            product__is_listed=True,
            product__is_archived=False
        ).select_related(
            "product",
            "product__category"
        ).prefetch_related(
            Prefetch(
                "product__colors",
                queryset=ProductColor.objects.prefetch_related(
                    "images"
                )
            )
        ).order_by("-created_at")

        # Serialize wishlist products.
        serializer = WishlistItemSerializer(
            wishlist_items,
            many=True
        )

        return Response({
            "total_items": wishlist_items.count(),
            "wishlist_items": serializer.data
        })



class RemoveFromWishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_id):

        # Find the wishlist item using its ID.
        # Also verify that it belongs to the logged-in user.
        wishlist_item = WishlistItem.objects.filter(
            id=item_id,
            wishlist__user=request.user
        ).first()

        # If the item doesn't exist or belongs to another user,
        # return a 404 response.
        if not wishlist_item:
            return Response(
                {"error": "Wishlist item not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Delete the selected product from the wishlist.
        wishlist_item.delete()

        # Return a success response.
        return Response(
            {"message": "Product removed from wishlist successfully."},
            status=status.HTTP_200_OK
        )
