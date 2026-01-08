import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const res = await fetch("http://localhost:8080/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        const data = await res.json();
        console.log("Order created:", data);
        navigate("/orders");
    };

    return (
        <div className="row">
            <div className="col-8 offset-2">
                <h3>Create a New Order</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="senderName" className="form-label">Sender Name</label>
                        <input type="text" name="senderName" placeholder="Sender Name" 
                            value={formData.senderName} onChange={handleChange} className="form-control" id="senderName"/>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="receiverName" className="form-label">Receiver Name</label>
                        <input type="text" name="receiverName" placeholder="Receiver Name" 
                            value={formData.receiverName} onChange={handleChange} className="form-control" id="receiverName"/>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="pickupAddress" className="form-label">Pickup Address</label>
                        <input type="text" name="pickupAddress" placeholder="Pickup Address" 
                            value={formData.pickupAddress} onChange={handleChange} className="form-control" id="pickupAddress"/>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="deliveryAddress" className="form-label">Delivery Address</label>
                        <input type="text" name="deliveryAddress" placeholder="Delivery Address" 
                            value={formData.deliveryAddress} onChange={handleChange} className="form-control" id="deliveryAddress"/>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="image" className="form-label">Image Link</label>
                        <input type="text" name="image" placeholder="Image Link (optional)" 
                            value={formData.image} onChange={handleChange} className="form-control" id="image"/>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="weight" className="form-label">Weigth (kg)</label>
                        <input type="number" name="weight" placeholder="Weight (kg)" 
                            value={formData.weight} onChange={handleChange} className="form-control" id="weight"/>
                    </div>
                    <button type="submit" className="btn btn-dark add-btn">Add</button>
                </form>
            </div>
        </div>
    );
}
