import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEdit, faLock, faSave, faTimes, faTrash, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import "./Profile.css";

export default function Profile() {
    const { user, authFetch, logout } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [profileData, setProfileData] = useState({
        name: "",
        phone: "",
        address: ""
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || "",
                phone: user.phone || "",
                address: user.address || ""
            });
        }
    }, [user]);

    const handleProfileChange = (e) => {
        setProfileData({
            ...profileData,
            [e.target.name]: e.target.value
        });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await authFetch("/auth/profile", {
                method: "PUT",
                body: profileData
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Profile updated successfully!");
                setIsEditing(false);
                // Refresh page to update context
                window.location.reload();
            } else {
                toast.error(data.message || "Failed to update profile");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await authFetch("/auth/change-password", {
                method: "PUT",
                body: {
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                }
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Password changed successfully!");
                setShowPasswordForm(false);
                setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                });
            } else {
                toast.error(data.message || "Failed to change password");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const getPasswordStrength = () => {
        const password = passwordData.newPassword;
        if (password.length === 0) return null;
        if (password.length < 6) return "weak";
        if (password.length < 10) return "medium";
        return "strong";
    };

    const getInitials = (name) => {
        return name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (!user) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-avatar">
                    {getInitials(user.name)}
                </div>
                <h2>{user.name}</h2>
                <span className={`role-badge ${user.role}`}>{user.role}</span>
            </div>

            {/* Profile Info Card */}
            <div className="profile-card">
                <div className="profile-card-header">
                    <h5>
                        <FontAwesomeIcon icon={faUser} className="me-2" />
                        Profile Information
                    </h5>
                    {!isEditing && (
                        <button
                            className="btn btn-light btn-sm"
                            onClick={() => setIsEditing(true)}
                        >
                            <FontAwesomeIcon icon={faEdit} className="me-1" />
                            Edit
                        </button>
                    )}
                </div>
                <div className="profile-card-body">
                    {isEditing ? (
                        <form className="profile-form" onSubmit={handleProfileSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-control"
                                    value={profileData.name}
                                    onChange={handleProfileChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={user.email}
                                    disabled
                                />
                                <small className="text-muted">Email cannot be changed</small>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    className="form-control"
                                    value={profileData.phone}
                                    onChange={handleProfileChange}
                                    pattern="[0-9]{10}"
                                    placeholder="Enter 10-digit phone number"
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    className="form-control"
                                    value={profileData.address}
                                    onChange={handleProfileChange}
                                    placeholder="Enter your address"
                                />
                            </div>
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn-save" disabled={loading}>
                                    <FontAwesomeIcon icon={faSave} className="me-1" />
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setProfileData({
                                            name: user.name || "",
                                            phone: user.phone || "",
                                            address: user.address || ""
                                        });
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTimes} className="me-1" />
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="profile-info-row">
                                <div className="profile-info-label">Full Name</div>
                                <div className="profile-info-value">{user.name}</div>
                            </div>
                            <div className="profile-info-row">
                                <div className="profile-info-label">Email</div>
                                <div className="profile-info-value">{user.email}</div>
                            </div>
                            <div className="profile-info-row">
                                <div className="profile-info-label">Phone</div>
                                <div className="profile-info-value">{user.phone || "Not provided"}</div>
                            </div>
                            <div className="profile-info-row">
                                <div className="profile-info-label">Address</div>
                                <div className="profile-info-value">{user.address || "Not provided"}</div>
                            </div>
                            <div className="profile-info-row">
                                <div className="profile-info-label">Role</div>
                                <div className="profile-info-value">
                                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Change Password Card */}
            <div className="profile-card">
                <div className="profile-card-header">
                    <h5>
                        <FontAwesomeIcon icon={faLock} className="me-2" />
                        Security
                    </h5>
                    {!showPasswordForm && (
                        <button
                            className="btn btn-light btn-sm"
                            onClick={() => setShowPasswordForm(true)}
                        >
                            Change Password
                        </button>
                    )}
                </div>
                <div className="profile-card-body">
                    {showPasswordForm ? (
                        <form className="profile-form" onSubmit={handlePasswordSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    className="form-control"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    className="form-control"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    minLength={6}
                                />
                                {passwordData.newPassword && (
                                    <div className="password-strength">
                                        <div className={`password-strength-bar ${getPasswordStrength()}`}></div>
                                    </div>
                                )}
                                <small className="text-muted">Minimum 6 characters</small>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className="form-control"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    required
                                />
                                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                                    <small className="text-danger">Passwords do not match</small>
                                )}
                            </div>
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn-save" disabled={loading}>
                                    <FontAwesomeIcon icon={faSave} className="me-1" />
                                    {loading ? "Changing..." : "Change Password"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setShowPasswordForm(false);
                                        setPasswordData({
                                            currentPassword: "",
                                            newPassword: "",
                                            confirmPassword: ""
                                        });
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTimes} className="me-1" />
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="text-muted mb-0">
                            Click "Change Password" to update your password.
                        </p>
                    )}
                </div>
            </div>

            {/* Member Since */}
            <div className="member-since">
                Member since {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
            </div>

            {/* Delete Account Card */}
            <div className="profile-card danger-card">
                <div className="profile-card-header danger-header">
                    <h5>
                        <FontAwesomeIcon icon={faTrash} className="me-2" />
                        Danger Zone
                    </h5>
                </div>
                <div className="profile-card-body">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 className="mb-1">Delete Account</h6>
                            <p className="text-muted mb-0 small">
                                Once you delete your account, there is no going back. Please be certain.
                            </p>
                        </div>
                        <button
                            className="btn btn-outline-danger"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-header">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="warning-icon" />
                            <h4>Delete Account</h4>
                        </div>
                        <div className="delete-modal-body">
                            <p>Are you sure you want to delete your account? This action:</p>
                            <ul>
                                <li>Cannot be undone</li>
                                <li>Will remove your profile data</li>
                                <li>Will log you out immediately</li>
                            </ul>
                            <p className="text-muted small">
                                <strong>Note:</strong> If you have active orders, you must wait until they are delivered or cancel them first.
                            </p>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setDeleteLoading(true);

                                try {
                                    const res = await authFetch("/auth/delete-account", {
                                        method: "DELETE",
                                        body: { password: deletePassword }
                                    });
                                    const data = await res.json();

                                    if (res.ok) {
                                        toast.success(data.message);
                                        logout();
                                        navigate("/login");
                                    } else {
                                        toast.error(data.message || "Failed to delete account");
                                    }
                                } catch (error) {
                                    toast.error(error.message);
                                } finally {
                                    setDeleteLoading(false);
                                }
                            }}>
                                <div className="mb-3">
                                    <label className="form-label">Enter your password to confirm:</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Your password"
                                        required
                                    />
                                </div>
                                <div className="d-flex gap-2 justify-content-end">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setDeletePassword("");
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-danger"
                                        disabled={deleteLoading || !deletePassword}
                                    >
                                        {deleteLoading ? "Deleting..." : "Delete My Account"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
