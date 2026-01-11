import { useEffect, useState } from "react";
import {Link} from 'react-router-dom';
import "./OrdersList.css";

export default function OrdersList() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/orders") 
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .catch((err) => console.error("Error fetching orders:", err));
  }, []);

  return (
    <div className="content">
      <h2>All Orders</h2>
      <div className="row row-cols-lg-3 row-cols-md-2 row-cols-sm-1">
        {orders.map((order) => (    
          <Link to={`/orders/${order._id}`} key={order._id} className="order-show-link">
            <div className="card col">
              <img src={order.image} alt="order image" className="card-img-top" style={{ height: "20rem" }} onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = "https://res.cloudinary.com/dfq3xkwrk/image/upload/v1762187021/ChatGPT_Image_Nov_3_2025_09_51_44_PM_ausbho.png"; 
              }}/>
              <div className="card-img-overlay"></div>
              <div className="card-body">
                <p className="card-text">
                  <b>{order.senderName} <span className="text-muted">→</span> {order.receiverName}</b>
                  <br />
                  &#8377;{order.price.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </Link> 
        ))}
      </div>
    </div>
  );
}
