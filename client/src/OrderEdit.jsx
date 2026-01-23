import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { toast } from "react-toastify";
import "./OrderEdit.css";

export default function OrderEdit() {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    senderName: "",
    receiverName: "",
    pickupAddress: "",
    deliveryAddress: "",
    image: "",
    weight: ""
  });
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await authFetch(`/orders/${id}`);
      const data = await res.json();

      if (res.ok && data.order) {
        setFormData({
          senderName: data.order.senderName || "",
          receiverName: data.order.receiverName || "",
          pickupAddress: data.order.pickupAddress || "",
          deliveryAddress: data.order.deliveryAddress || "",
          image: data.order.image || "",
          weight: data.order.weight || ""
        });
      } else {
        toast.error(data.message || "Failed to fetch order");
        navigate("/orders");
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    setSubmitting(true);

    try {
      const res = await authFetch(`/orders/${id}`, {
        method: "PUT",
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Order updated successfully!");
        navigate(`/orders/${id}`);
      } else {
        toast.error(data.message || "Failed to update order");
      }
    } catch (err) {
      console.error("Error updating order:", err);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-lg-8 offset-lg-2">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Edit Order</h3>
            <Link to={`/orders/${id}`} className="btn btn-outline-secondary">
              ← Back to Order
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
                    placeholder="Enter pickup address"
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
                    placeholder="Enter delivery address"
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
                    <label htmlFor="image" className="form-label">
                      Image Link (Optional)
                    </label>
                    <input
                      type="url"
                      id="image"
                      name="image"
                      className="form-control"
                      placeholder="Enter image URL"
                      value={formData.image}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="d-flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Updating...
                      </>
                    ) : (
                      "Update Order"
                    )}
                  </button>
                  <Link to={`/orders/${id}`} className="btn btn-outline-secondary">
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
