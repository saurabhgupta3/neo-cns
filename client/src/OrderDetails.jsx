import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "./OrderDetails.css";


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
        <div className="row mt-3">
            <div className="col-8 offset-3">
                <h2>Order details</h2>
            </div>
            <div className="col-6 offset-3">
                <div className="card" style={{width: "18rem"}}>
                    <img className="show-img" src={order.image} alt="order image" onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = "https://res.cloudinary.com/dfq3xkwrk/image/upload/v1762187021/ChatGPT_Image_Nov_3_2025_09_51_44_PM_ausbho.png"; 
                    }}/>
                    <div className="card-body">
                        <p className="card-text">
                            <b>{order.senderName} <span className="text-muted">→</span> {order.receiverName}</b>
                            <br />
                            <strong>Status:</strong> {order.status}
                            <br />
                            <strong>Price:</strong> &#8377;{order.price.toLocaleString("en-IN")}
                            <br />
                            <strong>Pickup Address:</strong> {order.pickupAddress}
                            <br />
                            <strong>Delivery Address:</strong> {order.deliveryAddress}
                            <br />
                            <strong>Weight: </strong> {order.weight} <b>kg</b>
                        </p>
                    </div>
                </div>
            </div>

            <div className="btns">
                <Link to={`/orders/${id}/edit`}><button className="btn btn-dark col-1 offset-3 edit-btn">edit</button></Link>
                <button onClick={handleDelete} className="btn btn-dark col-0.5 offset-0.7">Delete</button>
            </div>
        </div>
    )
}