import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
} from "../../../services/cartService";

// Initial cart state.
const initialState = {
  items: [],
  totalItems: 0,
  totalQuantity: 0,
  subtotal: 0,

  loading: false,
  error: null,
};

// --------------------------------------------------
// ASYNC THUNKS
// --------------------------------------------------

// Fetch the logged-in customer's cart from Django.
export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async (_, { rejectWithValue }) => {
    try {
      return await getCart();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Add a product variant to the cart.
export const addCartItem = createAsyncThunk(
  "cart/addCartItem",
  async (
    { productVariantId, quantity = 1, lensOption = "frame_only" },
    { rejectWithValue },
  ) => {
    try {
      await addToCart(productVariantId, quantity, lensOption);

      return await getCart();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Update the quantity of an existing cart item.
export const changeCartItemQuantity = createAsyncThunk(
  "cart/changeCartItemQuantity",
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      await updateCartItem(itemId, quantity);

      // Return the updated cart.
      return await getCart();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Remove an item from the cart.
export const deleteCartItem = createAsyncThunk(
  "cart/deleteCartItem",
  async (itemId, { rejectWithValue }) => {
    try {
      await removeCartItem(itemId);

      // Return the latest cart after removal.
      return await getCart();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// --------------------------------------------------
// CART SLICE
// --------------------------------------------------

const cartSlice = createSlice({
  name: "cart",
  initialState,

  reducers: {
    // Clear cart errors.
    clearCartError: (state) => {
      state.error = null;
    },

    // Reset cart state, for example after logout.
    clearCart: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.totalQuantity = 0;
      state.subtotal = 0;
      state.loading = false;
      state.error = null;
    },
  },

  // Handle asynchronous API operations.
  extraReducers: (builder) => {
    builder

      // FETCH CART
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;

        state.items = action.payload.cart_items ?? [];
        state.totalItems = action.payload.total_items ?? 0;
        state.totalQuantity = action.payload.total_quantity ?? 0;
        state.subtotal = Number(action.payload.subtotal ?? 0);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // ADD CART ITEM
      .addCase(addCartItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCartItem.fulfilled, (state, action) => {
        state.loading = false;

        state.items = action.payload.cart_items ?? [];
        state.totalItems = action.payload.total_items ?? 0;
        state.totalQuantity = action.payload.total_quantity ?? 0;
        state.subtotal = Number(action.payload.subtotal ?? 0);
      })
      .addCase(addCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // UPDATE CART ITEM
      .addCase(changeCartItemQuantity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeCartItemQuantity.fulfilled, (state, action) => {
        state.loading = false;

        state.items = action.payload.cart_items ?? [];
        state.totalItems = action.payload.total_items ?? 0;
        state.totalQuantity = action.payload.total_quantity ?? 0;
        state.subtotal = Number(action.payload.subtotal ?? 0);
      })
      .addCase(changeCartItemQuantity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // REMOVE CART ITEM
      .addCase(deleteCartItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCartItem.fulfilled, (state, action) => {
        state.loading = false;

        state.items = action.payload.cart_items ?? [];
        state.totalItems = action.payload.total_items ?? 0;
        state.totalQuantity = action.payload.total_quantity ?? 0;
        state.subtotal = Number(action.payload.subtotal ?? 0);
      })
      .addCase(deleteCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

// Export normal Redux actions.
export const { clearCartError, clearCart } = cartSlice.actions;

// Export reducer for the Redux store.
export default cartSlice.reducer;
