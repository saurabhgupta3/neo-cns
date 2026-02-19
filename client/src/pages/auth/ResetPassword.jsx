import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faEye, faEyeSlash, faCheck, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import "./Auth.css";

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Password strength checker
    const getPasswordStrength = (pass) => {
        let strength = 0;
        if (pass.length >= 6) strength++;
        if (pass.length >= 8) strength++;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^a-zA-Z0-9]/.test(pass)) strength++;
        return strength;
    };

    const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const strengthColors = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#16a34a"];
    const passwordStrength = getPasswordStrength(password);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                toast.success("Password reset successful!");
            } else {
                toast.error(data.message || "Failed to reset password");
            }
        } catch (error) {
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="email-sent-success">
                        <div className="success-icon" style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
                            <FontAwesomeIcon icon={faCheck} />
                        </div>
                        <h3>Password Reset Successfully!</h3>
                        <p>Your password has been updated. You can now login with your new password.</p>
                        <button
                            className="btn btn-primary w-100"
                            onClick={() => navigate("/login")}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Reset Password</h2>
                    <p>Enter your new password</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="password">
                            <FontAwesomeIcon icon={faLock} className="me-2" />
                            New Password
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                className="form-control"
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                        {password && (
                            <div className="password-strength mt-2">
                                <div className="strength-bar">
                                    <div
                                        className="strength-fill"
                                        style={{
                                            width: `${(passwordStrength / 5) * 100}%`,
                                            background: strengthColors[passwordStrength - 1] || "#dc2626"
                                        }}
                                    ></div>
                                </div>
                                <small style={{ color: strengthColors[passwordStrength - 1] || "#dc2626" }}>
                                    {strengthLabels[passwordStrength - 1] || "Very Weak"}
                                </small>
                            </div>
                        )}
                    </div>
                    <br />
                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            <FontAwesomeIcon icon={faLock} className="me-2" />
                            Confirm Password
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                className="form-control"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <small className="text-danger">Passwords do not match</small>
                        )}
                        {confirmPassword && password === confirmPassword && (
                            <small className="text-success">
                                <FontAwesomeIcon icon={faCheck} className="me-1" />
                                Passwords match
                            </small>
                        )}
                    </div>
                    <br />
                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading || password !== confirmPassword || password.length < 6}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Resetting...
                            </>
                        ) : (
                            "Reset Password"
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <Link to="/login" className="back-link">
                        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
