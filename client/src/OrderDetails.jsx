import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";


export default function OrderDetails() {
    const {id} = useParams();
    const [order, setOrder] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`http://localhost:8080/orders/${id}`)
        .then(res => res.json())
        .then(data => setOrder(data))
        .catch(err => console.error("error fetching order: ", err));
    }, [id]);

    const handleDelete = () => {
        fetch(`http://localhost:8080/orders/${id}`, {
            method: "DELETE",
        }).then(res => {
            if(!res.ok) throw new Error();
            navigate("/orders");
        }).catch(err => console.error(err));
    }
    if(!order) return <p>Loading...</p>
    return (
        <div>
            <h2>Order details</h2>
            <p><strong>Sender:</strong> {order.senderName}</p>
            <p><strong>Receiver:</strong> {order.receiverName}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Pickup Address:</strong> {order.pickupAddress}</p>
            <p><strong>Delivery Address:</strong> {order.deliveryAddress}</p>
            <img src={order.image} alt="order image" onError={(e) => {
                e.target.onerror = null; 
                e.target.src = "https://res.cloudinary.com/dfq3xkwrk/image/upload/v1762187021/ChatGPT_Image_Nov_3_2025_09_51_44_PM_ausbho.png"; 
            }}/>
            <p><strong>Price:</strong> &#8377;{order.price.toLocaleString("en-IN")}</p>
            <Link to={`/orders/${id}/edit`}><button>edit this order</button></Link>
            <br /><br />
            <button onClick={handleDelete}>Delete this order</button>
        </div>
    )
}