import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faTruckMoving } from "@fortawesome/free-solid-svg-icons";
import "./Auth.css";

export default function Register() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        address: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        // Validate password length
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        const result = await register(
            formData.name,
            formData.email,
            formData.password,
            formData.phone,
            formData.address
        );

        if (result.success) {
            toast.success("Registration successful! Welcome to Neo-CNS.");
            navigate("/orders");
        } else {
            setError(result.error);
            toast.error(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: "480px" }}>
                <div className="auth-header">
                    <FontAwesomeIcon icon={faTruckMoving} size="2x" className="mb-3" style={{ color: "#667eea" }} />
                    <h2>Create Account</h2>
                    <p>Join Neo-CNS and start shipping</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="name" className="form-label">Full Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="form-control"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            autoComplete="name"
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email Address *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="form-control"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label htmlFor="password" className="form-label">Password *</label>
                            <div className="input-group-password">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    className="form-control"
                                    placeholder="Min 6 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                </button>
                            </div>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label htmlFor="confirmPassword" className="form-label">Confirm Password *</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className="form-control"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label htmlFor="phone" className="form-label">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            className="form-control"
                            placeholder="Enter 10-digit phone number"
                            value={formData.phone}
                            onChange={handleChange}
                            pattern="[0-9]{10}"
                            autoComplete="tel"
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="address" className="form-label">Address</label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            className="form-control"
                            placeholder="Enter your address"
                            value={formData.address}
                            onChange={handleChange}
                            autoComplete="street-address"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Creating Account...
                            </>
                        ) : (
                            "Create Account"
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p className="mb-0">
                        Already have an account? <Link to="/login">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
