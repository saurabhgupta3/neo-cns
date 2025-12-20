import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react";

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
            <h3>Edit the order</h3>
            <form onSubmit={handleSubmit}>
                <input type="text" name="senderName" placeholder="Sender Name: " value={order.senderName} onChange={handleChange}/>
                <br />
                <input type="text" name="receiverName" placeholder="Receiver Name: " value={order.receiverName} onChange={handleChange}/>
                <br />
                <input type="text" name="pickupAddress" placeholder="Pickup Address: " value={order.pickupAddress} onChange={handleChange}/>
                <br />
                <input type="text" name="deliveryAddress" placeholder="Delivery Address: " value={order.deliveryAddress} onChange={handleChange}/>
                <br />
                <input type="text" name="image" placeholder="Image Link (optional): " value={order.image} onChange={handleChange}/>
                <br />
                <input type="number" name="weight" placeholder="Weight (kg): " value={order.weight} onChange={handleChange}/>
                <br />
                <button type="submit">Edit the order</button>
            </form>
        </>
    )
}