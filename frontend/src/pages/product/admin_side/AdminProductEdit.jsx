import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Package,
  ImagePlus,
  Save,
  Eye,
  Plus,
  Trash2,
  Upload,
  Check,
  ArrowUp,
  ArrowDown,
  X,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { adminApiRequest } from "../../../utils/adminApi";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const AVAILABLE_SIZES = ["S", "M", "L"];

const FRAME_SHAPES = [
  { value: "rectangle", label: "Rectangle" },
  { value: "round", label: "Round" },
  { value: "aviator", label: "Aviator" },
  { value: "geometric", label: "Geometric" },
  { value: "square", label: "Square" },
];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getResults = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getApiError = (data) => {
  if (!data) return "Something went wrong.";

  if (typeof data === "string") return data;

  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.non_field_errors?.length) {
    return data.non_field_errors[0];
  }

  const firstError = Object.values(data)
    .flat(Infinity)
    .find((value) => typeof value === "string");

  return firstError || "Unable to complete the request.";
};

const readResponse = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
};

const getRelationId = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return String(value.id ?? "");
  return String(value);
};

const getImageUrl = (image) => {
  if (typeof image === "string") return image;

  return image?.image_url || image?.image || image?.url || image?.file || "";
};

const makeLocalId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createEmptyVariant = () => ({
  localId: makeLocalId(),
  id: null,
  size: "M",
  stockQuantity: "0",
  isActive: true,
});

const createEmptyColor = () => ({
  localId: makeLocalId(),
  id: null,
  colorName: "",
  colorCode: "#000000",
  images: [],
  variants: [createEmptyVariant()],
});

const createEmptyHighlight = () => ({
  localId: makeLocalId(),
  id: null,
  title: "",
});

const formatPrice = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

// --------------------------------------------------
// NORMALIZE BACKEND PRODUCT
// --------------------------------------------------

const normalizeProduct = (product) => {
  const backendColors = product.colors || [];

  const colors = backendColors.map((color) => {
    const backendImages = color.images || color.product_images || [];

    const images = backendImages.map((image) => ({
      localId: makeLocalId(),
      id: image.id ?? null,
      file: null,
      preview: getImageUrl(image),
      isPrimary: Boolean(image.is_primary),
      imageOrder: Number(image.image_order ?? 0),
      isExisting: true,
    }));

    const variants = (color.variants || []).map((variant) => ({
      localId: makeLocalId(),
      id: variant.id ?? null,
      size: variant.size || "M",
      stockQuantity: String(variant.stock_quantity ?? 0),
      isActive: variant.is_active !== false,
    }));

    return {
      localId: makeLocalId(),
      id: color.id ?? null,
      colorName: color.color_name || "",
      colorCode: color.color_code || "#000000",
      images,
      variants: variants.length > 0 ? variants : [createEmptyVariant()],
    };
  });

  const backendHighlights = product.highlights || [];

  const highlights = backendHighlights.map((highlight) => ({
    localId: makeLocalId(),
    id: highlight.id ?? null,
    title: highlight.title || "",
  }));

  return {
    formData: {
      name: product.name || "",
      description: product.description || "",
      category: getRelationId(product.category),
      collection: getRelationId(product.collection),
      frameShape: (product.frame_shape || "").toLowerCase(),
      occasions: (product.occasions || []).map(getRelationId),
    },

    pricing: {
      mrp: String(product.base_price ?? ""),
      sellingPrice: String(product.selling_price ?? ""),
    },

    colors: colors.length > 0 ? colors : [createEmptyColor()],
    highlights: highlights.length > 0 ? highlights : [createEmptyHighlight()],

    productStatus: product.is_listed ? "active" : "inactive",
  };
};

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

const AdminProductEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // --------------------------------------------------
  // STATE
  // --------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [product, setProduct] = useState(null);

  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [occasions, setOccasions] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    collection: "",
    frameShape: "",
    occasions: [],
  });

  const [pricing, setPricing] = useState({
    mrp: "",
    sellingPrice: "",
  });

  const [colors, setColors] = useState([]);
  const [highlights, setHighlights] = useState([]);

  const [productStatus, setProductStatus] = useState("inactive");

  // Track records removed by the user.
  const [deletedColorIds, setDeletedColorIds] = useState([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState([]);
  const [deletedHighlightIds, setDeletedHighlightIds] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);

  const [validationErrors, setValidationErrors] = useState([]);

  // --------------------------------------------------
  // TOAST
  // --------------------------------------------------

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // --------------------------------------------------
  // FETCH OPTIONS
  // --------------------------------------------------

  const fetchOptions = async () => {
    const endpoints = [
      {
        url: "/admin/categories/",
        setter: setCategories,
      },
      {
        url: "/admin/collections/",
        setter: setCollections,
      },
      {
        url: "/admin/occasions/",
        setter: setOccasions,
      },
    ];

    await Promise.all(
      endpoints.map(async ({ url, setter }) => {
        try {
          const response = await adminApiRequest(url);

          if (!response.ok) return;

          const data = await readResponse(response);

          setter(getResults(data).filter((item) => item.is_active !== false));
        } catch (err) {
          console.error(`Options fetching failed: ${url}`, err);
        }
      }),
    );
  };

  // --------------------------------------------------
  // FETCH PRODUCT
  // --------------------------------------------------

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await adminApiRequest(`/admin/products/${id}/`);

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(getApiError(data));
      }

      if (!data || !data.id) {
        throw new Error("Product details were not returned by the API.");
      }

      console.log("Product detail API response:", data);

      setProduct(data);

      const normalized = normalizeProduct(data);

      setFormData(normalized.formData);
      setPricing(normalized.pricing);
      setColors(normalized.colors);
      setHighlights(normalized.highlights);
      setProductStatus(normalized.productStatus);

      // Reset deletion tracking whenever fresh data is loaded.
      setDeletedColorIds([]);
      setDeletedVariantIds([]);
      setDeletedHighlightIds([]);
      setDeletedImageIds([]);
    } catch (err) {
      console.error("Product detail fetching failed:", err);
      setError(err.message || "Unable to load product.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setError("Product ID is missing.");
      setLoading(false);
      return;
    }

    fetchProduct();
    fetchOptions();
  }, [id]);

  // --------------------------------------------------
  // FORM HANDLERS
  // --------------------------------------------------

  const updateFormField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updatePrice = (field, value) => {
    setPricing((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const toggleOccasion = (occasionId) => {
    setFormData((previous) => {
      const selected = previous.occasions.includes(String(occasionId));

      return {
        ...previous,
        occasions: selected
          ? previous.occasions.filter((item) => item !== String(occasionId))
          : [...previous.occasions, String(occasionId)],
      };
    });
  };

  // --------------------------------------------------
  // COLOR HANDLERS
  // --------------------------------------------------

  const addColor = () => {
    setColors((previous) => [...previous, createEmptyColor()]);
  };

  const removeColor = (localId) => {
    const color = colors.find((item) => item.localId === localId);

    if (!color) return;

    if (color.id) {
      setDeletedColorIds((previous) =>
        previous.includes(color.id) ? previous : [...previous, color.id],
      );
    }

    setColors((previous) =>
      previous.filter((item) => item.localId !== localId),
    );
  };

  const updateColor = (localId, field, value) => {
    setColors((previous) =>
      previous.map((color) =>
        color.localId === localId ? { ...color, [field]: value } : color,
      ),
    );
  };

  // --------------------------------------------------
  // VARIANT HANDLERS
  // --------------------------------------------------

  const addVariant = (colorLocalId) => {
    setColors((previous) =>
      previous.map((color) =>
        color.localId === colorLocalId
          ? {
              ...color,
              variants: [...color.variants, createEmptyVariant()],
            }
          : color,
      ),
    );
  };

  const removeVariant = (colorLocalId, variantLocalId) => {
    setColors((previous) =>
      previous.map((color) => {
        if (color.localId !== colorLocalId) return color;

        const variant = color.variants.find(
          (item) => item.localId === variantLocalId,
        );

        if (variant?.id) {
          setDeletedVariantIds((deleted) =>
            deleted.includes(variant.id) ? deleted : [...deleted, variant.id],
          );
        }

        return {
          ...color,
          variants: color.variants.filter(
            (item) => item.localId !== variantLocalId,
          ),
        };
      }),
    );
  };

  const updateVariant = (colorLocalId, variantLocalId, field, value) => {
    setColors((previous) =>
      previous.map((color) =>
        color.localId === colorLocalId
          ? {
              ...color,
              variants: color.variants.map((variant) =>
                variant.localId === variantLocalId
                  ? { ...variant, [field]: value }
                  : variant,
              ),
            }
          : color,
      ),
    );
  };

  // --------------------------------------------------
  // IMAGE HANDLERS
  // --------------------------------------------------

  const handleImageUpload = (colorLocalId, event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    // Find the correct colour using its frontend local ID.
    const currentColor = colors.find((color) => color.localId === colorLocalId);

    if (!currentColor) return;

    // Maximum 4 images per colour.
    const remainingSlots = 4 - currentColor.images.length;

    if (remainingSlots <= 0) {
      showToast("Maximum 4 images allowed per colour.", "error");

      event.target.value = "";
      return;
    }

    const validFiles = [];
    const rejectedFiles = [];

    // Validate selected files.
    selectedFiles.forEach((file) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        rejectedFiles.push(`${file.name}: Unsupported image format.`);
      } else if (file.size > MAX_IMAGE_SIZE) {
        rejectedFiles.push(`${file.name}: File exceeds 5 MB.`);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > remainingSlots) {
      showToast(
        `Only ${remainingSlots} more image(s) can be uploaded.`,
        "error",
      );
    } else if (rejectedFiles.length > 0) {
      showToast(rejectedFiles.join(" "), "error");
    }

    // Create image previews.
    const newImages = validFiles.slice(0, remainingSlots).map((file) => ({
      localId: makeLocalId(),
      id: null,
      file,
      preview: URL.createObjectURL(file),
      isPrimary: false,
      isExisting: false,
    }));

    if (newImages.length > 0) {
      setColors((previous) =>
        previous.map((color) => {
          if (color.localId !== colorLocalId) return color;

          const images = [...color.images, ...newImages];

          // Automatically select the first image as primary.
          if (!images.some((image) => image.isPrimary)) {
            images[0] = {
              ...images[0],
              isPrimary: true,
            };
          }

          return {
            ...color,
            images,
          };
        }),
      );
    }

    event.target.value = "";
  };

  const removeImage = (colorLocalId, imageLocalId) => {
    setColors((previous) =>
      previous.map((color) => {
        if (color.localId !== colorLocalId) return color;

        const image = color.images.find(
          (item) => item.localId === imageLocalId,
        );

        if (image?.id) {
          setDeletedImageIds((deleted) =>
            deleted.includes(image.id) ? deleted : [...deleted, image.id],
          );
        }

        const remainingImages = color.images.filter(
          (item) => item.localId !== imageLocalId,
        );

        if (image?.isPrimary && remainingImages.length > 0) {
          remainingImages[0].isPrimary = true;
        }

        return {
          ...color,
          images: remainingImages,
        };
      }),
    );
  };

  const setPrimaryImage = (colorLocalId, imageLocalId) => {
    setColors((previous) =>
      previous.map((color) =>
        color.localId === colorLocalId
          ? {
              ...color,
              images: color.images.map((image) => ({
                ...image,
                isPrimary: image.localId === imageLocalId,
              })),
            }
          : color,
      ),
    );
  };

  const moveImage = (colorLocalId, imageIndex, direction) => {
    setColors((previous) =>
      previous.map((color) => {
        if (color.localId !== colorLocalId) return color;

        const images = [...color.images];
        const targetIndex = imageIndex + direction;

        if (targetIndex < 0 || targetIndex >= images.length) {
          return color;
        }

        [images[imageIndex], images[targetIndex]] = [
          images[targetIndex],
          images[imageIndex],
        ];

        return { ...color, images };
      }),
    );
  };

  // --------------------------------------------------
  // HIGHLIGHT HANDLERS
  // --------------------------------------------------

  const addHighlight = () => {
    setHighlights((previous) => [...previous, createEmptyHighlight()]);
  };

  const updateHighlight = (localId, value) => {
    setHighlights((previous) =>
      previous.map((highlight) =>
        highlight.localId === localId
          ? { ...highlight, title: value }
          : highlight,
      ),
    );
  };

  const removeHighlight = (localId) => {
    const highlight = highlights.find((item) => item.localId === localId);

    if (highlight?.id) {
      setDeletedHighlightIds((previous) =>
        previous.includes(highlight.id)
          ? previous
          : [...previous, highlight.id],
      );
    }

    setHighlights((previous) =>
      previous.filter((item) => item.localId !== localId),
    );
  };

  const moveHighlight = (index, direction) => {
    setHighlights((previous) => {
      const updated = [...previous];
      const target = index + direction;

      if (target < 0 || target >= updated.length) {
        return previous;
      }

      [updated[index], updated[target]] = [updated[target], updated[index]];

      return updated;
    });
  };

  // --------------------------------------------------
  // INVENTORY CALCULATIONS
  // --------------------------------------------------

  const inventory = useMemo(() => {
    const totalStock = colors.reduce(
      (total, color) =>
        total +
        color.variants.reduce(
          (sum, variant) =>
            sum + Math.max(0, Number(variant.stockQuantity) || 0),
          0,
        ),
      0,
    );

    const activeVariants = colors.reduce(
      (total, color) =>
        total + color.variants.filter((variant) => variant.isActive).length,
      0,
    );

    return {
      totalStock,
      activeVariants,
      colorCount: colors.length,
      imageCount: colors.reduce(
        (total, color) => total + color.images.length,
        0,
      ),
    };
  }, [colors]);

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateForm = () => {
    const errors = [];

    // PRODUCT NAME
    const name = formData.name.trim();

    if (!name) {
      errors.push("Product name is required.");
    } else if (name.length < 3) {
      errors.push("Product name must contain at least 3 characters.");
    } else if (name.length > 100) {
      errors.push("Product name cannot exceed 100 characters.");
    } else if (!/^[A-Za-z0-9 ]+$/.test(name)) {
      errors.push(
        "Product name can contain only letters, numbers, and spaces.",
      );
    } else if ((name.match(/[A-Za-z]/g) || []).length < 3) {
      errors.push("Product name must contain at least 3 letters.");
    }

    // DESCRIPTION
    const description = formData.description.trim();

    if (!description) {
      errors.push("Product description is required.");
    } else if (description.length < 10) {
      errors.push("Description must contain at least 10 characters.");
    } else if (description.length > 1000) {
      errors.push("Description cannot exceed 1000 characters.");
    }

    // CATEGORY, COLLECTION AND FRAME SHAPE
    if (!formData.category) {
      errors.push("Please select a product category.");
    }

    if (!formData.collection) {
      errors.push("Please select a collection.");
    }

    if (!FRAME_SHAPES.some((shape) => shape.value === formData.frameShape)) {
      errors.push("Please select a valid frame shape.");
    }

    if (formData.occasions.length === 0) {
      errors.push("Please select at least one occasion.");
    }

    // PRICING
    const mrp = Number(pricing.mrp);
    const sellingPrice = Number(pricing.sellingPrice);

    if (pricing.mrp.trim() === "" || !Number.isFinite(mrp) || mrp <= 0) {
      errors.push("MRP must be a valid amount greater than zero.");
    }

    if (
      pricing.sellingPrice.trim() === "" ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice <= 0
    ) {
      errors.push("Selling price must be a valid amount greater than zero.");
    }

    if (
      Number.isFinite(mrp) &&
      Number.isFinite(sellingPrice) &&
      sellingPrice > mrp
    ) {
      errors.push("Selling price cannot be greater than MRP.");
    }

    // HIGHLIGHTS
    const highlightTitles = highlights
      .map((item) => item.title.trim().toLowerCase())
      .filter(Boolean);

    if (new Set(highlightTitles).size !== highlightTitles.length) {
      errors.push("Duplicate product highlights are not allowed.");
    }

    highlights.forEach((highlight, index) => {
      const title = highlight.title.trim();

      if (!title) {
        errors.push(`Highlight ${index + 1}: Title is required.`);
      } else if (title.length < 5) {
        errors.push(
          `Highlight ${index + 1}: Must contain at least 5 characters.`,
        );
      } else if (title.length > 80) {
        errors.push(`Highlight ${index + 1}: Cannot exceed 80 characters.`);
      }
    });

    // COLOURS
    if (colors.length === 0) {
      errors.push("Please add at least one product colour.");
    }

    const colorNames = colors
      .map((color) => color.colorName.trim().toLowerCase())
      .filter(Boolean);

    if (new Set(colorNames).size !== colorNames.length) {
      errors.push("Duplicate colour names are not allowed.");
    }

    colors.forEach((color, index) => {
      const colorNumber = index + 1;
      const colorName = color.colorName.trim();

      if (!colorName) {
        errors.push(`Colour ${colorNumber}: Colour name is required.`);
      } else if (colorName.length < 2) {
        errors.push(
          `Colour ${colorNumber}: Name must contain at least 2 characters.`,
        );
      } else if (!/^[A-Za-z]+$/.test(colorName)) {
        errors.push(`Colour ${colorNumber}: Name can contain only letters.`);
      }

      if (!/^#[0-9A-Fa-f]{6}$/.test(color.colorCode)) {
        errors.push(
          `Colour ${colorNumber}: Please enter a valid HEX colour code.`,
        );
      }

      if (color.images.length < 3) {
        errors.push(`Colour ${colorNumber}: Upload at least 3 product images.`);
      } else if (color.images.length > 4) {
        errors.push(
          `Colour ${colorNumber}: You can upload a maximum of 4 product images.`,
        );
      }

      const primaryCount = color.images.filter(
        (image) => image.isPrimary,
      ).length;

      if (primaryCount !== 1) {
        errors.push(`Colour ${colorNumber}: Select exactly one primary image.`);
      }

      // VARIANTS
      if (color.variants.length === 0) {
        errors.push(`Colour ${colorNumber}: Add at least one variant.`);
      }

      if (!color.variants.some((variant) => variant.isActive)) {
        errors.push(
          `Colour ${colorNumber}: At least one variant must be active.`,
        );
      }

      const sizes = color.variants.map((variant) => variant.size);

      if (new Set(sizes).size !== sizes.length) {
        errors.push(
          `Colour ${colorNumber}: Duplicate variant sizes are not allowed.`,
        );
      }

      color.variants.forEach((variant, variantIndex) => {
        const stock = Number(variant.stockQuantity);

        if (!Number.isInteger(stock) || !Number.isFinite(stock) || stock < 0) {
          errors.push(
            `Colour ${colorNumber}, Variant ${variantIndex + 1}: Stock must be a non-negative integer.`,
          );
        }
      });
    });

    setValidationErrors(errors);

    return errors.length === 0;
  };

  // --------------------------------------------------
  // BUILD UPDATE PAYLOAD
  // --------------------------------------------------

  const buildPayload = () => ({
    name: formData.name.trim(),
    description: formData.description.trim(),

    base_price: Number(pricing.mrp),
    selling_price: Number(pricing.sellingPrice),

    category: Number(formData.category),
    collection: Number(formData.collection),

    occasions: formData.occasions.map(Number),
    frame_shape: formData.frameShape,

    colors: colors.map((color) => ({
      ...(color.id ? { id: color.id } : {}),

      color_name: color.colorName.trim(),
      color_code: color.colorCode,

      variants: color.variants.map((variant) => ({
        ...(variant.id ? { id: variant.id } : {}),

        size: variant.size,
        stock_quantity: Number(variant.stockQuantity),
        is_active: variant.isActive,
      })),
    })),

    highlights: highlights.map((highlight, index) => ({
      ...(highlight.id ? { id: highlight.id } : {}),

      title: highlight.title.trim(),
      display_order: index + 1,
    })),

    delete_color_ids: deletedColorIds,
    delete_variant_ids: deletedVariantIds,
    delete_highlight_ids: deletedHighlightIds,
  });

  // --------------------------------------------------
  // IMAGE OPERATIONS
  // --------------------------------------------------

  // Find the backend colour using its colour name.
  const findBackendColor = (updatedProduct, color) => {
    return updatedProduct.colors.find(
      (item) =>
        item.color_name.trim().toLowerCase() ===
        color.colorName.trim().toLowerCase(),
    );
  };

  // Call the backend bulk reorder endpoint.
  const reorderColorImages = async (colorId, imageIds) => {
    if (!imageIds.length) return;

    const response = await adminApiRequest(
      `/admin/products/colors/${colorId}/images/reorder/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_ids: imageIds,
        }),
      },
    );

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        getApiError(data) || `Unable to reorder images for colour ${colorId}.`,
      );
    }
  };

  // STEP 1:
  // Normalize all existing images before uploading new images.
  // This assigns existing images positions 0, 1, 2...
  const normalizeExistingImageOrders = async (updatedProduct) => {
    for (const backendColor of updatedProduct.colors) {
      const existingImageIds = backendColor.images.map((image) => image.id);

      if (!existingImageIds.length) continue;

      await reorderColorImages(backendColor.id, existingImageIds);
    }
  };

  // STEP 2:
  // Update the primary image if the selected primary is an existing image.
  const updateExistingPrimaryImages = async (updatedProduct) => {
    for (const color of colors) {
      const backendColor = findBackendColor(updatedProduct, color);

      if (!backendColor) {
        throw new Error(`Colour ${color.colorName} was not found.`);
      }

      const selectedPrimary = color.images.find((image) => image.isPrimary);

      if (!selectedPrimary || !selectedPrimary.id) {
        // Newly uploaded primary images are handled during upload.
        continue;
      }

      const currentPrimary = backendColor.images.find(
        (image) => image.is_primary,
      );

      if (currentPrimary?.id === selectedPrimary.id) {
        continue;
      }

      const response = await adminApiRequest(
        `/admin/products/images/${selectedPrimary.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_primary: true,
          }),
        },
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getApiError(data) ||
            `Unable to update primary image ${selectedPrimary.id}.`,
        );
      }
    }
  };

  // STEP 3:
  // Upload new images using unused temporary image_order values.
  const uploadNewImages = async (updatedProduct) => {
    const uploadedImageIds = new Map();

    for (const color of colors) {
      const backendColor = findBackendColor(updatedProduct, color);

      if (!backendColor) {
        throw new Error(`Colour ${color.colorName} was not found.`);
      }

      const newImages = color.images.filter((image) => image.file && !image.id);

      // Existing images have already been normalized to:
      // 0, 1, 2, 3...
      // Therefore, new images can safely start after them.
      const existingCount = backendColor.images.length;

      for (let index = 0; index < newImages.length; index++) {
        const image = newImages[index];

        const formData = new FormData();

        formData.append("product_color", backendColor.id);
        formData.append("image", image.file);

        // Use unique temporary positions.
        formData.append("image_order", String(existingCount + index));

        formData.append("is_primary", image.isPrimary ? "true" : "false");

        const response = await adminApiRequest(
          "/admin/products/images/upload/",
          {
            method: "POST",
            body: formData,
          },
        );

        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(
            getApiError(data) || "Unable to upload product image.",
          );
        }

        const uploadedImageId = data.id ?? data.image?.id;

        if (!uploadedImageId) {
          throw new Error(
            "Image uploaded, but the response did not contain its image ID.",
          );
        }

        // Connect the uploaded backend ID with its frontend image.
        uploadedImageIds.set(image.localId, uploadedImageId);
      }
    }

    return uploadedImageIds;
  };

  // STEP 4:
  // Delete images removed by the user.
  const deleteExistingImages = async () => {
    for (const imageId of deletedImageIds) {
      const response = await adminApiRequest(
        `/admin/products/images/${imageId}/delete/`,
        {
          method: "DELETE",
        },
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getApiError(data) || `Unable to delete image ${imageId}.`,
        );
      }
    }
  };

  // STEP 5:
  // Save the final image order selected in the frontend.
  const reorderFinalImages = async (updatedProduct, uploadedImageIds) => {
    for (const color of colors) {
      const backendColor = findBackendColor(updatedProduct, color);

      if (!backendColor) {
        throw new Error(`Colour ${color.colorName} was not found.`);
      }

      // Build IDs in exactly the same order as the frontend.
      const finalImageIds = color.images.map((image) => {
        if (image.id) {
          return image.id;
        }

        return uploadedImageIds.get(image.localId);
      });

      if (finalImageIds.some((imageId) => !imageId)) {
        throw new Error(
          `An image ID is missing for colour ${color.colorName}.`,
        );
      }

      await reorderColorImages(backendColor.id, finalImageIds);
    }
  };

  // --------------------------------------------------
  // SAVE PRODUCT
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      showToast("Please fix the validation errors.", "error");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSubmitting(true);
      setValidationErrors([]);
      setError("");

      // 1. Update product details, colours, variants and highlights.
      const response = await adminApiRequest(`/admin/products/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });

      const responseData = await readResponse(response);

      if (!response.ok) {
        throw new Error(getApiError(responseData));
      }

      // 2. Fetch updated product.
      // We need backend IDs for newly created colours.
      const detailResponse = await adminApiRequest(`/admin/products/${id}/`);

      const updatedProduct = await readResponse(detailResponse);

      if (!detailResponse.ok) {
        throw new Error(
          "Product was updated, but refreshing its details failed.",
        );
      }

      // 3. Normalize existing image orders.
      // This avoids unique image_order conflicts.
      await normalizeExistingImageOrders(updatedProduct);

      // 4. Update the selected primary image if it is an existing image.
      await updateExistingPrimaryImages(updatedProduct);

      // 5. Upload new images using unused temporary positions.
      const uploadedImageIds = await uploadNewImages(updatedProduct);

      // 6. Delete images removed by the user.
      // Upload first so published products do not temporarily
      // fall below the backend's minimum image requirement.
      await deleteExistingImages();

      // 7. Save the final image order.
      // This uses the exact order currently displayed in the UI.
      await reorderFinalImages(updatedProduct, uploadedImageIds);

      // 8. Update store visibility separately.
      const currentListing = Boolean(updatedProduct.is_listed);
      const shouldBeListed = productStatus === "active";

      if (currentListing !== shouldBeListed) {
        const publishResponse = await adminApiRequest(
          `/admin/products/${id}/publish/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              is_listed: shouldBeListed,
            }),
          },
        );

        const publishData = await readResponse(publishResponse);

        if (!publishResponse.ok) {
          throw new Error(getApiError(publishData));
        }
      }

      showToast("Product updated successfully.");

      setTimeout(() => {
        navigate("/admin/products");
      }, 1000);
    } catch (err) {
      console.error("Product update failed:", err);

      setError(err.message || "Unable to update product.");

      showToast(err.message || "Unable to update product.", "error");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <LoaderCircle size={20} className="animate-spin" />
          Loading product details...
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR STATE
  // --------------------------------------------------

  if (error && !product) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-rose-500" />

        <h2 className="font-serif text-2xl text-stone-900">
          Unable to load product
        </h2>

        <p className="mt-2 text-sm text-stone-500">{error}</p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            className="rounded-full border border-stone-200 px-5 py-2.5 text-sm"
          >
            Go Back
          </button>

          <button
            type="button"
            onClick={fetchProduct}
            className="flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* TOAST */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex max-w-md items-center gap-3 rounded-xl px-5 py-4 text-sm text-white shadow-xl ${
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-700"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}

          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            className="mb-5 flex items-center gap-2 text-xs text-stone-500 transition hover:text-stone-900"
          >
            <ArrowLeft size={15} />
            Back to Products
          </button>

          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C55343]" />

            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#C55343]">
              ATELIER CATALOG MANAGEMENT
            </p>
          </div>

          <h1 className="font-serif text-4xl text-stone-900">Edit Product</h1>

          <p className="mt-2 text-sm text-stone-500">
            Update your product information, colours, images and inventory.
          </p>

          <p className="mt-2 text-xs text-stone-400">Product ID: {id}</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-full bg-[#1C1917] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#3B342B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}

          {submitting ? "Saving Changes..." : "Save Changes"}
        </button>
      </div>

      {/* API ERROR */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* VALIDATION ERRORS */}
      {validationErrors.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="mb-3 flex items-center gap-2 text-rose-700">
            <AlertCircle size={18} />
            <p className="text-sm font-semibold">
              Please fix the following issues
            </p>
          </div>

          <ul className="space-y-2">
            {validationErrors.map((message, index) => (
              <li key={index} className="text-xs text-rose-700">
                • {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-[1fr_320px]">
        {/* MAIN COLUMN */}
        <div className="space-y-7">
          {/* BASIC INFORMATION */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[#F2EEE6] p-2.5 text-[#806B4C]">
                <Package size={19} />
              </div>

              <div>
                <h2 className="font-serif text-2xl text-stone-900">
                  Basic Information
                </h2>

                <p className="mt-1 text-xs text-stone-500">
                  Product name and description
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Product Name *
                </label>

                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    updateFormField("name", event.target.value)
                  }
                  maxLength={100}
                  placeholder="Enter product name"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#C55343] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Description *
                </label>

                <textarea
                  rows={5}
                  value={formData.description}
                  onChange={(event) =>
                    updateFormField("description", event.target.value)
                  }
                  maxLength={1000}
                  placeholder="Describe your product..."
                  className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#C55343] focus:bg-white"
                />

                <p className="mt-1 text-right text-[10px] text-stone-400">
                  {formData.description.length}/1000
                </p>
              </div>
            </div>
          </section>

          {/* CATEGORY AND COLLECTION */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <h2 className="mb-6 font-serif text-2xl text-stone-900">
              Product Classification
            </h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Category *
                </label>

                <select
                  value={formData.category}
                  onChange={(event) =>
                    updateFormField("category", event.target.value)
                  }
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#C55343]"
                >
                  <option value="">Select category</option>

                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}

                  {formData.category &&
                    !categories.some(
                      (item) => String(item.id) === formData.category,
                    ) && (
                      <option value={formData.category}>
                        {product?.category_name || "Current category"}
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Collection *
                </label>

                <select
                  value={formData.collection}
                  onChange={(event) =>
                    updateFormField("collection", event.target.value)
                  }
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#C55343]"
                >
                  <option value="">Select collection</option>

                  {collections.map((collection) => (
                    <option key={collection.id} value={String(collection.id)}>
                      {collection.name}
                    </option>
                  ))}

                  {formData.collection &&
                    !collections.some(
                      (item) => String(item.id) === formData.collection,
                    ) && (
                      <option value={formData.collection}>
                        {product?.collection_name || "Current collection"}
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Frame Shape *
                </label>

                <select
                  value={formData.frameShape}
                  onChange={(event) =>
                    updateFormField("frameShape", event.target.value)
                  }
                >
                  <option value="">Select frame shape</option>

                  {FRAME_SHAPES.map((shape) => (
                    <option key={shape.value} value={shape.value}>
                      {shape.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-xs font-semibold text-stone-700">
                Occasions *
              </label>

              {occasions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {occasions.map((occasion) => {
                    const selected = formData.occasions.includes(
                      String(occasion.id),
                    );

                    return (
                      <button
                        key={occasion.id}
                        type="button"
                        onClick={() => toggleOccasion(occasion.id)}
                        className={`rounded-full border px-4 py-2 text-xs transition ${
                          selected
                            ? "border-[#1C1917] bg-[#1C1917] text-white"
                            : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                        }`}
                      >
                        {occasion.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-stone-400">
                  No occasion options available.
                </p>
              )}
            </div>
          </section>

          {/* PRICING */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="font-serif text-2xl text-stone-900">Pricing</h2>

              <p className="mt-1 text-xs text-stone-500">
                Update product pricing in INR
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  MRP (₹) *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.mrp}
                  onChange={(event) => updatePrice("mrp", event.target.value)}
                  placeholder="2500"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#C55343]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Selling Price (₹) *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.sellingPrice}
                  onChange={(event) =>
                    updatePrice("sellingPrice", event.target.value)
                  }
                  placeholder="1999"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#C55343]"
                />
              </div>
            </div>

            {Number(pricing.mrp) > Number(pricing.sellingPrice) &&
              Number(pricing.sellingPrice) > 0 && (
                <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
                  {Math.round(
                    ((Number(pricing.mrp) - Number(pricing.sellingPrice)) /
                      Number(pricing.mrp)) *
                      100,
                  )}
                  % discount on this product.
                </div>
              )}
          </section>

          {/* STORE VISIBILITY */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <Eye size={19} />
              </div>

              <div>
                <h2 className="font-serif text-2xl text-stone-900">
                  Store Visibility
                </h2>

                <p className="mt-1 text-xs text-stone-500">
                  Control whether customers can see this product
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  value: "active",
                  title: "Published",
                  description: "Visible in the online store",
                },
                {
                  value: "inactive",
                  title: "Hidden",
                  description: "Not visible to customers",
                },
              ].map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setProductStatus(status.value)}
                  className={`rounded-xl border p-4 text-left transition ${
                    productStatus === status.value
                      ? "border-[#1C1917] bg-stone-50"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-800">
                      {status.title}
                    </p>

                    {productStatus === status.value && (
                      <CheckCircle2 size={17} className="text-emerald-700" />
                    )}
                  </div>

                  <p className="mt-2 text-xs text-stone-500">
                    {status.description}
                  </p>
                </button>
              ))}
            </div>

            <p className="mt-4 text-[11px] text-stone-400">
              Publishing may fail if the product does not meet your backend
              publishing requirements.
            </p>
          </section>

          {/* COLORS AND IMAGES */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-serif text-2xl text-stone-900">
                  Colours & Product Images
                </h2>

                <p className="mt-1 text-xs text-stone-500">
                  Manage product colour options and photographs
                </p>
              </div>

              <button
                type="button"
                onClick={addColor}
                className="flex items-center justify-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
              >
                <Plus size={15} />
                Add Colour
              </button>
            </div>

            <div className="space-y-6">
              {colors.map((color, colorIndex) => (
                <div
                  key={color.localId}
                  className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full border border-stone-300"
                        style={{ backgroundColor: color.colorCode }}
                      />

                      <div>
                        <p className="text-sm font-semibold text-stone-800">
                          Colour {colorIndex + 1}
                        </p>

                        <p className="text-[10px] text-stone-400">
                          {color.id
                            ? `Existing colour · ID ${color.id}`
                            : "New colour"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeColor(color.localId)}
                      disabled={colors.length === 1}
                      className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 disabled:opacity-30"
                      title="Remove colour"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-stone-700">
                        Colour Name *
                      </label>

                      <input
                        type="text"
                        value={color.colorName}
                        onChange={(event) =>
                          updateColor(
                            color.localId,
                            "colorName",
                            event.target.value,
                          )
                        }
                        placeholder="Black"
                        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#C55343]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-stone-700">
                        HEX Colour Code *
                      </label>

                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={
                            /^#[0-9A-Fa-f]{6}$/.test(color.colorCode)
                              ? color.colorCode
                              : "#000000"
                          }
                          onChange={(event) =>
                            updateColor(
                              color.localId,
                              "colorCode",
                              event.target.value,
                            )
                          }
                          className="h-11 w-12 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
                        />

                        <input
                          type="text"
                          value={color.colorCode}
                          onChange={(event) =>
                            updateColor(
                              color.localId,
                              "colorCode",
                              event.target.value,
                            )
                          }
                          placeholder="#000000"
                          className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none focus:border-[#C55343]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* IMAGE MANAGEMENT */}
                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-stone-700">
                          Product Images
                        </p>

                        <p className="mt-1 text-[10px] text-stone-400">
                          Minimum 3 images. Select one primary image.
                        </p>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[#1C1917] px-4 py-2.5 text-xs text-white transition hover:bg-[#3B342B]">
                        <Upload size={14} />
                        Upload Images
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          className="hidden"
                          onChange={(event) =>
                            handleImageUpload(color.localId, event)
                          }
                        />
                      </label>
                    </div>

                    {color.images.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stone-300 py-10 text-center">
                        <ImagePlus
                          size={25}
                          className="mx-auto mb-2 text-stone-400"
                        />

                        <p className="text-xs text-stone-500">
                          No product images
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {color.images.map((image, imageIndex) => (
                          <div
                            key={image.localId}
                            className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white"
                          >
                            <div className="aspect-square bg-stone-100">
                              <img
                                src={image.preview}
                                alt={`${color.colorName} product ${imageIndex + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            {image.isPrimary && (
                              <span className="absolute left-2 top-2 rounded-full bg-emerald-700 px-2 py-1 text-[9px] font-semibold text-white">
                                PRIMARY
                              </span>
                            )}

                            {!image.isExisting && (
                              <span className="absolute bottom-2 left-2 rounded bg-stone-900/80 px-2 py-1 text-[9px] text-white">
                                NEW
                              </span>
                            )}

                            <div className="space-y-2 p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPrimaryImage(color.localId, image.localId)
                                }
                                className={`w-full rounded-lg py-1.5 text-[10px] font-medium ${
                                  image.isPrimary
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                }`}
                              >
                                {image.isPrimary
                                  ? "Primary Image"
                                  : "Set as Primary"}
                              </button>

                              <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveImage(color.localId, imageIndex, -1)
                                    }
                                    disabled={imageIndex === 0}
                                    className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                                    aria-label="Move image left"
                                  >
                                    <ArrowUp size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveImage(color.localId, imageIndex, 1)
                                    }
                                    disabled={
                                      imageIndex === color.images.length - 1
                                    }
                                    className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                                    aria-label="Move image right"
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeImage(color.localId, image.localId)
                                  }
                                  className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                                  aria-label="Remove image"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* VARIANTS */}
                  <div className="mt-6 border-t border-stone-200 pt-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-stone-700">
                          Variants & Stock
                        </p>

                        <p className="mt-1 text-[10px] text-stone-400">
                          Manage sizes and available quantities
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => addVariant(color.localId)}
                        className="flex items-center gap-1 rounded-full border border-stone-300 px-3 py-2 text-[10px] font-medium text-stone-700 hover:bg-white"
                      >
                        <Plus size={13} />
                        Add Variant
                      </button>
                    </div>

                    <div className="space-y-3">
                      {color.variants.map((variant) => (
                        <div
                          key={variant.localId}
                          className="grid grid-cols-1 items-end gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                        >
                          <div>
                            <label className="mb-1.5 block text-[10px] font-semibold text-stone-500">
                              SIZE
                            </label>

                            <select
                              value={variant.size}
                              onChange={(event) =>
                                updateVariant(
                                  color.localId,
                                  variant.localId,
                                  "size",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs outline-none focus:border-[#C55343]"
                            >
                              {AVAILABLE_SIZES.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-[10px] font-semibold text-stone-500">
                              STOCK QUANTITY
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={variant.stockQuantity}
                              onChange={(event) =>
                                updateVariant(
                                  color.localId,
                                  variant.localId,
                                  "stockQuantity",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs outline-none focus:border-[#C55343]"
                            />
                          </div>

                          <label className="flex items-center gap-2 pb-2 text-[10px] text-stone-600">
                            <input
                              type="checkbox"
                              checked={variant.isActive}
                              onChange={(event) =>
                                updateVariant(
                                  color.localId,
                                  variant.localId,
                                  "isActive",
                                  event.target.checked,
                                )
                              }
                              className="accent-emerald-700"
                            />
                            Active
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              removeVariant(color.localId, variant.localId)
                            }
                            disabled={color.variants.length === 1}
                            className="mb-1 rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                            aria-label="Remove variant"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PRODUCT HIGHLIGHTS */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-stone-900">
                  Product Highlights
                </h2>

                <p className="mt-1 text-xs text-stone-500">
                  Key selling points displayed to customers
                </p>
              </div>

              <button
                type="button"
                onClick={addHighlight}
                className="flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50"
              >
                <Plus size={14} />
                Add Highlight
              </button>
            </div>

            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div
                  key={highlight.localId}
                  className="flex items-center gap-2"
                >
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4">
                    <span className="text-xs text-stone-400">{index + 1}.</span>

                    <input
                      type="text"
                      value={highlight.title}
                      onChange={(event) =>
                        updateHighlight(highlight.localId, event.target.value)
                      }
                      placeholder="Enter product highlight"
                      maxLength={80}
                      className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                    />
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveHighlight(index, -1)}
                      disabled={index === 0}
                      className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                      aria-label="Move highlight up"
                    >
                      <ArrowUp size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveHighlight(index, 1)}
                      disabled={index === highlights.length - 1}
                      className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                      aria-label="Move highlight down"
                    >
                      <ArrowDown size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeHighlight(highlight.localId)}
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                      aria-label="Remove highlight"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}

              {highlights.length === 0 && (
                <p className="py-5 text-center text-xs text-stone-400">
                  No product highlights added.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-5">
          {/* PRODUCT PREVIEW */}
          <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="border-b border-stone-100 p-5">
              <h2 className="font-serif text-xl text-stone-900">
                Live Preview
              </h2>

              <p className="mt-1 text-xs text-stone-500">
                Product information preview
              </p>
            </div>

            <div className="p-5">
              <div className="mb-4 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl bg-[#F2EEE6]">
                {colors[0]?.images?.[0]?.preview ? (
                  <img
                    src={
                      colors[0].images.find((image) => image.isPrimary)
                        ?.preview || colors[0].images[0].preview
                    }
                    alt={formData.name}
                    className="h-full w-full object-contain object-center"
                  />
                ) : (
                  <Package size={45} className="text-stone-300" />
                )}
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#C55343]">
                {formData.frameShape || "FRAME SHAPE"}
              </p>

              <h3 className="mt-2 font-serif text-xl text-stone-900">
                {formData.name || "Product Name"}
              </h3>

              <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-500">
                {formData.description ||
                  "Product description will appear here."}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <span className="font-semibold text-stone-900">
                  ₹{formatPrice(pricing.sellingPrice)}
                </span>

                {Number(pricing.mrp) > Number(pricing.sellingPrice) && (
                  <span className="text-xs text-stone-400 line-through">
                    ₹{formatPrice(pricing.mrp)}
                  </span>
                )}
              </div>

              <div className="mt-5 border-t border-stone-100 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
                  Available Colours
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <div
                      key={color.localId}
                      title={color.colorName}
                      className="h-6 w-6 rounded-full border border-stone-300"
                      style={{ backgroundColor: color.colorCode }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* INVENTORY SUMMARY */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl text-stone-900">
              Inventory Summary
            </h2>

            <div className="mt-5 space-y-4">
              {[
                {
                  label: "Total Stock",
                  value: inventory.totalStock,
                },
                {
                  label: "Active Variants",
                  value: inventory.activeVariants,
                },
                {
                  label: "Colour Options",
                  value: inventory.colorCount,
                },
                {
                  label: "Product Images",
                  value: inventory.imageCount,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-stone-500">{item.label}</span>

                  <span className="text-sm font-semibold tabular-nums text-stone-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* STATUS SUMMARY */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h2 className="font-serif text-xl text-stone-900">
              Update Checklist
            </h2>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: "Product name",
                  valid: formData.name.trim().length >= 5,
                },
                {
                  label: "Product description",
                  valid: formData.description.trim().length >= 10,
                },
                {
                  label: "Category selected",
                  valid: Boolean(formData.category),
                },
                {
                  label: "Pricing entered",
                  valid:
                    Number(pricing.mrp) > 0 &&
                    Number(pricing.sellingPrice) > 0 &&
                    Number(pricing.sellingPrice) <= Number(pricing.mrp),
                },
                {
                  label: "Colour options",
                  valid: colors.length > 0,
                },
                {
                  label: "Product highlights",
                  valid: highlights.length > 0,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.valid ? (
                    <CheckCircle2 size={15} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={15} className="text-amber-500" />
                  )}

                  <span className="text-xs text-stone-600">{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => navigate("/admin/products")}
          className="rounded-full border border-stone-300 px-6 py-3 text-sm text-stone-600 transition hover:bg-stone-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-full bg-[#1C1917] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#3B342B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Check size={17} />
          )}

          {submitting ? "Saving Changes..." : "Save Product Changes"}
        </button>
      </div>
    </form>
  );
};

export default AdminProductEdit;
