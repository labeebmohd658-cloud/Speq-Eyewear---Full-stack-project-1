# from unittest.mock import patch

# from django.test import TestCase

# from products.Admin_panel.serializers import AdminProductUpdateSerializer
# from products.models import (
#     Category,
#     Collection,
#     Occasion,
#     Product,
#     ProductColor,
#     ProductHighlight,
#     ProductImage,
#     ProductVariant,
# )


# class AdminProductUpdateSerializerTests(TestCase):

#     def setUp(self):
#         self.category = Category.objects.create(
#             name="Eyewear",
#             slug="eyewear",
#         )
#         self.collection = Collection.objects.create(
#             name="Classic",
#             slug="classic",
#         )
#         self.occasion = Occasion.objects.create(
#             name="Everyday",
#             slug="everyday",
#         )
#         self.other_occasion = Occasion.objects.create(
#             name="Outdoor",
#             slug="outdoor",
#         )
#         self.product = Product.objects.create(
#             name="Test Frame",
#             description="A product description long enough for validation.",
#             category=self.category,
#             collection=self.collection,
#             base_price="100.00",
#             selling_price="80.00",
#         )
#         self.product.refresh_from_db()
#         self.color = ProductColor.objects.create(
#             product=self.product,
#             color_name="Black",
#             color_code="#000000",
#         )
#         self.variant = ProductVariant.objects.create(
#             product_color=self.color,
#             size=ProductVariant.Size.SMALL,
#             stock_quantity=3,
#         )
#         self.image = ProductImage.objects.create(
#             product_color=self.color,
#             image_url="https://example.com/black.jpg",
#             public_id="products/black",
#             image_order=0,
#             is_primary=True,
#         )
#         self.highlight = ProductHighlight.objects.create(
#             product=self.product,
#             title="Lightweight frame",
#             display_order=1,
#         )

#     def test_patch_updates_and_creates_nested_data_and_explicit_deletions(self):
#         removed_variant = ProductVariant.objects.create(
#             product_color=self.color,
#             size=ProductVariant.Size.LARGE,
#             stock_quantity=1,
#         )
#         removed_highlight = ProductHighlight.objects.create(
#             product=self.product,
#             title="Temporary highlight",
#             display_order=2,
#         )

#         serializer = AdminProductUpdateSerializer(
#             self.product,
#             data={
#                 "name": "Updated Frame",
#                 "occasions": [self.other_occasion.id],
#                 "colors": [
#                     {
#                         "id": self.color.id,
#                         "color_name": "Black",
#                         "color_code": "#000000",
#                         "variants": [
#                             {
#                                 "id": self.variant.id,
#                                 "size": ProductVariant.Size.MEDIUM,
#                                 "stock_quantity": 5,
#                                 "is_active": True,
#                             },
#                             {
#                                 "size": ProductVariant.Size.LARGE,
#                                 "stock_quantity": 2,
#                                 "is_active": True,
#                             },
#                         ],
#                     },
#                     {
#                         "color_name": "Rose",
#                         "color_code": "#FF00AA",
#                         "variants": [
#                             {
#                                 "size": ProductVariant.Size.SMALL,
#                                 "stock_quantity": 4,
#                                 "is_active": True,
#                             },
#                         ],
#                     },
#                 ],
#                 "highlights": [
#                     {
#                         "id": self.highlight.id,
#                         "title": "Updated lightweight frame",
#                         "display_order": 1,
#                     },
#                     {
#                         "title": "Scratch resistant lenses",
#                         "display_order": 2,
#                     },
#                 ],
#                 "delete_variant_ids": [removed_variant.id],
#                 "delete_highlight_ids": [removed_highlight.id],
#             },
#             partial=True,
#         )

#         self.assertTrue(serializer.is_valid(), serializer.errors)
#         serializer.save()

#         self.product.refresh_from_db()
#         self.assertEqual(self.product.name, "Updated Frame")
#         self.assertEqual(
#             list(self.product.occasions.values_list("id", flat=True)),
#             [self.other_occasion.id],
#         )
#         self.assertEqual(self.color.variants.count(), 2)
#         self.variant.refresh_from_db()
#         self.assertEqual(self.variant.size, ProductVariant.Size.MEDIUM)
#         self.assertEqual(self.variant.sku, f"SPQ-{self.product.id}-{self.color.id}-M")
#         self.assertFalse(
#             ProductVariant.objects.filter(id=removed_variant.id).exists()
#         )
#         self.assertEqual(self.product.colors.count(), 2)
#         self.assertTrue(
#             ProductColor.objects.filter(
#                 product=self.product,
#                 color_name="Rose",
#                 variants__size=ProductVariant.Size.SMALL,
#                 variants__stock_quantity=4,
#             ).exists()
#         )
#         self.assertEqual(self.product.highlights.count(), 2)
#         self.highlight.refresh_from_db()
#         self.assertEqual(self.highlight.title, "Updated lightweight frame")
#         self.assertFalse(
#             ProductHighlight.objects.filter(id=removed_highlight.id).exists()
#         )
#         self.assertTrue(ProductImage.objects.filter(id=self.image.id).exists())

#     def test_patch_without_nested_fields_preserves_existing_relations(self):
#         self.product.occasions.add(self.occasion)
#         serializer = AdminProductUpdateSerializer(
#             self.product,
#             data={"description": "A changed description with enough length."},
#             partial=True,
#         )

#         self.assertTrue(serializer.is_valid(), serializer.errors)
#         serializer.save()

#         self.assertEqual(self.product.colors.count(), 1)
#         self.assertEqual(self.product.highlights.count(), 1)
#         self.assertEqual(self.product.occasions.count(), 1)
#         self.assertTrue(ProductImage.objects.filter(id=self.image.id).exists())

#     def test_existing_variants_can_swap_sizes_without_unique_constraint_failure(self):
#         medium_variant = ProductVariant.objects.create(
#             product_color=self.color,
#             size=ProductVariant.Size.MEDIUM,
#             stock_quantity=2,
#         )
#         serializer = AdminProductUpdateSerializer(
#             self.product,
#             data={
#                 "colors": [
#                     {
#                         "id": self.color.id,
#                         "variants": [
#                             {
#                                 "id": self.variant.id,
#                                 "size": ProductVariant.Size.MEDIUM,
#                                 "stock_quantity": 3,
#                             },
#                             {
#                                 "id": medium_variant.id,
#                                 "size": ProductVariant.Size.SMALL,
#                                 "stock_quantity": 2,
#                             },
#                         ],
#                     }
#                 ]
#             },
#             partial=True,
#         )

#         self.assertTrue(serializer.is_valid(), serializer.errors)
#         serializer.save()

#         self.variant.refresh_from_db()
#         medium_variant.refresh_from_db()
#         self.assertEqual(self.variant.size, ProductVariant.Size.MEDIUM)
#         self.assertEqual(medium_variant.size, ProductVariant.Size.SMALL)
#         self.assertEqual(
#             self.variant.sku,
#             f"SPQ-{self.product.id}-{self.color.id}-M",
#         )
#         self.assertEqual(
#             medium_variant.sku,
#             f"SPQ-{self.product.id}-{self.color.id}-S",
#         )

#     @patch(
#         "products.Admin_panel.serializers.delete_product_images"
#     )
#     def test_explicit_colour_deletion_removes_images_and_schedules_cloud_cleanup(
#         self,
#         delete_product_images,
#     ):
#         with self.captureOnCommitCallbacks(execute=True):
#             serializer = AdminProductUpdateSerializer(
#                 self.product,
#                 data={"delete_color_ids": [self.color.id]},
#                 partial=True,
#             )
#             self.assertTrue(serializer.is_valid(), serializer.errors)
#             serializer.save()

#         self.assertFalse(
#             ProductColor.objects.filter(id=self.color.id).exists()
#         )
#         self.assertFalse(
#             ProductImage.objects.filter(id=self.image.id).exists()
#         )
#         delete_product_images.assert_called_once_with(["products/black"])

#     def test_nested_colour_id_must_belong_to_product(self):
#         other_product = Product.objects.create(
#             name="Other Frame",
#             description="Another product description long enough.",
#             category=self.category,
#             collection=self.collection,
#             base_price="100.00",
#             selling_price="80.00",
#         )
#         other_color = ProductColor.objects.create(
#             product=other_product,
#             color_name="Blue",
#             color_code="#0000FF",
#         )

#         serializer = AdminProductUpdateSerializer(
#             self.product,
#             data={
#                 "colors": [
#                     {
#                         "id": other_color.id,
#                         "color_name": "Blue",
#                         "color_code": "#0000FF",
#                         "variants": [],
#                     }
#                 ]
#             },
#             partial=True,
#         )

#         self.assertFalse(serializer.is_valid())
#         self.assertIn("colors", serializer.errors)

#     def test_nested_variant_and_highlight_ids_must_belong_to_product(self):
#         other_product = Product.objects.create(
#             name="Other Frame",
#             description="Another product description long enough.",
#             category=self.category,
#             collection=self.collection,
#             base_price="100.00",
#             selling_price="80.00",
#         )
#         other_product.refresh_from_db()
#         other_color = ProductColor.objects.create(
#             product=other_product,
#             color_name="Blue",
#             color_code="#0000FF",
#         )
#         other_variant = ProductVariant.objects.create(
#             product_color=other_color,
#             size=ProductVariant.Size.SMALL,
#             stock_quantity=2,
#         )
#         other_highlight = ProductHighlight.objects.create(
#             product=other_product,
#             title="Another product highlight",
#             display_order=1,
#         )

#         color_serializer = AdminProductUpdateSerializer(
#             self.product,
#             data={
#                 "colors": [
#                     {
#                         "id": self.color.id,
#                         "color_name": "Black",
#                         "color_code": "#000000",
#                         "variants": [
#                             {
#                                 "id": other_variant.id,
#                                 "size": ProductVariant.Size.SMALL,
#                                 "stock_quantity": 2,
#                             }
#                         ],
#                     }
#                 ]
#             },
#             partial=True,
#         )
#         self.assertFalse(color_serializer.is_valid())
#         self.assertIn("colors", color_serializer.errors)

#         highlight_serializer = AdminProductUpdateSerializer(
#             self.product,
#             data={
#                 "highlights": [
#                     {
#                         "id": other_highlight.id,
#                         "title": "Changed highlight",
#                         "display_order": 1,
#                     }
#                 ]
#             },
#             partial=True,
#         )
#         self.assertFalse(highlight_serializer.is_valid())
#         self.assertIn("highlights", highlight_serializer.errors)
