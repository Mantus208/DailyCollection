import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, restore user from localStorage (if a token exists)
  useEffect(() => {
    const storedUser = localStorage.getItem("dc_user");
    const token = localStorage.getItem("dc_token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    const loggedInUser = {
      _id: data._id,
      name: data.name,
      username: data.username,
      role: data.role,
    };
    localStorage.setItem("dc_token", data.token);
    localStorage.setItem("dc_user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    localStorage.removeItem("dc_token");
    localStorage.removeItem("dc_user");
    localStorage.removeItem("dc_selected_area");
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
