import { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    // check auth
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            fetchUser(storedToken);
        } else {
            setLoading(false);
        }
    }, []);

    // fetch user
    const fetchUser = async (authToken) => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setToken(authToken);
            } else {
                // token invalid
                logout();
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    // login handler
    const login = async (email, password) => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Login failed");
            }

            // persist session
            localStorage.setItem("token", data.token);
            setToken(data.token);
            setUser(data.user);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // register handler
    const register = async (name, email, password, phone, address) => {
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, phone, address })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Registration failed");
            }

            // persist session
            localStorage.setItem("token", data.token);
            setToken(data.token);
            setUser(data.user);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    // logout handler
    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    // auth helper
    const authFetch = async (url, options = {}) => {
        const headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`
        };

        if (options.body && typeof options.body === "object") {
            headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(options.body);
        }

        const res = await fetch(`${API_URL}${url}`, { ...options, headers });

        // handle unauthorized
        if (res.status === 401) {
            logout();
            throw new Error("Session expired. Please login again.");
        }

        return res;
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        authFetch
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// auth hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export default AuthContext;
