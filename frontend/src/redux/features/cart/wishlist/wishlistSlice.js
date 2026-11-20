
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../../../../services/wishlistService";

// Initial wishlist state.
const initialState = {
  items: [],
  totalItems: 0,

  loading: false,
  error: null,
};

// FETCH WISHLIST
export const fetchWishlist = createAsyncThunk(
  "wishlist/fetchWishlist",
  async (_, { rejectWithValue }) => {
    try {
      return await getWishlist();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ADD WISHLIST ITEM
export const addWishlistItem = createAsyncThunk(
  "wishlist/addWishlistItem",
  async (productId, { rejectWithValue }) => {
    try {
      await addToWishlist(productId);
      return await getWishlist();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// REMOVE WISHLIST ITEM
export const deleteWishlistItem = createAsyncThunk(
  "wishlist/deleteWishlistItem",
  async (itemId, { rejectWithValue }) => {
    try {
      await removeFromWishlist(itemId);
      return await getWishlist();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,

  reducers: {
    clearWishlistError: (state) => {
      state.error = null;
    },

    clearWishlist: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.loading = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // FETCH WISHLIST
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.wishlist_items ?? [];
        state.totalItems = action.payload.total_items ?? 0;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // ADD WISHLIST ITEM
      .addCase(addWishlistItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addWishlistItem.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.wishlist_items ?? [];
        state.totalItems = action.payload.total_items ?? 0;
      })
      .addCase(addWishlistItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // REMOVE WISHLIST ITEM
      .addCase(deleteWishlistItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWishlistItem.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.wishlist_items ?? [];
        state.totalItems = action.payload.total_items ?? 0;
      })
      .addCase(deleteWishlistItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearWishlistError, clearWishlist } = wishlistSlice.actions;

export default wishlistSlice.reducer;
