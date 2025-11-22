import { useEffect, useState } from "react";
import {Link} from 'react-router-dom';

export default function OrdersList() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/orders") 
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .catch((err) => console.error("Error fetching orders:", err));
  }, []);

  return (
    <div>
      <h2>All Orders</h2>
      <Link to="/orders/new"><button>Create New</button></Link>
      <ul>
        {orders.map((order) => (
          <li key={order._id}>
            <Link to={`/orders/${order._id}`}>{order.senderName} - {order.receiverName} ({order.status})</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
