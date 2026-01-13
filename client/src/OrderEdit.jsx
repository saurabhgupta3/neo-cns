import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./OrderEdit.css";

export default function OrderEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [validated, setValidated] = useState(false);

  
  useEffect(() => {
    fetch(`http://localhost:8080/orders/${id}`)
      .then((res) => res.json())
      .then((data) => setOrder(data))
      .catch((err) => console.error("Error fetching orders:", err));
  }, [id]);

  const handleChange = (e) => {
    setOrder({
      ...order,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    // Bootstrap + HTML5 validation
    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setValidated(true);

    try {
      const res = await fetch(`http://localhost:8080/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });

      const data = await res.json();
      console.log("Order edited:", data);
      navigate(`/orders/${id}`);
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  if (!order) return <p>Loading...</p>;

  return (
    <div className="row mt-3">
      <div className="col-8 offset-2">
        <h3>Edit the Order</h3>

        <form
          noValidate
          onSubmit={handleSubmit}
          className={`needs-validation ${validated ? "was-validated" : ""}`}
        >
      
          <div className="mb-3">
            <label htmlFor="senderName" className="form-label">
              Sender Name
            </label>
            <input
              type="text"
              id="senderName"
              name="senderName"
              className="form-control"
              value={order.senderName}
              onChange={handleChange}
              required
            />
            <div className="invalid-feedback">
              Sender name is required.
            </div>
          </div>

       
          <div className="mb-3">
            <label htmlFor="receiverName" className="form-label">
              Receiver Name
            </label>
            <input
              type="text"
              id="receiverName"
              name="receiverName"
              className="form-control"
              value={order.receiverName}
              onChange={handleChange}
              required
            />
            <div className="invalid-feedback">
              Receiver name is required.
            </div>
          </div>

      
          <div className="mb-3">
            <label htmlFor="pickupAddress" className="form-label">
              Pickup Address
            </label>
            <input
              type="text"
              id="pickupAddress"
              name="pickupAddress"
              className="form-control"
              value={order.pickupAddress}
              onChange={handleChange}
              required
            />
            <div className="invalid-feedback">
              Pickup address is required.
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="deliveryAddress" className="form-label">
              Delivery Address
            </label>
            <input
              type="text"
              id="deliveryAddress"
              name="deliveryAddress"
              className="form-control"
              value={order.deliveryAddress}
              onChange={handleChange}
              required
            />
            <div className="invalid-feedback">
              Delivery address is required.
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="image" className="form-label">
              Image Link
            </label>
            <input
              type="url"
              id="image"
              name="image"
              className="form-control"
              value={order.image || ""}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="weight" className="form-label">
              Weight (kg)
            </label>
            <input
              type="number"
              id="weight"
              name="weight"
              className="form-control"
              value={order.weight}
              onChange={handleChange}
              required
              min="0.1"
              step="0.1"
            />
            <div className="invalid-feedback">
              Please enter a valid weight.
            </div>
          </div>

          <button type="submit" className="btn btn-dark edit-btn mt-3">
            Edit the Order
          </button>
        </form>
      </div>
    </div>
  );
}
