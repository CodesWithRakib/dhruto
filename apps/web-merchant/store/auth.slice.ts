import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  merchantId?: string;
}

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const cleanStorageToken = (val: string | null): string | null => {
  if (!val || val === "undefined" || val === "null" || val.trim() === "") {
    return null;
  }
  return val.replace(/^["']|["']$/g, "").trim();
};

const getInitialState = (): AuthState => {
  if (typeof window === "undefined") {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    };
  }

  try {
    const rawToken = localStorage.getItem("dhruto_access_token");
    const rawRefreshToken = localStorage.getItem("dhruto_refresh_token");
    const token = cleanStorageToken(rawToken);
    const refreshToken = cleanStorageToken(rawRefreshToken);

    const userStr = localStorage.getItem("dhruto_user");
    let user: UserProfile | null = null;
    if (userStr && userStr !== "undefined" && userStr !== "null") {
      try {
        user = JSON.parse(userStr);
      } catch {
        user = null;
      }
    }

    return {
      user,
      accessToken: token,
      refreshToken,
      isAuthenticated: Boolean(token && user),
    };
  } catch {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    };
  }
};

export const authSlice = createSlice({
  name: "auth",
  initialState: getInitialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: UserProfile;
        accessToken: string;
        refreshToken: string;
      }>,
    ) => {
      const validToken = cleanStorageToken(action.payload.accessToken);
      const validRefreshToken = cleanStorageToken(action.payload.refreshToken);

      state.user = action.payload.user;
      state.accessToken = validToken;
      state.refreshToken = validRefreshToken;
      state.isAuthenticated = Boolean(validToken);

      if (typeof window !== "undefined") {
        if (validToken) {
          localStorage.setItem("dhruto_access_token", validToken);
        } else {
          localStorage.removeItem("dhruto_access_token");
        }

        if (validRefreshToken) {
          localStorage.setItem("dhruto_refresh_token", validRefreshToken);
        } else {
          localStorage.removeItem("dhruto_refresh_token");
        }

        if (action.payload.user) {
          localStorage.setItem("dhruto_user", JSON.stringify(action.payload.user));
        } else {
          localStorage.removeItem("dhruto_user");
        }
      }
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;

      if (typeof window !== "undefined") {
        localStorage.removeItem("dhruto_access_token");
        localStorage.removeItem("dhruto_refresh_token");
        localStorage.removeItem("dhruto_user");
      }
    },
    updateUser: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== "undefined") {
          localStorage.setItem("dhruto_user", JSON.stringify(state.user));
        }
      }
    },
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
