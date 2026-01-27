import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faClipboardList,
    faCheck,
    faTimes,
    faEye,
    faClock,
    faMotorcycle,
    faBicycle,
    faCar,
    faTruck,
    faTruckMoving,
    faFilter
} from "@fortawesome/free-solid-svg-icons";
import "./Admin.css";

export default function ApplicationManagement() {
    const { authFetch } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("pending");
    const [selectedApp, setSelectedApp] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [adminNotes, setAdminNotes] = useState("");

    useEffect(() => {
        fetchApplications();
    }, [filter]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const res = await authFetch(`/applications?status=${filter}`);
            const data = await res.json();
            if (res.ok) {
                setApplications(data.applications || []);
            } else {
                toast.error(data.message || "Failed to fetch applications");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Are you sure you want to approve this application? The user will become a courier.")) {
            return;
        }

        setActionLoading(true);
        try {
            const res = await authFetch(`/applications/${id}/approve`, {
                method: "PUT",
                body: { adminNotes }
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setShowModal(false);
                setSelectedApp(null);
                setAdminNotes("");
                fetchApplications();
            } else {
                toast.error(data.message || "Failed to approve application");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (id) => {
        if (!adminNotes.trim()) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        if (!window.confirm("Are you sure you want to reject this application?")) {
            return;
        }

        setActionLoading(true);
        try {
            const res = await authFetch(`/applications/${id}/reject`, {
                method: "PUT",
                body: { adminNotes }
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setShowModal(false);
                setSelectedApp(null);
                setAdminNotes("");
                fetchApplications();
            } else {
                toast.error(data.message || "Failed to reject application");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const getVehicleIcon = (type) => {
        const icons = {
            bicycle: faBicycle,
            motorcycle: faMotorcycle,
            car: faCar,
            van: faTruckMoving,
            truck: faTruck
        };
        return icons[type] || faCar;
    };

    const getExperienceLabel = (exp) => {
        const labels = {
            "none": "No experience",
            "less-than-1": "< 1 year",
            "1-3": "1-3 years",
            "3-5": "3-5 years",
            "more-than-5": "5+ years"
        };
        return labels[exp] || exp;
    };

    const getWorkHoursLabel = (hours) => {
        const labels = {
            "full-time": "Full-time",
            "part-time": "Part-time",
            "weekends": "Weekends",
            "flexible": "Flexible"
        };
        return labels[hours] || hours;
    };

    const openApplicationModal = (app) => {
        setSelectedApp(app);
        setAdminNotes(app.adminNotes || "");
        setShowModal(true);
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h2>
                    <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                    Courier Applications
                </h2>
                <p className="text-muted">Review and manage courier applications</p>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs mb-4">
                <button
                    className={`filter-tab ${filter === "pending" ? "active" : ""}`}
                    onClick={() => setFilter("pending")}
                >
                    <FontAwesomeIcon icon={faClock} className="me-2" />
                    Pending
                </button>
                <button
                    className={`filter-tab ${filter === "approved" ? "active" : ""}`}
                    onClick={() => setFilter("approved")}
                >
                    <FontAwesomeIcon icon={faCheck} className="me-2" />
                    Approved
                </button>
                <button
                    className={`filter-tab ${filter === "rejected" ? "active" : ""}`}
                    onClick={() => setFilter("rejected")}
                >
                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                    Rejected
                </button>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : applications.length === 0 ? (
                <div className="text-center py-5">
                    <FontAwesomeIcon icon={faClipboardList} className="text-muted" style={{ fontSize: "3rem" }} />
                    <p className="text-muted mt-3">No {filter} applications found.</p>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table admin-table">
                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Vehicle</th>
                                <th>Experience</th>
                                <th>Availability</th>
                                <th>Applied On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map(app => (
                                <tr key={app._id}>
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="user-avatar-small">
                                                {app.user?.name?.charAt(0) || "?"}
                                            </div>
                                            <div>
                                                <div className="fw-medium">{app.user?.name || "Unknown"}</div>
                                                <small className="text-muted">{app.user?.email}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <FontAwesomeIcon icon={getVehicleIcon(app.vehicleType)} className="me-2" />
                                        <span className="text-capitalize">{app.vehicleType}</span>
                                    </td>
                                    <td>{getExperienceLabel(app.experience)}</td>
                                    <td>{getWorkHoursLabel(app.workHours)}</td>
                                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => openApplicationModal(app)}
                                        >
                                            <FontAwesomeIcon icon={faEye} className="me-1" />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Application Detail Modal */}
            {showModal && selectedApp && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="application-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-custom">
                            <h4>Application Details</h4>
                            <button className="btn-close" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body-custom">
                            {/* Applicant Info */}
                            <div className="info-section">
                                <h6>Applicant Information</h6>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Name</label>
                                        <span>{selectedApp.user?.name}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Email</label>
                                        <span>{selectedApp.user?.email}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Phone</label>
                                        <span>{selectedApp.user?.phone || "Not provided"}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Address</label>
                                        <span>{selectedApp.user?.address || "Not provided"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Info */}
                            <div className="info-section">
                                <h6>Vehicle & Experience</h6>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Vehicle Type</label>
                                        <span className="text-capitalize">
                                            <FontAwesomeIcon icon={getVehicleIcon(selectedApp.vehicleType)} className="me-2" />
                                            {selectedApp.vehicleType}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <label>Vehicle Number</label>
                                        <span>{selectedApp.vehicleNumber || "Not provided"}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Driving License</label>
                                        <span>{selectedApp.drivingLicense}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Experience</label>
                                        <span>{getExperienceLabel(selectedApp.experience)}</span>
                                    </div>
                                    <div className="info-item">
                                        <label>Availability</label>
                                        <span>{getWorkHoursLabel(selectedApp.workHours)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Motivation */}
                            {selectedApp.motivation && (
                                <div className="info-section">
                                    <h6>Motivation</h6>
                                    <p className="motivation-text">{selectedApp.motivation}</p>
                                </div>
                            )}

                            {/* Admin Notes */}
                            <div className="info-section">
                                <h6>Admin Notes</h6>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder={selectedApp.status === "pending"
                                        ? "Add notes (required for rejection)..."
                                        : "Notes..."}
                                    disabled={selectedApp.status !== "pending"}
                                ></textarea>
                            </div>

                            {/* Reviewed Info (for non-pending) */}
                            {selectedApp.status !== "pending" && selectedApp.reviewedAt && (
                                <div className="info-section">
                                    <h6>Review Info</h6>
                                    <p className="text-muted mb-0">
                                        {selectedApp.status === "approved" ? "Approved" : "Rejected"} by {selectedApp.reviewedBy?.name || "Admin"} on {new Date(selectedApp.reviewedAt).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer-custom">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowModal(false)}
                            >
                                Close
                            </button>
                            {selectedApp.status === "pending" && (
                                <>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleReject(selectedApp._id)}
                                        disabled={actionLoading}
                                    >
                                        <FontAwesomeIcon icon={faTimes} className="me-1" />
                                        Reject
                                    </button>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleApprove(selectedApp._id)}
                                        disabled={actionLoading}
                                    >
                                        <FontAwesomeIcon icon={faCheck} className="me-1" />
                                        Approve
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
