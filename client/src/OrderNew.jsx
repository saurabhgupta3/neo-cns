import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderNew.css";

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
  const navigate = useNavigate();

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

    try {
      const res = await fetch("http://localhost:8080/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if(!res.ok) {
        console.error(data.error);
        alert("something went wrong!");
        return;
      }
      console.log("Order created:", data);
      navigate("/orders");
    } catch (err) {
      console.error("Error creating order:", err);
    }
  };

  return (
    <div className="row">
      <div className="col-8 offset-2">
        <h3>Create a New Order</h3>

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
              value={formData.senderName}
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
              value={formData.receiverName}
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
              Delivery Address
            </label>
            <input
              type="text"
              id="deliveryAddress"
              name="deliveryAddress"
              className="form-control"
              value={formData.deliveryAddress}
              onChange={handleChange}
              required
            />
            <div className="invalid-feedback">
              Delivery address is required.
            </div>
          </div>

        
          <div className="mb-3">
            <label htmlFor="image" className="form-label">
              Image Link (Optional)
            </label>
            <input
              type="url"
              id="image"
              name="image"
              className="form-control"
              value={formData.image}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="weight" className="form-label">
              Weight (kg)
            </label>
            <input
            //   type="number"
              id="weight"
              name="weight"
              className="form-control"
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

          <button type="submit" className="btn btn-dark add-btn">
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
