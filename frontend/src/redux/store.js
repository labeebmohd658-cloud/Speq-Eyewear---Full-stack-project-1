
import { configureStore } from "@reduxjs/toolkit";

// Import reducers.
import cartReducer from "./features/cart/cartSlice";
import wishlistReducer from "./features/cart/wishlist/wishlistSlice";

// Create the central Redux store.
export const store = configureStore({
  reducer: {
    cart: cartReducer,
    wishlist: wishlistReducer,
  },
});
