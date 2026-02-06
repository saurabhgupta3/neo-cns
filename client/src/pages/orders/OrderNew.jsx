import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudUploadAlt, faImage, faTimes } from "@fortawesome/free-solid-svg-icons";
import "./Orders.css";

export default function OrderNew() {
    const [formData, setFormData] = useState({
        senderName: "",
        receiverName: "",
        pickupAddress: "",
        deliveryAddress: "",
        image: "",
        weight: ""
    });
    const [validated, setValidated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const navigate = useNavigate();
    const { authFetch } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Only JPG, PNG, GIF and WebP images are allowed");
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to server
        setUploadingImage(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('image', file);

            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8080/api/upload/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataUpload
            });

            const data = await res.json();

            if (res.ok) {
                setFormData(prev => ({ ...prev, image: data.imageUrl }));
                toast.success("Image uploaded successfully!");
            } else {
                toast.error(data.message || "Failed to upload image");
                setImagePreview(null);
            }
        } catch (err) {
            console.error("Error uploading image:", err);
            toast.error("Failed to upload image");
            setImagePreview(null);
        } finally {
            setUploadingImage(false);
        }
    };

    const removeImage = async () => {
        if (formData.image && formData.image.includes('cloudinary')) {
            try {
                const token = localStorage.getItem('token');
                await fetch('http://localhost:8080/api/upload/image', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ imageUrl: formData.image })
                });
            } catch (err) {
                console.error("Error deleting image:", err);
            }
        }

        setFormData(prev => ({ ...prev, image: "" }));
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
        <div className="container py-4">
            <div className="row">
                <div className="col-lg-8 offset-lg-2">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3>Create a New Order</h3>
                        <Link to="/orders" className="btn btn-outline-secondary">
                            ← Back to Orders
                        </Link>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <form
                                noValidate
                                onSubmit={handleSubmit}
                                className={`needs-validation ${validated ? "was-validated" : ""}`}
                            >
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
                                        <label className="form-label">
                                            Package Image (Optional)
                                        </label>

                                        {/* Image Preview */}
                                        {imagePreview ? (
                                            <div className="position-relative mb-2">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="img-thumbnail"
                                                    style={{ maxHeight: '150px', objectFit: 'cover' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm position-absolute top-0 end-0"
                                                    onClick={removeImage}
                                                    style={{ transform: 'translate(50%, -50%)' }}
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="border rounded p-4 text-center bg-light"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {uploadingImage ? (
                                                    <>
                                                        <div className="spinner-border spinner-border-sm text-primary mb-2" />
                                                        <p className="mb-0 small">Uploading...</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FontAwesomeIcon icon={faCloudUploadAlt} size="2x" className="text-muted mb-2" />
                                                        <p className="mb-0 small text-muted">Click to upload image</p>
                                                        <p className="mb-0 small text-muted">(Max 5MB, JPG/PNG/GIF)</p>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div className="d-flex gap-2 mt-4">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading || uploadingImage}
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
                </div>
            </div>
        </div>
    );
}
