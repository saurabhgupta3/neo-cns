import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faUser, faMapMarkerAlt, faBox } from "@fortawesome/free-solid-svg-icons";
import "./Orders.css";

export default function OrderNew() {
    const [formData, setFormData] = useState({
        senderName: "",
        receiverName: "",
        pickupAddress: "",
        deliveryAddress: "",
        weight: "",
        paymentMethod: "COD"
    });
    const [validated, setValidated] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { authFetch } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        if (!form.checkValidity()) {
            e.stopPropagation();
            setValidated(true);
            return;
        }

        setValidated(true);
        setLoading(true);

        try {
            const res = await authFetch("/orders", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Order created successfully!");
                navigate("/orders");
            } else {
                toast.error(data.message || "Failed to create order");
            }
        } catch (err) {
            console.error("Error creating order:", err);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="order-form-container">
            <div className="order-form-header">
                <h3>Create a New Order</h3>
                <Link to="/orders" className="btn btn-outline-secondary">
                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                    Back to Orders
                </Link>
            </div>

            <div className="order-form-card">
                <form
                    noValidate
                    onSubmit={handleSubmit}
                    className={`needs-validation ${validated ? "was-validated" : ""}`}
                >
                    <div className="order-form-section">
                        <div className="order-form-section-title">
                            <FontAwesomeIcon icon={faUser} />
                            Sender & Receiver
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label htmlFor="senderName" className="form-label">
                                    Sender Name *
                                </label>
                                <input
                                    type="text"
                                    id="senderName"
                                    name="senderName"
                                    className="form-control"
                                    placeholder="Enter sender's name"
                                    value={formData.senderName}
                                    onChange={handleChange}
                                    required
                                />
                                <div className="invalid-feedback">
                                    Sender name is required.
                                </div>
                            </div>

                            <div className="col-md-6 mb-3">
                                <label htmlFor="receiverName" className="form-label">
                                    Receiver Name *
                                </label>
                                <input
                                    type="text"
                                    id="receiverName"
                                    name="receiverName"
                                    className="form-control"
                                    placeholder="Enter receiver's name"
                                    value={formData.receiverName}
                                    onChange={handleChange}
                                    required
                                />
                                <div className="invalid-feedback">
                                    Receiver name is required.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-form-section">
                        <div className="order-form-section-title">
                            <FontAwesomeIcon icon={faMapMarkerAlt} />
                            Addresses
                        </div>
                        <div className="mb-3">
                            <label htmlFor="pickupAddress" className="form-label">
                                Pickup Address *
                            </label>
                            <input
                                type="text"
                                id="pickupAddress"
                                name="pickupAddress"
                                className="form-control"
                                placeholder="Enter pickup address (include city name)"
                                value={formData.pickupAddress}
                                onChange={handleChange}
                                required
                            />
                            <div className="invalid-feedback">
                                Pickup address is required.
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="deliveryAddress" className="form-label">
                                Delivery Address *
                            </label>
                            <input
                                type="text"
                                id="deliveryAddress"
                                name="deliveryAddress"
                                className="form-control"
                                placeholder="Enter delivery address (include city name)"
                                value={formData.deliveryAddress}
                                onChange={handleChange}
                                required
                            />
                            <div className="invalid-feedback">
                                Delivery address is required.
                            </div>
                        </div>
                    </div>

                    <div className="order-form-section">
                        <div className="order-form-section-title">
                            <FontAwesomeIcon icon={faBox} />
                            Package Details
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label htmlFor="weight" className="form-label">
                                    Weight (kg) *
                                </label>
                                <input
                                    type="number"
                                    id="weight"
                                    name="weight"
                                    className="form-control"
                                    placeholder="Enter package weight"
                                    value={formData.weight}
                                    onChange={handleChange}
                                    required
                                    min="0.1"
                                    step="0.1"
                                />
                                <div className="invalid-feedback">
                                    Please enter a valid weight.
                                </div>
                            </div>

                            <div className="col-md-6 mb-3">
                                <label htmlFor="paymentMethod" className="form-label">
                                    Payment Method *
                                </label>
                                <select
                                    id="paymentMethod"
                                    name="paymentMethod"
                                    className="form-select"
                                    value={formData.paymentMethod}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="COD">💵 Cash on Delivery (COD)</option>
                                    <option value="Prepaid">💳 Prepaid</option>
                                    <option value="Wallet">👛 Wallet</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="order-form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Creating...
                                </>
                            ) : (
                                "Create Order"
                            )}
                        </button>
                        <Link to="/orders" className="btn btn-outline-secondary">
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
