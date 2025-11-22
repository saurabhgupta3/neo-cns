import { useState } from "react"

export default function OrderNew() {

    const [formData, setFormData] = useState({
        senderName: "",
        receiverName: "",
        pickupAddress: "",
        deliveryAddress: "",
        image: "",
        weight: ""
    });

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch("http://localhost:8080/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
        });

        const data = await res.json();
        console.log("Order created:", data);
        alert("Order created successfully!");
    }
    
    
    return (
        <>
            <form onSubmit={handleSubmit}>
                <input type="text" name="senderName" placeholder="Sender Name: "  onChange={handleChange}/>
                <br />
                <input type="text" name="receiverName" placeholder="Receiver Name: " onChange={handleChange}/>
                <br />
                <input type="text" name="pickupAddress" placeholder="Pickup Address: " onChange={handleChange}/>
                <br />
                <input type="text" name="deliveryAddress" placeholder="Delivery Address: " onChange={handleChange}/>
                <br />
                <input type="text" name="image" placeholder="Image Link (optional): " onChange={handleChange}/>
                <br />
                <input type="number" name="weight" placeholder="Weight (kg): " onChange={handleChange}/>
                <br />
                <button type="submit">Add</button>
            </form>
        </>
    )
}