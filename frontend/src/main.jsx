
import React from "react";
import ReactDOM from "react-dom/client";

import { Provider } from "react-redux";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { store } from "./redux/store";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Makes the Redux store available throughout React */}
    <Provider store={store}>
      {/* Keeps your existing Google authentication provider */}
      <GoogleOAuthProvider clientId="279982570548-p37tb50hvg6b1o1n6v8d96cacf7m8f3t.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>
    </Provider>
  </React.StrictMode>
);
