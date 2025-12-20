import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

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
        <form onSubmit={handleSubmit}>
            <input type="text" name="senderName" placeholder="Sender Name" 
                value={formData.senderName} onChange={handleChange} />
                <br />

            <input type="text" name="receiverName" placeholder="Receiver Name" 
                value={formData.receiverName} onChange={handleChange} />
                <br />

            <input type="text" name="pickupAddress" placeholder="Pickup Address" 
                value={formData.pickupAddress} onChange={handleChange} />
                    <br />
            <input type="text" name="deliveryAddress" placeholder="Delivery Address" 
                value={formData.deliveryAddress} onChange={handleChange} />
<br />
            <input type="text" name="image" placeholder="Image Link (optional)" 
                value={formData.image} onChange={handleChange} />
<br />
            <input type="number" name="weight" placeholder="Weight (kg)" 
                value={formData.weight} onChange={handleChange} />
<br />
            <button type="submit">Add</button>
        </form>
    );
}
