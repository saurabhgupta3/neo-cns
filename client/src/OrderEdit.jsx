import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react";
import "./OrderEdit.css";

export default function OrderEdit() {
    const {id} = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    useEffect(() => {
        fetch(`http://localhost:8080/orders/${id}`)
        .then(res => res.json())
        .then(data => setOrder(data))
        .catch(err => console.error("Error fetching orders: ", err));
    }, [id]);
    const handleChange = (e) => {
        setOrder({ ...order, [e.target.name]: e.target.value });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();

        const res = await fetch(`http://localhost:8080/orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order)
        });

        const data = await res.json();
        console.log("Order edited:", data);
        navigate(`/orders/${id}`);
    };
    if(!order) return <p>Loading...</p>
    return (
        <>  
            <div className="row mt-3">
                <div className="col-8 offset-2">
                    <h3>Edit the order</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="senderName" className="form-label">Sender Name </label>
                            <input type="text" name="senderName" placeholder="Sender Name: " value={order.senderName} onChange={handleChange} className="form-control" id="senderName"/>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="receiverName" className="form-label">Receiver Name </label>
                            <input type="text" name="receiverName" placeholder="Receiver Name: " value={order.receiverName} onChange={handleChange} className="form-control" id="receiverName"/>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="pickupAddress" className="form-label">Pickup Address </label>
                            <input type="text" name="pickupAddress" placeholder="Pickup Address: " value={order.pickupAddress} onChange={handleChange} className="form-control" id="pickupAddress"/>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="deliveryAddress" className="form-label">Delivery Address </label>
                            <input type="text" name="deliveryAddress" placeholder="Delivery Address: " value={order.deliveryAddress} onChange={handleChange} className="form-control" id="deliveryAddress"/>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="image" className="form-label">Image</label>
                            <input type="text" name="image" placeholder="Image Link (optional): " value={order.image} onChange={handleChange} className="form-control" id="image"/>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="weight" className="form-label">Weight (kg) </label>
                            <input type="number" name="weight" placeholder="Weight (kg): " value={order.weight} onChange={handleChange} className="form-control" id="weight"/>
                        </div>
                        <button className="btn btn-dark edit-btn mt-3" type="submit">Edit the order</button>
                    </form>
                </div>
            </div>
        </>
    )
}