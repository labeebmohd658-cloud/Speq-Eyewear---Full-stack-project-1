import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Package,
  ImagePlus,
  ChevronDown,
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
  Info,
  Tag,
  LoaderCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminApiRequest } from "../../../utils/adminApi";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const AVAILABLE_SIZES = ["S", "M", "L"];

const EMPTY_OPTIONS = {
  categories: [],
  collections: [],
  occasions: [],
};

const getResults = (data) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
};

const getApiError = (data) => {
  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, messages]) => {
      if (Array.isArray(messages)) {
        return `${field}: ${messages.join(", ")}`;
      }

      if (typeof messages === "object" && messages !== null) {
        return `${field}: ${JSON.stringify(messages)}`;
      }

      return `${field}: ${messages}`;
    })
    .join(" | ");
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

const AdminProductAdd = () => {
  const navigate = useNavigate();

  // ------------------------------------------
  // FORM STATE
  // ------------------------------------------

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

  // Product visibility is controlled by is_listed.
  // This is different from the backend's is_active field.
  const [productStatus, setProductStatus] = useState("active");

  // ------------------------------------------
  // API OPTIONS STATE
  // ------------------------------------------

  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  // ------------------------------------------
  // UI STATE
  // ------------------------------------------

  const [fieldErrors, setFieldErrors] = useState({});
  const [highlightErrors, setHighlightErrors] = useState({});
  const [colorErrors, setColorErrors] = useState({});
  const [variantErrors, setVariantErrors] = useState({});
  const [sectionErrors, setSectionErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ------------------------------------------
  // GENERAL HELPERS
  // ------------------------------------------

  const containsLetter = (value) => /\p{L}/u.test(value);

  const showToast = (type, message, details = []) => {
    setToast({
      id: Date.now(),
      type,
      message,
      details,
    });
  };

  const closeToast = () => setToast(null);

  const clearFieldError = (field) => {
    setFieldErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  // ------------------------------------------
  // LOAD CATEGORIES, COLLECTIONS AND OCCASIONS
  // ------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        setOptionsError("");

        const responses = await Promise.all([
          adminApiRequest("/admin/categories/"),
          adminApiRequest("/admin/collections/"),
          adminApiRequest("/admin/occasions/"),
        ]);

        const failedResponse = responses.find((response) => !response.ok);

        if (failedResponse) {
          const errorData = await readResponse(failedResponse);
          throw new Error(getApiError(errorData));
        }

        const [categoryData, collectionData, occasionData] = await Promise.all(
          responses.map(readResponse),
        );

        if (cancelled) return;

        setOptions({
          categories: getResults(categoryData).filter(
            (item) => item.is_active !== false,
          ),
          collections: getResults(collectionData).filter(
            (item) => item.is_active !== false,
          ),
          occasions: getResults(occasionData).filter(
            (item) => item.is_active !== false,
          ),
        });
      } catch (error) {
        if (!cancelled) {
          setOptionsError(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------
  // BASIC FIELD HANDLERS
  // ------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    clearFieldError(name);
  };

  const handleOccasionChange = (occasionId) => {
    setFormData((previous) => {
      const selected = previous.occasions.includes(occasionId);

      return {
        ...previous,
        occasions: selected
          ? previous.occasions.filter((item) => item !== occasionId)
          : [...previous.occasions, occasionId],
      };
    });

    clearFieldError("occasions");
  };

  // ------------------------------------------
  // PRICING
  // ------------------------------------------

  const handlePricingChange = (event) => {
    const { name, value } = event.target;

    setPricing((previous) => ({
      ...previous,
      [name]: value,
    }));

    clearFieldError(name);
  };

  const mrp = Number(pricing.mrp);
  const sellingPrice = Number(pricing.sellingPrice);

  const discountPercentage =
    pricing.mrp !== "" &&
    pricing.sellingPrice !== "" &&
    mrp > 0 &&
    sellingPrice > 0 &&
    sellingPrice <= mrp
      ? Math.round(((mrp - sellingPrice) / mrp) * 100)
      : 0;

  // ------------------------------------------
  // BASIC INFORMATION VALIDATION
  // ------------------------------------------

  const validateBasicInformation = () => {
    const errors = {};
    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name) {
      errors.name = "Product name is required.";
    } else if (name.length < 3) {
      errors.name = "Product name must contain at least 3 characters.";
    } else if (name.length > 100) {
      errors.name = "Product name cannot exceed 100 characters.";
    } else if (!/^[A-Za-z0-9 ]+$/.test(name)) {
      errors.name = "Only letters, numbers, and spaces are allowed.";
    } else if ((name.match(/[A-Za-z]/g) || []).length < 3) {
      errors.name = "Product name must contain at least 3 letters.";
    }

    if (!description) {
      errors.description = "Product description is required.";
    } else if (description.length < 10) {
      errors.description = "Description must contain at least 10 characters.";
    } else if (description.length > 1000) {
      errors.description = "Description cannot exceed 1000 characters.";
    }

    if (!formData.category) {
      errors.category = "Please select a product category.";
    }

    if (!formData.collection) {
      errors.collection = "Please select a collection.";
    }

    if (!formData.frameShape) {
      errors.frameShape = "Please select a frame shape.";
    }

    if (formData.occasions.length === 0) {
      errors.occasions = "Select at least one occasion.";
    }

    return errors;
  };

  // ------------------------------------------
  // PRICING VALIDATION
  // ------------------------------------------

  const validatePricing = () => {
    const errors = {};

    if (pricing.mrp === "") {
      errors.mrp = "MRP is required.";
    } else if (!Number.isFinite(mrp) || mrp <= 0) {
      errors.mrp = "MRP must be greater than zero.";
    }

    if (pricing.sellingPrice === "") {
      errors.sellingPrice = "Selling price is required.";
    } else if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      errors.sellingPrice = "Selling price must be greater than zero.";
    }

    if (
      pricing.mrp !== "" &&
      pricing.sellingPrice !== "" &&
      Number.isFinite(mrp) &&
      Number.isFinite(sellingPrice) &&
      sellingPrice > mrp
    ) {
      errors.sellingPrice = "Selling price cannot be greater than MRP.";
    }

    return errors;
  };

  // ------------------------------------------
  // HIGHLIGHT VALIDATION
  // ------------------------------------------

  const validateSingleHighlight = (value) => {
    const title = value.trim();

    if (!title) return "Highlight title is required.";
    if (title.length < 5)
      return "Highlight must contain at least 5 characters.";
    if (!containsLetter(title))
      return "Highlight must contain at least one letter.";
    if (title.length > 80) return "Highlight cannot exceed 80 characters.";

    return "";
  };

  const validateHighlights = () => {
    const errors = {};
    const usedTitles = new Set();

    highlights.forEach((highlight) => {
      const title = highlight.title.trim();
      const normalizedTitle = title.toLowerCase();
      const error = validateSingleHighlight(title);

      if (error) {
        errors[highlight.id] = error;
      } else if (usedTitles.has(normalizedTitle)) {
        errors[highlight.id] = "Duplicate highlights are not allowed.";
      }

      usedTitles.add(normalizedTitle);
    });

    return errors;
  };

  // ------------------------------------------
  // COLOUR AND IMAGE VALIDATION
  // ------------------------------------------

  const validateProductImages = () => {
    const errors = {};
    const generalErrors = [];
    const usedColorNames = new Set();

    if (colors.length === 0) {
      generalErrors.push("Add at least one product colour.");
    }

    colors.forEach((color, index) => {
      const messages = [];
      const colorName = color.colorName.trim();
      const normalizedName = colorName.toLowerCase();

      if (!colorName) {
        messages.push("Colour name is required.");
      } else if (colorName.length < 2) {
        messages.push("Colour name must contain at least 2 characters.");
      } else if (!/^[A-Za-z]+$/.test(colorName)) {
        messages.push("Colour name can contain only letters.");
      }

      if (normalizedName && usedColorNames.has(normalizedName)) {
        messages.push("Duplicate colour names are not allowed.");
      }

      if (normalizedName) {
        usedColorNames.add(normalizedName);
      }

      if (!/^#[0-9A-Fa-f]{6}$/.test(color.colorCode)) {
        messages.push("Enter a valid HEX colour code.");
      }

      if (color.images.length < 3) {
        messages.push(`Colour ${index + 1}: Upload at least 3 product images.`);
      } else if (color.images.length > 4) {
        errors.push(
          `Colour ${colorNumber}: You can upload a maximum of 4 product images.`,
        );
      }

      const primaryCount = color.images.filter(
        (image) => image.isPrimary,
      ).length;

      if (primaryCount !== 1) {
        messages.push("Select exactly one primary image.");
      }

      if (messages.length > 0) {
        errors[color.id] = {
          colorName: colorName || `Colour ${index + 1}`,
          messages,
        };
      }
    });

    return { errors, generalErrors };
  };

  // ------------------------------------------
  // VARIANT VALIDATION
  // ------------------------------------------

  const validateVariants = () => {
    const errors = {};
    const generalErrors = [];

    if (colors.length === 0) {
      generalErrors.push("Add a colour before creating variants.");
      return { errors, generalErrors };
    }

    colors.forEach((color, index) => {
      const messages = [];
      const label = color.colorName.trim() || `Colour ${index + 1}`;

      if (color.variants.length === 0) {
        messages.push("Add at least one variant for this colour.");
      }

      const activeVariants = color.variants.filter(
        (variant) => variant.isActive,
      );

      if (activeVariants.length === 0) {
        messages.push("At least one variant must be Active.");
      }

      const usedSizes = new Set();

      color.variants.forEach((variant, variantIndex) => {
        const variantLabel = `Variant ${variantIndex + 1}`;

        if (!AVAILABLE_SIZES.includes(variant.size)) {
          messages.push(`${variantLabel}: Select a valid size.`);
        }

        if (usedSizes.has(variant.size)) {
          messages.push(`${variantLabel}: Size ${variant.size} is duplicated.`);
        }

        usedSizes.add(variant.size);

        const stock = variant.stockQuantity;

        if (
          stock === "" ||
          stock === null ||
          stock === undefined ||
          !Number.isInteger(Number(stock)) ||
          Number(stock) < 0
        ) {
          messages.push(
            `${variantLabel}: Stock must be a whole number of 0 or more.`,
          );
        }
      });

      if (messages.length > 0) {
        errors[color.id] = {
          colorName: label,
          messages,
        };
      }
    });

    return { errors, generalErrors };
  };

  // ------------------------------------------
  // SECTION ERROR SUMMARY
  // ------------------------------------------

  const buildSectionErrors = ({
    basicErrors,
    pricingErrors,
    imageResult,
    variantResult,
    currentHighlightErrors,
  }) => {
    const sections = {};

    const basicLabels = {
      name: "Product Name",
      description: "Product Description",
      category: "Category",
      collection: "Collection",
      frameShape: "Frame Shape",
      occasions: "Occasions",
    };

    if (Object.keys(basicErrors).length > 0) {
      sections["Basic Information"] = Object.entries(basicErrors).map(
        ([field, message]) => `${basicLabels[field] || field}: ${message}`,
      );
    }

    if (Object.keys(pricingErrors).length > 0) {
      sections.Pricing = Object.entries(pricingErrors).map(
        ([field, message]) => `${field}: ${message}`,
      );
    }

    if (
      Object.keys(imageResult.errors).length > 0 ||
      imageResult.generalErrors.length > 0
    ) {
      const messages = [...imageResult.generalErrors];

      Object.values(imageResult.errors).forEach((item) => {
        item.messages.forEach((message) => {
          messages.push(`${item.colorName}: ${message}`);
        });
      });

      sections["Colours & Product Images"] = messages;
    }

    if (
      Object.keys(variantResult.errors).length > 0 ||
      variantResult.generalErrors.length > 0
    ) {
      const messages = [...variantResult.generalErrors];

      Object.values(variantResult.errors).forEach((item) => {
        item.messages.forEach((message) => {
          messages.push(`${item.colorName}: ${message}`);
        });
      });

      sections["Variants & Stock"] = messages;
    }

    if (Object.keys(currentHighlightErrors).length > 0) {
      sections["Product Highlights"] = highlights
        .filter((item) => currentHighlightErrors[item.id])
        .map((item, index) => {
          return `Highlight ${index + 1}: ${currentHighlightErrors[item.id]}`;
        });
    }

    return sections;
  };

  // ------------------------------------------
  // VALIDATE THE COMPLETE FORM
  // ------------------------------------------

  const validateForm = () => {
    const basicErrors = validateBasicInformation();
    const pricingErrors = validatePricing();
    const currentHighlightErrors = validateHighlights();
    const imageResult = validateProductImages();
    const variantResult = validateVariants();

    setFieldErrors({
      ...basicErrors,
      ...pricingErrors,
    });

    setHighlightErrors(currentHighlightErrors);
    setColorErrors(imageResult.errors);
    setVariantErrors(variantResult.errors);

    const sections = buildSectionErrors({
      basicErrors,
      pricingErrors,
      imageResult,
      variantResult,
      currentHighlightErrors,
    });

    setSectionErrors(sections);

    const totalIssues = Object.values(sections).reduce(
      (total, messages) => total + messages.length,
      0,
    );

    if (totalIssues > 0) {
      showToast(
        "error",
        `${totalIssues} validation issue(s) found. Check the affected sections.`,
        Object.keys(sections),
      );

      return false;
    }

    return true;
  };

  // ------------------------------------------
  // COLOUR HANDLERS
  // ------------------------------------------

  const addColor = () => {
    setColors((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random()}`,
        colorName: "",
        colorCode: "#000000",
        images: [],
        variants: [],
      },
    ]);

    setSectionErrors({});
  };

  const updateColor = (colorId, field, value) => {
    setColors((previous) =>
      previous.map((color) =>
        color.id === colorId ? { ...color, [field]: value } : color,
      ),
    );

    setColorErrors((previous) => {
      const updated = { ...previous };
      delete updated[colorId];
      return updated;
    });
  };

  const removeColor = (colorId) => {
    const selected = colors.find((color) => color.id === colorId);

    selected?.images.forEach((image) => {
      URL.revokeObjectURL(image.preview);
    });

    setColors((previous) => previous.filter((color) => color.id !== colorId));

    setColorErrors((previous) => {
      const updated = { ...previous };
      delete updated[colorId];
      return updated;
    });

    setVariantErrors((previous) => {
      const updated = { ...previous };
      delete updated[colorId];
      return updated;
    });
  };

  // ------------------------------------------
  // VARIANT HANDLERS
  // ------------------------------------------

  const addVariant = (colorId) => {
    const selectedColor = colors.find((color) => color.id === colorId);

    if (!selectedColor) return;

    const usedSizes = selectedColor.variants.map((variant) => variant.size);

    const nextSize = AVAILABLE_SIZES.find((size) => !usedSizes.includes(size));

    if (!nextSize) {
      showToast("error", "All available sizes (S, M, L) have been added.");
      return;
    }

    setColors((previous) =>
      previous.map((color) =>
        color.id === colorId
          ? {
              ...color,
              variants: [
                ...color.variants,
                {
                  id: `${Date.now()}-${Math.random()}`,
                  size: nextSize,
                  stockQuantity: 0,
                  isActive: true,
                },
              ],
            }
          : color,
      ),
    );

    setVariantErrors((previous) => {
      const updated = { ...previous };
      delete updated[colorId];
      return updated;
    });
  };

  const updateVariant = (colorId, variantId, field, value) => {
    setColors((previous) =>
      previous.map((color) =>
        color.id === colorId
          ? {
              ...color,
              variants: color.variants.map((variant) =>
                variant.id === variantId
                  ? { ...variant, [field]: value }
                  : variant,
              ),
            }
          : color,
      ),
    );

    setVariantErrors((previous) => {
      const updated = { ...previous };
      delete updated[colorId];
      return updated;
    });
  };

  const removeVariant = (colorId, variantId) => {
    setColors((previous) =>
      previous.map((color) =>
        color.id === colorId
          ? {
              ...color,
              variants: color.variants.filter(
                (variant) => variant.id !== variantId,
              ),
            }
          : color,
      ),
    );
  };

  // ------------------------------------------
  // HIGHLIGHT HANDLERS
  // ------------------------------------------

  const addHighlight = () => {
    const invalidHighlight = highlights.find((highlight) =>
      validateSingleHighlight(highlight.title),
    );

    if (invalidHighlight) {
      setHighlightErrors((previous) => ({
        ...previous,
        [invalidHighlight.id]: validateSingleHighlight(invalidHighlight.title),
      }));

      showToast(
        "error",
        "Complete the existing highlight correctly before adding another.",
      );

      return;
    }

    setHighlights((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random()}`,
        title: "",
        display_order: previous.length + 1,
      },
    ]);
  };

  const updateHighlight = (highlightId, field, value) => {
    setHighlights((previous) =>
      previous.map((highlight) =>
        highlight.id === highlightId
          ? { ...highlight, [field]: value }
          : highlight,
      ),
    );

    setHighlightErrors((previous) => ({
      ...previous,
      [highlightId]: "",
    }));
  };

  const removeHighlight = (highlightId) => {
    setHighlights((previous) =>
      previous
        .filter((item) => item.id !== highlightId)
        .map((item, index) => ({
          ...item,
          display_order: index + 1,
        })),
    );

    setHighlightErrors((previous) => {
      const updated = { ...previous };
      delete updated[highlightId];
      return updated;
    });
  };

  const moveHighlight = (index, direction) => {
    setHighlights((previous) => {
      const updated = [...previous];
      const newIndex = index + direction;

      if (newIndex < 0 || newIndex >= updated.length) return previous;

      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

      return updated.map((item, position) => ({
        ...item,
        display_order: position + 1,
      }));
    });
  };

  // ------------------------------------------
  // IMAGE HANDLERS
  // ------------------------------------------

  const handleImageUpload = (colorId, event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    const currentColor = colors.find((color) => color.id === colorId);

    if (!currentColor) return;

    const remainingSlots = 4 - currentColor.images.length;

    if (remainingSlots <= 0) {
      showToast(
        "error",
        "Maximum 4 images allowed per colour. Remove an existing image to upload another.",
      );

      event.target.value = "";
      return;
    }

    const validFiles = [];
    const rejectedFiles = [];

    selectedFiles.forEach((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        rejectedFiles.push(`${file.name}: Unsupported image format.`);
      } else if (file.size > MAX_FILE_SIZE) {
        rejectedFiles.push(`${file.name}: File exceeds 5 MB.`);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > remainingSlots) {
      showToast(
        "error",
        `Only ${remainingSlots} more image(s) can be uploaded. Maximum is 4 per colour.`,
      );
    } else if (rejectedFiles.length > 0) {
      showToast("error", rejectedFiles.join(" "));
    }

    const newImages = validFiles.slice(0, remainingSlots).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      isPrimary: false,
    }));

    if (newImages.length > 0) {
      setColors((previous) =>
        previous.map((color) => {
          if (color.id !== colorId) return color;

          const images = [...color.images, ...newImages];

          if (!images.some((image) => image.isPrimary)) {
            images[0] = {
              ...images[0],
              isPrimary: true,
            };
          }

          return { ...color, images };
        }),
      );
    }

    event.target.value = "";
  };

  const setPrimaryImage = (colorId, imageId) => {
    setColors((previous) =>
      previous.map((color) =>
        color.id === colorId
          ? {
              ...color,
              images: color.images.map((image) => ({
                ...image,
                isPrimary: image.id === imageId,
              })),
            }
          : color,
      ),
    );
  };

  const removeImage = (colorId, imageId) => {
    setColors((previous) =>
      previous.map((color) => {
        if (color.id !== colorId) return color;

        const removed = color.images.find((image) => image.id === imageId);

        if (removed) URL.revokeObjectURL(removed.preview);

        let remaining = color.images.filter((image) => image.id !== imageId);

        if (removed?.isPrimary && remaining.length > 0) {
          remaining = remaining.map((image, index) => ({
            ...image,
            isPrimary: index === 0,
          }));
        }

        return { ...color, images: remaining };
      }),
    );
  };

  // ------------------------------------------
  // INVENTORY CALCULATIONS
  // ------------------------------------------

  const getColorStock = (color) =>
    color.variants.reduce(
      (total, variant) =>
        total + (variant.isActive ? Number(variant.stockQuantity) || 0 : 0),
      0,
    );

  const totalProductStock = useMemo(
    () => colors.reduce((total, color) => total + getColorStock(color), 0),
    [colors],
  );

  const totalVariants = useMemo(
    () => colors.reduce((total, color) => total + color.variants.length, 0),
    [colors],
  );

  // ------------------------------------------
  // BUILD BACKEND PAYLOAD
  // ------------------------------------------

  const buildProductPayload = () => ({
    name: formData.name.trim(),
    description: formData.description.trim(),

    base_price: Number(pricing.mrp),
    selling_price: Number(pricing.sellingPrice),

    category: Number(formData.category),
    collection: Number(formData.collection),
    occasions: formData.occasions.map(Number),

    frame_shape: formData.frameShape,

    colors: colors.map((color) => ({
      color_name: color.colorName.trim(),
      color_code: color.colorCode,

      variants: color.variants.map((variant) => ({
        size: variant.size,
        stock_quantity: Number(variant.stockQuantity),
        is_active: variant.isActive,
      })),
    })),

    highlights: highlights
      .filter((highlight) => highlight.title.trim())
      .map((highlight, index) => ({
        title: highlight.title.trim(),
        display_order: index + 1,
      })),
  });

  // ------------------------------------------
  // CREATE PRODUCT
  // ------------------------------------------

  const createProduct = async () => {
    const response = await adminApiRequest("/admin/products/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildProductPayload()),
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(getApiError(data));
    }

    if (!data.id) {
      throw new Error(
        "The API response did not include the newly created product ID.",
      );
    }

    return data;
  };

  // ------------------------------------------
  // GET CREATED PRODUCT DETAILS
  // ------------------------------------------

  const fetchCreatedProduct = async (productId) => {
    const response = await adminApiRequest(`/admin/products/${productId}/`);

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(getApiError(data));
    }

    return data;
  };

  // ------------------------------------------
  // UPLOAD PRODUCT IMAGES
  // ------------------------------------------

  const uploadProductImages = async (productData) => {
    const backendColors = productData.colors || [];

    if (backendColors.length !== colors.length) {
      throw new Error(
        "Could not match the created product colours with the uploaded images.",
      );
    }

    // Match colours by name rather than assuming both arrays
    // will always have the same order.
    const backendColorMap = new Map(
      backendColors.map((color) => [
        String(color.color_name || "")
          .trim()
          .toLowerCase(),
        color,
      ]),
    );

    for (const frontendColor of colors) {
      const backendColor = backendColorMap.get(
        frontendColor.colorName.trim().toLowerCase(),
      );

      if (!backendColor?.id) {
        throw new Error(
          `Could not find the database ID for colour ${frontendColor.colorName}.`,
        );
      }

      for (
        let imageIndex = 0;
        imageIndex < frontendColor.images.length;
        imageIndex++
      ) {
        const image = frontendColor.images[imageIndex];
        const uploadData = new FormData();

        uploadData.append("product_color", backendColor.id);
        uploadData.append("image", image.file);
        uploadData.append("image_order", imageIndex);
        uploadData.append("is_primary", image.isPrimary ? "true" : "false");

        const response = await adminApiRequest(
          "/admin/products/images/upload/",
          {
            method: "POST",
            // Do not set Content-Type manually for FormData.
            body: uploadData,
          },
        );

        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(
            `Image upload failed for ${frontendColor.colorName}: ${getApiError(data)}`,
          );
        }
      }
    }
  };

  // ------------------------------------------
  // PUBLISH PRODUCT
  // ------------------------------------------

  const publishProduct = async (productId) => {
    const response = await adminApiRequest(
      `/admin/products/${productId}/publish/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_listed: true,
        }),
      },
    );

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(getApiError(data));
    }

    return data;
  };

  // ------------------------------------------
  // BEST-EFFORT CLEANUP
  // ------------------------------------------

  const archiveFailedProduct = async (productId) => {
    try {
      const response = await adminApiRequest(
        `/admin/products/${productId}/delete/`,
        {
          method: "DELETE",
        },
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  // ------------------------------------------
  // CREATE PRODUCT
  // ------------------------------------------

  const handleCreateProduct = async () => {
    if (submitting) return;

    // Both Active and Inactive products must pass
    // the same complete validation.
    if (!validateForm()) return;

    let createdProductId = null;

    try {
      setSubmitting(true);

      showToast("info", "Creating your product...");

      // Step 1: Create product and nested database records.
      const createdProduct = await createProduct();
      createdProductId = createdProduct.id;

      // Step 2: Fetch backend colour IDs.
      const productDetails = await fetchCreatedProduct(createdProductId);

      // Step 3: Upload all selected images.
      await uploadProductImages(productDetails);

      // Step 4: Publish only if the admin selected Active.
      if (productStatus === "active") {
        await publishProduct(createdProductId);
      }

      // Inactive products remain hidden because the create
      // serializer initially creates them with is_listed=False.
      showToast(
        "success",
        productStatus === "active"
          ? "Product created and published successfully."
          : "Product created successfully and saved as Inactive.",
      );

      setTimeout(() => {
        navigate("/admin/products");
      }, 1200);
    } catch (error) {
      let cleanupMessage = "";

      // If the product was already created but a later step failed,
      // try to archive it using the existing soft-delete endpoint.
      if (createdProductId) {
        const archived = await archiveFailedProduct(createdProductId);

        cleanupMessage = archived
          ? " The incomplete product was archived using the existing soft-delete endpoint."
          : " Automatic cleanup failed. Check the product in the admin list and archive it manually if necessary.";
      }

      showToast("error", `${error.message}${cleanupMessage}`, [
        "The product was not successfully completed.",
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------
  // COMMON UI HELPERS
  // ------------------------------------------

  const inputClass = (field) =>
    `w-full rounded-xl border ${
      fieldErrors[field]
        ? "border-rose-400 bg-rose-50"
        : "border-stone-200 bg-stone-50"
    } px-4 py-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#C55343] focus:bg-white`;

  const FieldError = ({ name }) =>
    fieldErrors[name] ? (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
        <AlertCircle size={13} />
        {fieldErrors[name]}
      </p>
    ) : null;

  const SectionError = ({ title }) => {
    const messages = sectionErrors[title];

    if (!messages?.length) return null;

    return (
      <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-rose-700">
          <AlertCircle size={15} />
          {title} - Validation Errors
        </p>

        <ul className="space-y-1.5">
          {messages.map((message, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-xs leading-5 text-rose-600"
            >
              <span className="mt-1">•</span>
              {message}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // ------------------------------------------
  // RENDER
  // ------------------------------------------

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      {/* TOAST */}

      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed right-5 top-5 z-[100] flex w-[calc(100%-40px)] max-w-md items-start gap-3 rounded-xl border bg-white p-4 shadow-xl ${
            toast.type === "error"
              ? "border-rose-200"
              : toast.type === "success"
                ? "border-emerald-200"
                : "border-stone-200"
          }`}
        >
          <div
            className={`mt-0.5 shrink-0 ${
              toast.type === "error"
                ? "text-rose-600"
                : toast.type === "success"
                  ? "text-emerald-600"
                  : "text-blue-600"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle size={20} />
            ) : toast.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-800">
              {toast.type === "error"
                ? "Error"
                : toast.type === "success"
                  ? "Success"
                  : "Information"}
            </p>

            <p className="mt-1 break-words text-xs leading-5 text-stone-600">
              {toast.message}
            </p>

            {toast.details?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {toast.details.map((detail) => (
                  <li
                    key={detail}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-700"
                  >
                    <AlertCircle size={12} />
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={closeToast}
            aria-label="Close notification"
            className="shrink-0 rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* PAGE HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            className="mb-4 flex items-center gap-2 text-xs font-medium text-stone-500 transition hover:text-[#C55343]"
          >
            <ArrowLeft size={15} />
            Back to Products
          </button>

          <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-[#C55343]">
            ATELIER CATALOG MANAGEMENT
          </p>

          <h1 className="font-serif text-4xl text-stone-900">
            Add New Product
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Create a complete product for your eyewear collection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => navigate("/admin/products")}
            className="rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting || loadingOptions || !!optionsError}
            onClick={handleCreateProduct}
            className="flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {submitting
              ? "Processing..."
              : productStatus === "active"
                ? "Create & Publish"
                : "Create Inactive Product"}
          </button>
        </div>
      </div>

      {/* LOADING AND OPTIONS ERROR */}

      {loadingOptions && (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          <LoaderCircle size={18} className="animate-spin" />
          Loading categories, collections and occasions...
        </div>
      )}

      {optionsError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load product options.</p>
            <p className="mt-1 text-xs">{optionsError}</p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* BASIC INFORMATION */}

          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EEE5] text-[#806B4C]">
                <Package size={19} />
              </div>

              <div>
                <h2 className="font-serif text-xl text-stone-900">
                  Basic Information
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Add the essential details of your product.
                </p>
              </div>
            </div>

            <SectionError title="Basic Information" />

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Product Name <span className="text-[#C55343]">*</span>
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Heritage Round"
                  className={inputClass("name")}
                />

                <FieldError name="name" />

                <p className="mt-2 text-right text-[11px] text-stone-400">
                  {formData.name.length}/100 characters
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Product Description <span className="text-[#C55343]">*</span>
                </label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  maxLength={1000}
                  placeholder="Describe the design, materials, comfort and unique features..."
                  className={`${inputClass("description")} resize-y`}
                />

                <FieldError name="description" />

                <p className="mt-2 text-right text-[11px] text-stone-400">
                  {formData.description.length}/1000 characters
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-stone-700">
                    Category <span className="text-[#C55343]">*</span>
                  </label>

                  <div className="relative">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      disabled={loadingOptions}
                      className={`${inputClass("category")} appearance-none pr-10`}
                    >
                      <option value="">Select category</option>
                      {options.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                  </div>

                  <FieldError name="category" />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-stone-700">
                    Collection <span className="text-[#C55343]">*</span>
                  </label>

                  <div className="relative">
                    <select
                      name="collection"
                      value={formData.collection}
                      onChange={handleChange}
                      disabled={loadingOptions}
                      className={`${inputClass("collection")} appearance-none pr-10`}
                    >
                      <option value="">Select collection</option>
                      {options.collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                  </div>

                  <FieldError name="collection" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Frame Shape <span className="text-[#C55343]">*</span>
                </label>

                <div className="relative">
                  <select
                    name="frameShape"
                    value={formData.frameShape}
                    onChange={handleChange}
                    className={`${inputClass("frameShape")} appearance-none pr-10`}
                  >
                    <option value="">Select frame shape</option>
                    <option value="rectangle">Rectangle</option>
                    <option value="round">Round</option>
                    <option value="aviator">Aviator</option>
                    <option value="geometric">Geometric</option>
                    <option value="square">Square</option>
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                </div>

                <FieldError name="frameShape" />
              </div>

              <div>
                <label className="mb-3 block text-xs font-semibold text-stone-700">
                  Occasions <span className="text-[#C55343]">*</span>
                </label>

                <div className="flex flex-wrap gap-2">
                  {options.occasions.map((occasion) => {
                    const selected = formData.occasions.includes(
                      String(occasion.id),
                    );

                    return (
                      <button
                        key={occasion.id}
                        type="button"
                        onClick={() =>
                          handleOccasionChange(String(occasion.id))
                        }
                        className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
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

                <FieldError name="occasions" />
              </div>
            </div>
          </section>

          {/* PRICING */}

          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EEE5] text-[#806B4C]">
                <Tag size={19} />
              </div>

              <div>
                <h2 className="font-serif text-xl text-stone-900">Pricing</h2>
                <p className="mt-1 text-xs text-stone-500">
                  Set the product price.
                </p>
              </div>
            </div>

            <SectionError title="Pricing" />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  MRP (₹) <span className="text-[#C55343]">*</span>
                </label>

                <input
                  type="number"
                  name="mrp"
                  min="0"
                  step="0.01"
                  value={pricing.mrp}
                  onChange={handlePricingChange}
                  placeholder="e.g. 3999"
                  className={inputClass("mrp")}
                />

                <FieldError name="mrp" />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-stone-700">
                  Selling Price (₹) <span className="text-[#C55343]">*</span>
                </label>

                <input
                  type="number"
                  name="sellingPrice"
                  min="0"
                  step="0.01"
                  value={pricing.sellingPrice}
                  onChange={handlePricingChange}
                  placeholder="e.g. 2499"
                  className={inputClass("sellingPrice")}
                />

                <FieldError name="sellingPrice" />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Discount Preview
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-lg font-semibold text-stone-900">
                  {pricing.sellingPrice !== "" && sellingPrice > 0
                    ? `₹${sellingPrice.toLocaleString("en-IN")}`
                    : "Selling price"}
                </span>

                {pricing.mrp !== "" && mrp > 0 && (
                  <span className="text-sm text-stone-400 line-through">
                    ₹{mrp.toLocaleString("en-IN")}
                  </span>
                )}

                {discountPercentage > 0 && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {discountPercentage}% OFF
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* PRODUCT STATUS */}

          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EEE5] text-[#806B4C]">
                <Eye size={19} />
              </div>

              <div>
                <h2 className="font-serif text-xl text-stone-900">
                  Store Visibility
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Choose whether customers can see this product.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setProductStatus("active")}
                className={`rounded-xl border p-4 text-left transition ${
                  productStatus === "active"
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-800">
                    Active
                  </span>
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  Publish this product and make it visible in the store.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setProductStatus("inactive")}
                className={`rounded-xl border p-4 text-left transition ${
                  productStatus === "inactive"
                    ? "border-amber-300 bg-amber-50"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-800">
                    Inactive
                  </span>
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  Save the complete product but keep it hidden from customers.
                </p>
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-stone-500">
              Both statuses require complete product information, images and
              active variants. Inactive does not mean incomplete.
            </p>
          </section>

          {/* COLOURS AND PRODUCT IMAGES */}

          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EEE5] text-[#806B4C]">
                  <ImagePlus size={19} />
                </div>

                <div>
                  <h2 className="font-serif text-xl text-stone-900">
                    Colours & Product Images
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Add at least 3 images for every colour.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addColor}
                className="flex items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-white transition hover:bg-[#3B342B]"
              >
                <Plus size={15} />
                Add Colour
              </button>
            </div>

            <SectionError title="Colours & Product Images" />

            {colors.length === 0 && (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-5 py-12 text-center">
                <ImagePlus size={30} className="mx-auto mb-3 text-stone-400" />
                <p className="text-sm font-medium text-stone-700">
                  No colours added yet
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  Add a colour to start uploading product images.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {colors.map((color, index) => (
                <div
                  key={color.id}
                  className="rounded-xl border border-stone-200 p-5"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-600">
                        {index + 1}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-stone-800">
                          {color.colorName || `Colour Option ${index + 1}`}
                        </h3>
                        <p className="mt-1 text-[11px] text-stone-400">
                          {color.images.length} images selected
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeColor(color.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-stone-700">
                        Colour Name *
                      </label>

                      <input
                        type="text"
                        value={color.colorName}
                        onChange={(event) =>
                          updateColor(color.id, "colorName", event.target.value)
                        }
                        placeholder="e.g. Matte Black"
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#C55343] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-stone-700">
                        Colour Code *
                      </label>

                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={
                            /^#[0-9A-Fa-f]{6}$/.test(color.colorCode)
                              ? color.colorCode
                              : "#000000"
                          }
                          onChange={(event) =>
                            updateColor(
                              color.id,
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
                              color.id,
                              "colorCode",
                              event.target.value,
                            )
                          }
                          placeholder="#000000"
                          className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm uppercase outline-none focus:border-[#C55343]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="mb-3 block text-xs font-semibold text-stone-700">
                      Product Images
                    </label>

                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-8 text-center transition hover:border-[#C55343] hover:bg-[#FCF8F4]">
                      <Upload size={23} className="mb-3 text-stone-400" />
                      <p className="text-sm font-medium text-stone-700">
                        Click to select images
                      </p>
                      <p className="mt-1 text-xs text-stone-400">
                        PNG, JPG or WEBP · Maximum 5 MB per image
                      </p>

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={(event) => handleImageUpload(color.id, event)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {colorErrors[color.id] && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                      <p className="mb-2 text-xs font-semibold text-rose-700">
                        {colorErrors[color.id].colorName}
                      </p>

                      <ul className="space-y-1">
                        {colorErrors[color.id].messages.map(
                          (message, messageIndex) => (
                            <li
                              key={messageIndex}
                              className="flex items-start gap-2 text-xs text-rose-600"
                            >
                              <AlertCircle
                                size={13}
                                className="mt-0.5 shrink-0"
                              />
                              {message}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {color.images.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {color.images.map((image) => (
                        <div key={image.id} className="group">
                          <div className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                            <img
                              src={image.preview}
                              alt={`${color.colorName || "Product"} preview`}
                              className="h-full w-full object-cover"
                            />

                            {image.isPrimary && (
                              <span className="absolute left-2 top-2 rounded-full bg-[#1C1917] px-2.5 py-1 text-[10px] font-medium text-white">
                                Primary
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => removeImage(color.id, image.id)}
                              aria-label="Remove image"
                              className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-rose-600 shadow-sm transition hover:bg-white"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={image.isPrimary}
                            onClick={() => setPrimaryImage(color.id, image.id)}
                            className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition ${
                              image.isPrimary
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                            }`}
                          >
                            <Check size={13} />
                            {image.isPrimary
                              ? "Primary Image"
                              : "Set as Primary"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* VARIANTS AND STOCK */}

          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EEE5] text-[#806B4C]">
                  <Package size={19} />
                </div>

                <div>
                  <h2 className="font-serif text-xl text-stone-900">
                    Variants & Stock
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Every colour needs at least one active variant.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Total Available Stock
                </p>
                <p className="mt-1 font-serif text-2xl text-stone-900">
                  {totalProductStock}
                  <span className="ml-1 text-xs font-sans text-stone-400">
                    units
                  </span>
                </p>
              </div>
            </div>

            <SectionError title="Variants & Stock" />

            {colors.length === 0 && (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                <Package size={28} className="mx-auto mb-3 text-stone-400" />
                <p className="text-sm font-medium text-stone-700">
                  Add a colour first
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  Variants must belong to a product colour.
                </p>
              </div>
            )}

            <div className="space-y-5">
              {colors.map((color, index) => (
                <div
                  key={color.id}
                  className="overflow-hidden rounded-xl border border-stone-200"
                >
                  <div className="flex flex-col justify-between gap-3 bg-stone-50 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full border border-stone-300"
                        style={{ backgroundColor: color.colorCode }}
                      />

                      <div>
                        <p className="text-sm font-semibold text-stone-800">
                          {color.colorName || `Colour Option ${index + 1}`}
                        </p>
                        <p className="mt-1 text-[11px] text-stone-400">
                          {color.variants.length} variants
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-stone-400">
                          Total stock
                        </p>
                        <p className="text-sm font-semibold text-stone-800">
                          {getColorStock(color)} units
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => addVariant(color.id)}
                        disabled={color.variants.length >= 3}
                        className="flex items-center gap-2 rounded-full bg-[#1C1917] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#3B342B] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={14} />
                        Add Variant
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    {variantErrors[color.id] && (
                      <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <p className="mb-2 text-xs font-semibold text-rose-700">
                          {variantErrors[color.id].colorName}
                        </p>

                        <ul className="space-y-1">
                          {variantErrors[color.id].messages.map(
                            (message, messageIndex) => (
                              <li
                                key={messageIndex}
                                className="flex items-start gap-2 text-xs text-rose-600"
                              >
                                <AlertCircle
                                  size={13}
                                  className="mt-0.5 shrink-0"
                                />
                                {message}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {color.variants.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-xs text-stone-400">
                          No variants added for this colour.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {color.variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="rounded-xl border border-stone-200 p-4"
                          >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <label className="mb-2 block text-[11px] font-semibold text-stone-600">
                                  Size
                                </label>

                                <select
                                  value={variant.size}
                                  onChange={(event) =>
                                    updateVariant(
                                      color.id,
                                      variant.id,
                                      "size",
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-[#C55343]"
                                >
                                  {AVAILABLE_SIZES.map((size) => (
                                    <option
                                      key={size}
                                      value={size}
                                      disabled={color.variants.some(
                                        (item) =>
                                          item.size === size &&
                                          item.id !== variant.id,
                                      )}
                                    >
                                      {size}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-2 block text-[11px] font-semibold text-stone-600">
                                  Stock Quantity
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={variant.stockQuantity}
                                  onChange={(event) => {
                                    const value = event.target.value;

                                    if (value === "" || /^\d+$/.test(value)) {
                                      updateVariant(
                                        color.id,
                                        variant.id,
                                        "stockQuantity",
                                        value,
                                      );
                                    }
                                  }}
                                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-[#C55343]"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-[11px] font-semibold text-stone-600">
                                  Status
                                </label>

                                <button
                                  type="button"
                                  onClick={() =>
                                    updateVariant(
                                      color.id,
                                      variant.id,
                                      "isActive",
                                      !variant.isActive,
                                    )
                                  }
                                  className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${
                                    variant.isActive
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-stone-200 bg-stone-100 text-stone-500"
                                  }`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      variant.isActive
                                        ? "bg-emerald-500"
                                        : "bg-stone-400"
                                    }`}
                                  />
                                  {variant.isActive ? "Active" : "Inactive"}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                              <p className="text-[11px] text-stone-400">
                                {Number(variant.stockQuantity) === 0
                                  ? "No stock available"
                                  : `${variant.stockQuantity} units available`}
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  removeVariant(color.id, variant.id)
                                }
                                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-rose-600 transition hover:bg-rose-50"
                              >
                                <Trash2 size={13} />
                                Remove Variant
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {color.variants.length >= 3 && (
                      <p className="mt-3 text-[11px] text-stone-400">
                        All available sizes (S, M, L) have been added.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PRODUCT HIGHLIGHTS */}

          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EEE5] text-[#806B4C]">
                  <Check size={19} />
                </div>

                <div>
                  <h2 className="font-serif text-xl text-stone-900">
                    Product Highlights
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Add the key features and benefits of this product.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addHighlight}
                className="flex items-center justify-center gap-2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-medium text-white transition hover:bg-[#3B342B]"
              >
                <Plus size={15} />
                Add Highlight
              </button>
            </div>

            <SectionError title="Product Highlights" />

            {highlights.length === 0 && (
              <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-5 py-10 text-center">
                <Check size={28} className="mx-auto mb-3 text-stone-400" />
                <p className="text-sm font-medium text-stone-700">
                  No highlights added
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  Add features such as lightweight frame or premium finish.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div
                  key={highlight.id}
                  className="flex flex-col gap-3 rounded-xl border border-stone-200 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3EEE5] text-xs font-semibold text-[#806B4C]">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <label className="mb-2 block text-[11px] font-semibold text-stone-600">
                      Highlight
                    </label>

                    <input
                      type="text"
                      value={highlight.title}
                      maxLength={80}
                      onChange={(event) =>
                        updateHighlight(
                          highlight.id,
                          "title",
                          event.target.value,
                        )
                      }
                      placeholder="e.g. Lightweight premium frame"
                      className={`w-full rounded-lg border ${
                        highlightErrors[highlight.id]
                          ? "border-rose-400 bg-rose-50"
                          : "border-stone-200 bg-stone-50"
                      } px-3 py-2.5 text-sm outline-none transition focus:border-[#C55343] focus:bg-white`}
                    />

                    {highlightErrors[highlight.id] && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                        <AlertCircle size={13} />
                        {highlightErrors[highlight.id]}
                      </p>
                    )}

                    <p className="mt-1 text-right text-[10px] text-stone-400">
                      {highlight.title.length}/80
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:pt-6">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveHighlight(index, -1)}
                      aria-label="Move highlight up"
                      className="rounded-lg border border-stone-200 p-2 text-stone-500 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp size={15} />
                    </button>

                    <button
                      type="button"
                      disabled={index === highlights.length - 1}
                      onClick={() => moveHighlight(index, 1)}
                      aria-label="Move highlight down"
                      className="rounded-lg border border-stone-200 p-2 text-stone-500 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeHighlight(highlight.id)}
                      aria-label="Remove highlight"
                      className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}

        <aside className="space-y-5 xl:sticky xl:top-6">
          {/* LIVE PREVIEW */}

          <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="border-b border-stone-100 p-5">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-[#C55343]" />
                <h2 className="font-serif text-xl text-stone-900">
                  Product Preview
                </h2>
              </div>

              <p className="mt-1 text-xs text-stone-500">
                A live preview of your product information.
              </p>
            </div>

            <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-[#F3F0EA]">
              {colors[0]?.images.find((image) => image.isPrimary) ? (
                <img
                  src={
                    colors[0].images.find((image) => image.isPrimary).preview
                  }
                  alt={formData.name || "Product preview"}
                  className="h-full w-full object-contain object-center"
                />
              ) : (
                <div className="text-center text-stone-400">
                  <ImagePlus size={36} className="mx-auto mb-3" />
                  <p className="text-xs font-medium">
                    Product image will appear here
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C55343]">
                {options.categories.find(
                  (item) => String(item.id) === formData.category,
                )?.name || "Product Category"}
              </p>

              <h3 className="font-serif text-2xl text-stone-900">
                {formData.name || "Your Product Name"}
              </h3>

              <p className="text-xs leading-6 text-stone-500">
                {formData.description ||
                  "Your product description will appear here."}
              </p>

              {pricing.sellingPrice !== "" && (
                <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                  <span className="text-lg font-semibold text-stone-900">
                    ₹{sellingPrice.toLocaleString("en-IN")}
                  </span>

                  {pricing.mrp !== "" && mrp > sellingPrice && (
                    <>
                      <span className="text-sm text-stone-400 line-through">
                        ₹{mrp.toLocaleString("en-IN")}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                        {discountPercentage}% OFF
                      </span>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {formData.frameShape && (
                  <span className="rounded-full bg-stone-100 px-3 py-1.5 text-[10px] text-stone-600">
                    {formData.frameShape}
                  </span>
                )}

                {formData.collection && (
                  <span className="rounded-full bg-stone-100 px-3 py-1.5 text-[10px] text-stone-600">
                    {
                      options.collections.find(
                        (item) => String(item.id) === formData.collection,
                      )?.name
                    }
                  </span>
                )}
              </div>

              {formData.occasions.length > 0 && (
                <div className="border-t border-stone-100 pt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Occasions
                  </p>
                  <p className="text-xs text-stone-600">
                    {options.occasions
                      .filter((item) =>
                        formData.occasions.includes(String(item.id)),
                      )
                      .map((item) => item.name)
                      .join(", ")}
                  </p>
                </div>
              )}

              {highlights.some((item) => item.title.trim()) && (
                <div className="border-t border-stone-100 pt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    Highlights
                  </p>

                  <ul className="space-y-2">
                    {highlights
                      .filter((item) => item.title.trim())
                      .map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-2 text-xs text-stone-600"
                        >
                          <Check
                            size={13}
                            className="mt-0.5 shrink-0 text-emerald-600"
                          />
                          {item.title}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* INVENTORY SUMMARY */}

          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              Inventory Summary
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500">Colour options</span>
              <span className="text-xs font-medium text-stone-800">
                {colors.length}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-stone-500">Total variants</span>
              <span className="text-xs font-medium text-stone-800">
                {totalVariants}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-stone-500">Total stock</span>
              <span className="text-sm font-semibold text-stone-900">
                {totalProductStock} units
              </span>
            </div>
          </div>

          {/* VALIDATION STATUS */}

          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
              Validation Status
            </p>

            {Object.keys(sectionErrors).length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                <Info size={14} />
                Click Create Product to validate all sections.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {Object.entries(sectionErrors).map(([section, messages]) => (
                  <div
                    key={section}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="text-xs text-stone-600">{section}</span>
                    <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600">
                      {messages.length} issue(s)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PRODUCT CREATION SUMMARY */}

          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
              Product Creation
            </p>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-stone-700">Store visibility</span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                  productStatus === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {productStatus === "active" ? "Active" : "Inactive"}
              </span>
            </div>

            <p className="mt-3 text-xs leading-5 text-stone-400">
              {productStatus === "active"
                ? "The product will be published after all images have been uploaded successfully."
                : "The product will be created with all its details but remain hidden from customers."}
            </p>
          </div>
        </aside>
      </div>

      {/* BOTTOM ACTION */}

      <div className="flex flex-col justify-end gap-3 border-t border-stone-200 pt-6 sm:flex-row">
        <button
          type="button"
          disabled={submitting}
          onClick={() => navigate("/admin/products")}
          className="rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={submitting || loadingOptions || !!optionsError}
          onClick={handleCreateProduct}
          className="flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-7 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          {submitting
            ? "Processing..."
            : productStatus === "active"
              ? "Create & Publish Product"
              : "Create Inactive Product"}
        </button>
      </div>
    </div>
  );
};

export default AdminProductAdd;
