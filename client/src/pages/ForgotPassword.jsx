import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faArrowLeft, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import "./Auth.css";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            toast.error("Please enter your email address");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("http://localhost:8080/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                setEmailSent(true);
                toast.success("Reset link sent! Check your email.");
            } else {
                toast.error(data.message || "Failed to send reset email");
            }
        } catch (error) {
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Forgot Password</h2>
                    <p>Enter your email to receive a reset link</p>
                </div>

                {emailSent ? (
                    <div className="email-sent-success">
                        <div className="success-icon">
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </div>
                        <h3>Check Your Email</h3>
                        <p>
                            We've sent a password reset link to <strong>{email}</strong>.
                            The link will expire in 1 hour.
                        </p>
                        <p className="text-muted small">
                            Don't see it? Check your spam folder.
                        </p>
                        <div className="auth-footer">
                            <button
                                className="btn btn-outline-primary w-100"
                                onClick={() => setEmailSent(false)}
                            >
                                Try different email
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email">
                                <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                className="form-control"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <br />
                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
                                    Send Reset Link
                                </>
                            )}
                        </button>
                    </form>
                )}

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
